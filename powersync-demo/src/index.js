import { PowerSyncDatabase, createBaseLogger } from '@powersync/web'
import { AppSchema } from './schema.js'
import { SupabaseConnector } from './connector.js'

// Enable SDK logging — outputs sync activity, connection status, and errors
// to the browser console. Open DevTools → Console to see it.
createBaseLogger().useDefaults()

// ─── Database Setup ─────────────────────────────────────────────────────────
let db

async function openDatabase() {
  db = new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename: 'notes.sqlite' }
  })

  await db.init()
  console.log('PowerSync database initialized')

  // Connect to PowerSync Cloud for sync
  const connector = new SupabaseConnector()
  db.connect(connector)

  // Watch for sync status changes (connected, uploading, downloading)
  db.registerListener({
    statusChanged: (status) => {
      updateSyncBadge(status)
    }
  })

  // Watch the notes query — emits initial results immediately, then re-emits
  // whenever the table changes (local write or sync from PowerSync Cloud)
  watchNotes()
}

// ─── Watch ───────────────────────────────────────────────────────────────────
async function watchNotes() {
  for await (const result of db.watch('SELECT * FROM notes ORDER BY created_at DESC')) {
    const notes = Array.isArray(result) ? result : (result.rows?._array ?? [])
    updateNotesList(notes)
  }
}

// ─── Write ───────────────────────────────────────────────────────────────────
async function addNote() {
  const input = document.getElementById('noteInput')
  const content = input.value.trim()
  if (!content) return

  await db.execute(
    'INSERT INTO notes(id, content, created_at) VALUES(uuid(), ?, datetime())',
    [content]
  )

  input.value = ''
}

// ─── Sync Badge ──────────────────────────────────────────────────────────────
function updateSyncBadge(status) {
  const badge = document.getElementById('sync-badge')
  badge.classList.remove('connected')

  if (status.connected) {
    badge.textContent = 'Synced'
    badge.classList.add('connected')
  } else if (status.connecting) {
    badge.textContent = 'Connecting…'
  } else {
    badge.textContent = 'Offline'
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function updateNotesList(notes) {
  renderNotes(notes)
  setStatus(`${notes.length} note${notes.length !== 1 ? 's' : ''} in local database.`)
}

function renderNotes(notes) {
  const list = document.getElementById('notesList')
  list.innerHTML = notes.map(note => `
    <li>
      <div>${escapeHtml(note.content)}</div>
      <div class="meta">${escapeHtml(note.created_at || 'just now')}</div>
    </li>
  `).join('')
}

function setStatus(msg) {
  document.getElementById('status').textContent = msg
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── Event Wiring ────────────────────────────────────────────────────────────
window.addNote = addNote

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('noteInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addNote()
  })

  openDatabase()
})
