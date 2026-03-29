# Tutorial: Make the Notes App Work Offline with PowerSync

In this tutorial you will rebuild the notes app so that all reads and writes go to a local SQLite database in the browser. PowerSync syncs that local database with Supabase Postgres in the background. The result is an app that works identically whether you are online or offline.

This is the **offline-first** pattern: the local database is the source of truth for the UI. The network is used for sync, not for reads or writes. If the connection drops, the app keeps working. When the connection returns, queued changes sync automatically.

## What you will build

A notes app that:

- Reads from and writes to a local SQLite database (via WASM in the browser)
- Syncs changes bidirectionally with Supabase Postgres through PowerSync Cloud
- Works fully offline -- adding, viewing, and deleting notes without a network connection
- Shows sync status (Online/Offline) and tracks pending unsynced changes
- Uses `db.watch()` for reactive UI updates from any source (local writes or remote sync)

## Prerequisites

- Completed [Tutorial 01](online-first.md) and [Tutorial 02](online-with-sync.md) conceptually
- A Supabase project with the `notes` table
- A [PowerSync Cloud](https://www.powersync.com) account (free tier available)
- Node.js and npm installed
- PowerSync Cloud instance connected to your Supabase database (see [How-To: Set Up the PowerSync Demo](../how-to/setup-offline-first.md) for the full setup steps)

## Why Vite?

The previous tutorials used a single HTML file with a CDN script tag. The offline-first demo cannot do that because:

- **PowerSync uses WASM** -- The `@powersync/web` SDK runs SQLite via WebAssembly, which requires proper MIME types and cannot be loaded from a `file://` URL
- **Web Workers** -- PowerSync runs sync operations in a Web Worker, which needs ES module support
- **ES modules** -- The SDK uses `import`/`export` syntax, which CDN UMD bundles do not support

Vite provides a development server that handles all of this with zero configuration beyond a small config file.

## Step 1: Create the project

```bash
mkdir powersync-demo
cd powersync-demo
npm init -y
```

Install the dependencies:

<!-- Source: powersync-demo/package.json:11-18 -->
```bash
npm install @powersync/web @supabase/supabase-js @journeyapps/wa-sqlite
npm install -D vite
```

The three runtime dependencies are:

| Package | Purpose |
|---|---|
| `@powersync/web` | PowerSync SDK for browser -- local SQLite, sync engine, reactive queries |
| `@supabase/supabase-js` | Supabase client -- used only for the write path (uploading local changes) |
| `@journeyapps/wa-sqlite` | SQLite compiled to WebAssembly -- the local database engine |

Update your `package.json` scripts and set the module type:

<!-- Source: powersync-demo/package.json:1-10 -->
```json
{
  "name": "powersync-demo",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

## Step 2: Configure Vite

Create `vite.config.js` in the project root. The key settings are `optimizeDeps.exclude` (so Vite does not try to pre-bundle the WASM/Worker files) and `worker.format` (ES module workers).

<!-- Source: powersync-demo/vite.config.js:1-18 -->
```js
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  envDir: '..',
  optimizeDeps: {
    // Don't optimize these packages as they contain web workers and WASM files.
    // https://github.com/vitejs/vite/issues/11672#issuecomment-1415820673
    exclude: ['@powersync/web']
  },
  worker: {
    format: 'es'
  }
})
```

The `root: 'src'` setting tells Vite to look for `index.html` inside the `src/` directory. The `envDir: '..'` setting tells it to find `.env` files in the project root.

## Step 3: Define the local schema

Create `src/schema.js`. This defines the local SQLite table structure that mirrors the Supabase `notes` table.

<!-- Source: powersync-demo/src/schema.js:1-14 -->
```js
import { column, Schema, Table } from '@powersync/web'

// Define the local SQLite schema that mirrors the Supabase "notes" table.
//
// PowerSync automatically creates an "id" column (UUID) on every table,
// so we only declare the application-specific columns here.
//
// Column types available: column.text, column.integer, column.real
const notes = new Table({
  content: column.text,
  created_at: column.text
})

export const AppSchema = new Schema({ notes })
```

Two important details:

1. **No `id` column** -- PowerSync adds a UUID `id` column automatically to every table. You do not declare it in the schema.
2. **`created_at` is `column.text`** -- SQLite does not have a native timestamp type. The ISO 8601 string is stored as text and sorts correctly because of its lexicographic ordering.

## Step 4: Write the connector

Create `src/connector.js`. The connector bridges the PowerSync SDK with your backend. It has two jobs:

1. **`fetchCredentials`** -- Tells PowerSync where the sync server is and how to authenticate
2. **`uploadData`** -- Sends locally-written rows to Supabase when the SDK detects pending writes

<!-- Source: powersync-demo/src/connector.js:1-74 -->
```js
import { UpdateType } from '@powersync/web'
import { createClient } from '@supabase/supabase-js'

// The Supabase client handles the write path: uploading local changes to the
// remote database. Reads come through PowerSync's sync, not through Supabase.
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)

