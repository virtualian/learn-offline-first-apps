import { UpdateType } from '@powersync/web'
import { createClient } from '@supabase/supabase-js'

// ─── Supabase Client ────────────────────────────────────────────────────────
// The Supabase client handles the write path: uploading local changes to the
// remote database. Reads come through PowerSync's sync, not through Supabase.
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
)

// ─── Connector ──────────────────────────────────────────────────────────────
// The connector bridges the PowerSync SDK with your backend. It has two jobs:
//
// 1. fetchCredentials — tells PowerSync where the sync server is and how to
//    authenticate. Called automatically every few minutes.
//
// 2. uploadData — sends locally-written rows to Supabase. Called automatically
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

      // All operations succeeded — mark the transaction as complete.
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
        // Transient error — throw so PowerSync retries automatically.
        throw error
      }
    }
  }
}
