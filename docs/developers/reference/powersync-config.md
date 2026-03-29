# PowerSync Configuration Reference

This document covers all PowerSync-side configuration used in the offline-first demo (`powersync-demo/`).

---

## Client Schema (`schema.js`)

The client schema defines tables in the local SQLite database. It must mirror the columns synced from Supabase (via Sync Streams), but uses PowerSync's type system.

```javascript
import { column, Schema, Table } from '@powersync/web'

const notes = new Table({
  content: column.text,
  created_at: column.text
})

export const AppSchema = new Schema({ notes })
```

### Column Types

| PowerSync Type | SQLite Type | Use For |
|---------------|-------------|---------|
| `column.text` | `TEXT` | Strings, UUIDs, ISO 8601 timestamps, JSON |
| `column.integer` | `INTEGER` | Integers, booleans (0/1) |
| `column.real` | `REAL` | Floating-point numbers |

### Auto-Created `id` Column

PowerSync automatically creates a `uuid` column named `id` on every table. Do not declare it in the schema. It is readable and writable in SQL queries:

```javascript
await db.execute(
  'INSERT INTO notes(id, content, created_at) VALUES(uuid(), ?, ?)',
  [content, new Date().toISOString()]
)
```

The `uuid()` function is a PowerSync SQL extension that generates a new UUID.

---

## Connector API (`connector.js`)

The connector is a class with two methods that PowerSync calls automatically.

### `fetchCredentials()`

Called every few minutes to get connection credentials for PowerSync Cloud.

```javascript
async fetchCredentials() {
  return {
    endpoint: import.meta.env.VITE_POWERSYNC_URL,   // PowerSync instance URL
    token: import.meta.env.VITE_POWERSYNC_DEV_TOKEN  // Auth token (JWT)
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `endpoint` | `string` | PowerSync Cloud instance URL (e.g., `https://<instance-id>.powersync.journeyapps.com`) |
| `token` | `string` | JWT token for authentication. In production, fetch from Supabase Auth. In dev, use the dashboard dev token. |

### `uploadData(database)`

Called automatically whenever the SDK detects pending local writes in the upload queue.

```javascript
async uploadData(database) {
  const transaction = await database.getNextCrudTransaction()
  if (!transaction) return

  try {
    for (const op of transaction.crud) {
      const table = supabase.from(op.table)
      let result

      switch (op.op) {
        case UpdateType.PUT:
          result = await table.upsert({ ...op.opData, id: op.id })
          break
        case UpdateType.PATCH:
          result = await table.update(op.opData).eq('id', op.id)
          break
        case UpdateType.DELETE:
          result = await table.delete().eq('id', op.id)
          break
      }

      if (result.error) throw result.error
    }

    await transaction.complete()
  } catch (error) {
    if (typeof error.code === 'string' && /^(23|42|44)/.test(error.code)) {
      // Permanent failure (constraint violation, syntax error, check violation)
      // Discard transaction to avoid blocking the queue
      console.error('Fatal upload error, discarding transaction:', error)
      await transaction.complete()
    } else {
      // Transient failure -- throw so PowerSync retries automatically
      throw error
    }
  }
}
```

### CRUD Operation Types (`UpdateType`)

| UpdateType | Meaning | Supabase Equivalent |
|-----------|---------|-------------------|
| `PUT` | Insert or replace | `.upsert({ ...data, id })` |
| `PATCH` | Update specific fields | `.update(data).eq('id', id)` |
| `DELETE` | Remove row | `.delete().eq('id', id)` |

### Transaction Object

| Method/Property | Type | Description |
|----------------|------|-------------|
| `transaction.crud` | `CrudEntry[]` | Array of pending operations |
| `transaction.complete()` | `Promise<void>` | Marks transaction as processed, removes from upload queue |

### CrudEntry Fields

| Field | Type | Description |
|-------|------|-------------|
| `op.table` | `string` | Target table name |
| `op.op` | `UpdateType` | Operation type (PUT, PATCH, DELETE) |
| `op.id` | `string` | Row UUID |
| `op.opData` | `Record<string, any>` | Column values for the operation |

---

## Sync Streams (YAML)

Configured in the PowerSync Dashboard under **Sync Streams**. Defines which data to replicate to clients.

```yaml
config:
  edition: 3

streams:
  all_notes:
    auto_subscribe: true
    query: SELECT * FROM notes
```

| Field | Description |
|-------|-------------|
| `config.edition` | Sync Streams config format version |
| `streams.<name>` | Named stream definition |
| `auto_subscribe` | When `true`, all connected clients receive this stream automatically |
| `query` | SQL query defining which rows and columns to sync. Runs against the source Postgres database. |

### Validation

Click **Validate** in the PowerSync Dashboard to check the query against your connected database. Click **Deploy** to activate. Changes take effect immediately for connected clients.

---

## Environment Variables (`.env`)

The PowerSync demo uses Vite's `import.meta.env` for configuration. All variables must be prefixed with `VITE_` to be exposed to client code.