// The connector bridges the PowerSync SDK with your backend. It has two jobs:
//
// 1. fetchCredentials -- tells PowerSync where the sync server is and how to
//    authenticate. Called automatically every few minutes.
//
// 2. uploadData -- sends locally-written rows to Supabase. Called automatically
//    whenever the SDK detects pending local writes in the upload queue.
export class SupabaseConnector {
  async fetchCredentials() {
    // In a real app, this would call Supabase Auth to get a fresh JWT.
    // For our demo, we use a development token from the .env file.
    return {
      endpoint: import.meta.env.VITE_POWERSYNC_URL,
      token: import.meta.env.VITE_POWERSYNC_DEV_TOKEN
    }
  }

  async uploadData(database) {
    const transaction = await database.getNextCrudTransaction()
    if (!transaction) return

    try {
      for (const op of transaction.crud) {
        const table = supabase.from(op.table)
        let result

        switch (op.op) {
          case UpdateType.PUT:
            // PUT = insert or replace. Spread the data and include the id.
            result = await table.upsert({ ...op.opData, id: op.id })
            break
          case UpdateType.PATCH:
            // PATCH = update specific fields on an existing row.
            result = await table.update(op.opData).eq('id', op.id)
            break
          case UpdateType.DELETE:
            result = await table.delete().eq('id', op.id)
            break
        }

        if (result.error) {
          throw result.error
        }
      }

      // All operations succeeded -- mark the transaction as complete.
      // This removes the entries from the local upload queue.
      await transaction.complete()
    } catch (error) {
      // If the error is a permanent failure (e.g. constraint violation),
      // discard the transaction so it doesn't block the queue forever.
      // Postgres error classes: 23=integrity constraint, 42=syntax/access, 44=with check
      if (typeof error.code === 'string' && /^(23|42|44)/.test(error.code)) {
        console.error('Fatal upload error, discarding transaction:', error)
        await transaction.complete()
      } else {
        // Transient error -- throw so PowerSync retries automatically.
        throw error
      }
    }
  }
}
```

The `uploadData` method processes a transaction from the local upload queue. Each operation in the transaction has an `op` type (`PUT`, `PATCH`, or `DELETE`) and the corresponding data. The method translates each operation into the equivalent Supabase REST call.

Error handling distinguishes between permanent failures (constraint violations, which are discarded) and transient failures (network errors, which are retried automatically by PowerSync).

## Step 5: Write the main application

Create `src/index.js`. This is the main entry point that initializes the database, watches for changes, and handles user interactions.

<!-- Source: powersync-demo/src/index.js:1-57 -->
```js
import { PowerSyncDatabase, createBaseLogger } from '@powersync/web'
import { AppSchema } from './schema.js'
import { SupabaseConnector } from './connector.js'

// Enable SDK logging -- outputs sync activity, connection status, and errors
// to the browser console. Open DevTools > Console to see it.
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

  // Watch the notes query -- emits initial results immediately, then re-emits
  // whenever the table changes (local write or sync from PowerSync Cloud)
  watchNotes()
}
```

The `PowerSyncDatabase` constructor takes the schema and a filename for the local SQLite database. After `db.init()`, the database is ready for local reads and writes. The `db.connect(connector)` call starts the sync engine, which runs in the background.

### Reactive query with db.watch()

<!-- Source: powersync-demo/src/index.js:38-43 -->
```js
async function watchNotes() {
  for await (const result of db.watch('SELECT * FROM notes ORDER BY created_at DESC')) {
    const notes = Array.isArray(result) ? result : (result.rows?._array ?? [])
    updateNotesList(notes)
  }
}
```

`db.watch()` returns an async iterable. It emits the current result set immediately, then re-emits whenever the underlying table changes -- whether from a local write or a sync from PowerSync Cloud. This replaces both the `loadNotes()` polling pattern from Tutorial 01 and the WebSocket subscription from Tutorial 02 with a single, unified mechanism.

### Writing to the local database

<!-- Source: powersync-demo/src/index.js:45-62 -->
```js
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
```

Writes go directly to the local SQLite database using standard SQL. The `uuid()` function is provided by PowerSync to generate UUIDs client-side. There is no network call here -- the write is instant regardless of connectivity.

PowerSync's sync engine picks up these local writes from the internal upload queue (`ps_crud` table) and sends them to Supabase via the connector's `uploadData` method when the network is available.

## Step 6: Create the HTML entry point

Create `src/index.html`. The structure is similar to the previous tutorials, with additions for sync status and per-note sync indicators.

<!-- Source: powersync-demo/src/index.html:1-66 -->
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PowerSync Offline-First Notes Demo</title>
  <style>
    body { font-family: sans-serif; max-width: 600px; margin: 60px auto; padding: 0 20px; }
    h1 { font-size: 1.4rem; margin-bottom: 4px; }
    p.subtitle { color: #666; font-size: 0.9rem; margin-top: 0; margin-bottom: 24px; }
    .add-row { display: flex; gap: 8px; margin-bottom: 24px; }
    input { flex: 1; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 1rem; }
    button { padding: 8px 16px; background: #3ecf8e; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 1rem; }
    button:hover { background: #2db87a; }
    ul { list-style: none; padding: 0; margin: 0; }
    li { padding: 10px 14px; border: 1px solid #eee; border-radius: 6px; margin-bottom: 8px; }
    .note-row { display: flex; justify-content: space-between; align-items: center; }
    .delete-btn { padding: 2px 8px; background: transparent; color: #ccc; font-size: 1.1rem; border: none; cursor: pointer; }
    .delete-btn:hover { color: #e11d48; background: transparent; }
    li .meta { font-size: 0.75rem; color: #aaa; margin-top: 4px; display: flex; justify-content: space-between; }
    .sync-ok { color: #15803d; }
    .sync-pending { color: #b91c1c; }
    #sync-info { font-size: 0.8rem; color: #888; margin-bottom: 8px; display: flex; justify-content: space-between; }
    .sync-badge {
      display: inline-block; font-size: 0.75rem; font-weight: 600;
      padding: 2px 8px; border-radius: 999px; margin-left: 8px;
      vertical-align: middle; background: #fee2e2; color: #b91c1c;
    }
    .sync-badge.connected { background: #dcfce7; color: #15803d; }
  </style>
  <script type="module" src="./index.js"></script>
</head>
<body>

  <h1>
    PowerSync Offline-First Notes
    <span id="sync-badge" class="sync-badge">Connecting...</span>
  </h1>
  <p class="subtitle">
    Reads and writes go to a local SQLite database.
    PowerSync syncs changes with Supabase in the background.
    Works offline -- try disconnecting your network.
  </p>

  <div id="sync-info">
    <span id="status"></span>
    <span id="last-sync">Never synced</span>
  </div>

  <div class="add-row">
    <input id="noteInput" type="text" placeholder="Write a note..." />
    <button onclick="addNote()">Add</button>
  </div>

  <ul id="notesList"></ul>

</body>
</html>
```

