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