```
VITE_POWERSYNC_URL=https://<instance-id>.powersync.journeyapps.com
VITE_POWERSYNC_DEV_TOKEN=<jwt-token-from-dashboard>
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_KEY=<publishable-anon-key>
```

| Variable | Source | Used By |
|----------|--------|---------|
| `VITE_POWERSYNC_URL` | PowerSync Dashboard > Connect | `fetchCredentials()` in connector |
| `VITE_POWERSYNC_DEV_TOKEN` | PowerSync Dashboard > Dev Token | `fetchCredentials()` in connector |
| `VITE_SUPABASE_URL` | Supabase Dashboard > Settings > API | Supabase client in connector |
| `VITE_SUPABASE_KEY` | Supabase Dashboard > Settings > API > anon key | Supabase client in connector |

---

## Vite Configuration (`vite.config.js`)

```javascript
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  envDir: '..',
  optimizeDeps: {
    exclude: ['@powersync/web']
  },
  worker: {
    format: 'es'
  }
})
```

### PowerSync-Specific Settings

| Setting | Value | Why |
|---------|-------|-----|
| `optimizeDeps.exclude` | `['@powersync/web']` | Prevents Vite from pre-bundling PowerSync. Pre-bundling breaks packages with Web Workers and WASM -- worker entry points are stripped and WASM paths no longer resolve. |
| `worker.format` | `'es'` | Serves Web Worker scripts as ES modules. PowerSync's workers use `import`/`export` syntax internally and require this format. |

### Other Settings

| Setting | Value | Why |
|---------|-------|-----|
| `root` | `'src'` | `index.html` lives in `src/`, not the project root |
| `envDir` | `'..'` | `.env` file lives in the project root (one level up from `src/`) |
| `build.outDir` | `'../dist'` | Build output goes to `dist/` in the project root |

---

## PowerSync Database API

### Initialization

```javascript
import { PowerSyncDatabase } from '@powersync/web'
import { AppSchema } from './schema.js'

const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: 'notes.sqlite' }
})

await db.init()
```

| Option | Type | Description |
|--------|------|-------------|
| `schema` | `Schema` | Client-side schema defining local tables |
| `database.dbFilename` | `string` | SQLite database filename (stored in browser via IndexedDB-backed VFS) |

### `db.connect(connector)`

Starts bidirectional sync. The connector provides credentials (download path) and handles uploads.

```javascript
const connector = new SupabaseConnector()
db.connect(connector)
```

### `db.watch(sql)`

Returns an `AsyncIterable` that emits query results whenever the underlying table changes.

```javascript
for await (const result of db.watch('SELECT * FROM notes ORDER BY created_at DESC')) {
  // result contains the updated rows
  // Fires on: local writes, synced changes from PowerSync Cloud
}
```

### `db.execute(sql, params)`

Executes a SQL statement with optional parameter bindings.

```javascript
await db.execute(
  'INSERT INTO notes(id, content, created_at) VALUES(uuid(), ?, ?)',
  [content, new Date().toISOString()]
)

await db.execute('DELETE FROM notes WHERE id = ?', [noteId])
```

### `db.getAll(sql, params)`

Executes a SELECT query and returns all rows as an array.

```javascript
const pending = await db.getAll('SELECT data FROM ps_crud')
```

### `db.registerListener(callbacks)`

Registers callbacks for database status changes.

```javascript
db.registerListener({
  statusChanged: (status) => {
    // Called when sync status changes
  }
})
```

---

## SyncStatus Fields

The `status` object passed to `statusChanged` callbacks contains:

| Field | Type | Description |
|-------|------|-------------|
| `connected` | `boolean` | `true` when connected to PowerSync Cloud |
| `connecting` | `boolean` | `true` when a connection attempt is in progress |
| `uploading` | `boolean` | `true` when the upload queue is being processed |
| `downloading` | `boolean` | `true` when receiving data from PowerSync Cloud |
| `lastSyncedAt` | `Date \| null` | Timestamp of the last successful sync, or `null` if never synced |

### Upload Queue Inspection

The internal `ps_crud` table contains pending upload operations. Each row has a JSON `data` column:

```javascript
const pending = await db.getAll('SELECT data FROM ps_crud')
const pendingIds = pending.map(row => {
  const parsed = JSON.parse(row.data)
  return parsed.id  // The row ID awaiting upload
})
```

This is used in the demo to show per-note sync status ("Not sync'd" indicator on individual notes).

---

## Dependencies

From `package.json`:

| Package | Version | Purpose |
|---------|---------|---------|
| `@powersync/web` | `^1.37.0` | PowerSync Web SDK -- local SQLite, sync engine, reactive queries |
| `@journeyapps/wa-sqlite` | `^1.5.0` | SQLite compiled to WASM for in-browser execution |
| `@supabase/supabase-js` | `^2.100.1` | Supabase client for upload path (REST API calls in connector) |
| `vite` | `^7.0.0` | Dev server and build tool (dev dependency) |