Note `<script type="module" src="./index.js"></script>` in the head -- this loads the application as an ES module, which Vite serves with proper WASM and Worker support.

## Step 7: Configure environment variables

Create a `.env` file in the project root (not inside `src/`):

<!-- Source: powersync-demo/.env.example:1-4 -->
```
VITE_POWERSYNC_URL=https://your-instance.powersync.journeyapps.com
VITE_POWERSYNC_DEV_TOKEN=your-development-token
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-publishable-key
```

The `VITE_` prefix is required -- Vite only exposes environment variables with this prefix to client-side code via `import.meta.env`.

Get your PowerSync instance URL and development token from the PowerSync Dashboard (see [How-To: Set Up the PowerSync Demo](../how-to/setup-offline-first.md) for detailed instructions).

## Step 8: Run and test

```bash
npm install
npm run dev
```

Vite starts a development server (typically at `http://localhost:5173`).

### Test basic functionality

1. Open the app in your browser
2. Add a note -- it appears instantly
3. The sync badge shows "Online" when connected to PowerSync Cloud
4. Check the Supabase Dashboard Table Editor -- the note appears there too

### Test offline mode

1. Open DevTools and go to the Network tab
2. Set the throttling to "Offline" (or turn off Wi-Fi)
3. The sync badge changes to "Offline"
4. Add a note -- it still appears instantly (written to local SQLite)
5. The note shows a "Not sync'd" indicator in red
6. Re-enable the network
7. The note syncs to Supabase and the pending indicator disappears

### Test multi-client sync

1. Open the app in two browser windows
2. Add a note in Window A
3. The note appears in Window B within a few seconds (after syncing through PowerSync Cloud to Supabase and back)

## What you built

You built an offline-first notes app. Here is how the three tutorials compare:

| Aspect | Tutorial 01 | Tutorial 02 | Tutorial 03 |
|---|---|---|---|
| **Pattern** | Online-first | Online + sync | Offline-first |
| **Data storage** | Cloud only | Cloud only | Local SQLite + cloud sync |
| **Read path** | REST GET every time | REST GET once + WebSocket | Local SQL query (db.watch) |
| **Write path** | REST POST + reload | REST POST (no reload) | Local SQL INSERT (instant) |
| **Live updates** | No | WebSocket push | db.watch() reactive query |
| **Offline reads** | Fails | Fails | Works (local database) |
| **Offline writes** | Fails | Fails | Works (queued for sync) |
| **Build tooling** | None (CDN) | None (CDN) | Vite (WASM + Workers) |
| **Sync mechanism** | None | Supabase Realtime (WAL) | PowerSync (WAL replication) |

The offline-first architecture fundamentally changes where the source of truth lives. Instead of the cloud database being the only copy, the local SQLite database is the primary store for the UI. The cloud database is synchronized in the background, making network availability a feature rather than a requirement.

---

Previous: [Tutorial 02 -- Add Realtime Sync to the Notes App](online-with-sync.md)
