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
      onStatusChanged(status)
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
    'INSERT INTO notes(id, content, created_at) VALUES(uuid(), ?, ?)',
    [content, new Date().toISOString()]
  )

  input.value = ''
}

async function deleteNote(id) {
  await db.execute('DELETE FROM notes WHERE id = ?', [id])
}

// ─── Sync Status ─────────────────────────────────────────────────────────────
let stateChangedAt = Date.now()
let lastSyncAt = null
let statusTimerInterval = null

function onStatusChanged(status) {
  stateChangedAt = Date.now()

  if (status.lastSyncedAt) {
    lastSyncAt = status.lastSyncedAt
  }

  updateStatusDisplay(status.connected)

  // Start a 1s timer to keep the elapsed duration ticking
  if (!statusTimerInterval) {
    statusTimerInterval = setInterval(async () => {
      const connected = document.getElementById('sync-badge').classList.contains('connected')
      updateStatusDisplay(connected)
      if (currentNotes.length > 0) {
        await refreshPendingIds()
        renderNotes()
      }
    }, 1000)
  }
}

function updateStatusDisplay(connected) {
  const badge = document.getElementById('sync-badge')
  const elapsed = formatDuration(Date.now() - stateChangedAt)

  badge.classList.remove('connected')

  if (connected) {
    badge.textContent = `Online ${elapsed}`
    badge.classList.add('connected')
  } else {
    badge.textContent = `Offline ${elapsed}`
  }

  const lastSyncEl = document.getElementById('last-sync')
  if (connected && lastSyncAt) {
    lastSyncEl.textContent = `Last sync'd +${formatDuration(Date.now() - lastSyncAt.getTime())}`
    lastSyncEl.className = 'sync-ok'
  } else {
    const since = lastSyncAt ? Date.now() - lastSyncAt.getTime() : Date.now() - stateChangedAt
    lastSyncEl.textContent = `Not sync'd -${formatDuration(since)}`
    lastSyncEl.className = 'sync-pending'
  }
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
let currentNotes = []
let pendingIds = new Set()

async function updateNotesList(notes) {
  currentNotes = notes
  await refreshPendingIds()
  renderNotes()
  setStatus(`${notes.length} note${notes.length !== 1 ? 's' : ''} in local database.`)
}

async function refreshPendingIds() {
  // ps_crud is PowerSync's internal upload queue table.
  // Each row has a JSON `data` column containing the operation details including the row id.
  const pending = await db.getAll('SELECT data FROM ps_crud')
  pendingIds = new Set(pending.map(row => {
    const parsed = JSON.parse(row.data)
    return parsed.id
  }))
}

function renderNotes() {
  const list = document.getElementById('notesList')
  const now = Date.now()
  list.innerHTML = currentNotes.map(note => {
    const isPending = pendingIds.has(note.id)
    const syncMeta = isPending
      ? `<span class="sync-pending">Not sync'd -${formatDuration(now - new Date(note.created_at).getTime())}</span>`
      : ''
    return `
    <li>
      <div class="note-row">
        <span>${escapeHtml(note.content)}</span>
        <button class="delete-btn" onclick="deleteNote('${note.id}')">×</button>
      </div>
      <div class="meta">
        ${formatTimestamp(note.created_at)}
        ${syncMeta}
      </div>
    </li>`
  }).join('')
}

function setStatus(msg) {
  document.getElementById('status').textContent = msg
}

function formatTimestamp(ts) {
  if (!ts) return 'just now'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return escapeHtml(ts)
  const pad = (n, len = 2) => String(n).padStart(len, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0').slice(0, 2)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}`
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── Event Wiring ────────────────────────────────────────────────────────────
window.addNote = addNote
window.deleteNote = deleteNote

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('noteInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addNote()
  })

  openDatabase()
})
