# Supabase Configuration Reference

This document covers all Supabase-side configuration used across the three demo patterns.

---

## SQL Schema

The `notes` table is the only application table. All three demos operate on this table.

```sql
CREATE TABLE public.notes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Row Level Security is disabled in this demo.
-- In production, enable RLS and define policies:
-- ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
```

### Column Details

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | `uuid` | `gen_random_uuid()` | Primary key, auto-generated |
| `content` | `text` | (none, required) | The note body |
| `created_at` | `timestamptz` | `now()` | Timestamp with timezone, set on insert |

---

## Publishable Key vs Service Role Key

| Key | Exposed in browser? | What it grants |
|-----|---------------------|---------------|
| **Publishable key** (`anon` key) | Yes -- designed for client-side use | Only operations permitted by RLS policies. With RLS disabled, grants full read/write. |
| **Service role key** | Never -- server-side only | Bypasses RLS entirely. Full admin access to the database. |

The demo uses the publishable key: `sb_publishable_zV-S6l76J0i2t-449TyqeQ_zuOundna`. This key identifies the Supabase project but does not independently grant access -- RLS policies (when enabled) are the access control layer.

---

## REST API Endpoints

The Supabase JS client wraps these PostgREST HTTP endpoints:

### Read all notes

```
GET https://<project-ref>.supabase.co/rest/v1/notes?order=created_at.desc
```

Headers:
```
apikey: <publishable-key>
Authorization: Bearer <publishable-key>
```

Response: `200 OK` with JSON array of row objects.

### Insert a note

```
POST https://<project-ref>.supabase.co/rest/v1/notes
```

Headers:
```
apikey: <publishable-key>
Authorization: Bearer <publishable-key>
Content-Type: application/json
Prefer: return=minimal
```

Body:
```json
{ "content": "Note text here" }
```

Response: `201 Created`.

### Delete a note

```
DELETE https://<project-ref>.supabase.co/rest/v1/notes?id=eq.<uuid>
```

Headers:
```
apikey: <publishable-key>
Authorization: Bearer <publishable-key>
```

Response: `200 OK` or `204 No Content`.

---

## Realtime Publication Setup

Supabase Realtime requires the table to be in the `supabase_realtime` publication. This is a Postgres-level configuration, not a Supabase-specific one.

```sql
-- Add the notes table to the Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
```

Without this, the Realtime subscription connects and reports `SUBSCRIBED`, but no events are delivered. This is the most common configuration mistake.

### Realtime Channel Subscription API

```javascript
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

db.channel('notes-changes')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notes' },
    (payload) => {
      // payload.new = the inserted row (all columns)
    }
  )
  .on(
    'postgres_changes',
    { event: 'DELETE', schema: 'public', table: 'notes' },
    (payload) => {
      // payload.old = the deleted row (primary key only by default)
    }
  )
  .subscribe((status) => {
    // status: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'
  })
```

| Parameter | Value | Description |
|-----------|-------|-------------|
| Channel name | `'notes-changes'` | Arbitrary string identifying this subscription |
| Listener type | `'postgres_changes'` | Listens for database row changes (vs. `'presence'` or `'broadcast'`) |
| `event` | `'INSERT'`, `'UPDATE'`, `'DELETE'`, `'*'` | Which DML events to receive |
| `schema` | `'public'` | Postgres schema to monitor |
| `table` | `'notes'` | Table to monitor |

### Replica Identity

By default, DELETE events in `payload.old` only include primary key columns. To receive all columns:

```sql
ALTER TABLE public.notes REPLICA IDENTITY FULL;
```

---

## Replication Role Setup (for PowerSync)

PowerSync requires a dedicated Postgres role with `REPLICATION` privilege to read the WAL.

```sql
-- Create a dedicated role for PowerSync
CREATE ROLE powersync_role WITH REPLICATION LOGIN PASSWORD 'your-password-here';

-- Grant read access to existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;

-- Grant read access to future tables automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO powersync_role;

-- Create a publication for PowerSync (separate from supabase_realtime)
CREATE PUBLICATION powersync FOR TABLE public.notes;
```

| Statement | Purpose |
|-----------|---------|
| `CREATE ROLE ... WITH REPLICATION` | Allows the role to read the WAL stream |
| `LOGIN` | Allows the role to connect to the database |
| `GRANT SELECT` | Read-only access to table data (principle of least privilege) |
| `ALTER DEFAULT PRIVILEGES` | Automatically grants SELECT on any tables created in the future |
| `CREATE PUBLICATION powersync` | Filters WAL to only replicate the specified tables |

### Connection String

PowerSync connects using the **direct** connection string (not the pooled one). WAL replication requires a direct Postgres connection.

Find this in the Supabase Dashboard under **Settings > Database > Connection string > Direct**.

Replace the default username/password with `powersync_role` and the password set above.

---

## Dashboard Locations

| What you need | Where to find it |
|---------------|-----------------|
| Project URL | **Settings > API > Project URL** |
| Publishable (anon) key | **Settings > API > Project API keys > anon / public** |
| Service role key | **Settings > API > Project API keys > service_role** (never expose in client) |
| Direct connection string | **Settings > Database > Connection string > Direct** |
| Realtime publication config | **Database > Publications > supabase_realtime** |
| Realtime service settings | **Realtime > Settings** |
| Realtime event inspector | **Realtime > Inspector** |
| SQL Editor | **SQL Editor** (for running CREATE TABLE, CREATE ROLE, etc.) |
| Table data browser | **Table Editor > notes** |
