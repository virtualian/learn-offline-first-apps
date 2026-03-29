# Tutorial: Build a Notes App with Supabase

In this tutorial you will build a notes app that reads and writes directly to a cloud Postgres database using the Supabase JavaScript client. By the end you will have a single HTML file that creates, lists, and persists notes -- no server, no framework, no build step.

This is the **online-first** pattern: every operation requires a network connection. The browser talks to Supabase over REST, and there is no local storage. If the network drops, nothing works.

## What you will build

A single-page notes app that:

- Loads existing notes from Supabase on page load
- Inserts new notes into a Postgres table
- Displays notes sorted newest-first
- Runs entirely from a static HTML file served over HTTP

## Prerequisites

- A free [Supabase](https://supabase.com) account
- A browser with DevTools
- Python 3 (for a local HTTP server) or any static file server

## Step 1: Create a Supabase project

1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **New project**
3. Choose an organization, enter a project name, set a database password, and select a region
4. Wait for the project to finish provisioning (about 60 seconds)

## Step 2: Create the notes table

Open the **SQL Editor** in your Supabase project (sidebar > SQL Editor > New Query) and run:

```sql
CREATE TABLE notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable RLS for this learning demo (not for production)
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON notes FOR ALL USING (true) WITH CHECK (true);
```

This creates a `notes` table with three columns: a UUID `id` (auto-generated), a `content` text field, and a `created_at` timestamp that defaults to the current time.

The policy disables row-level security for the demo. In production, you would restrict access based on authenticated users.

## Step 3: Get your project credentials

1. In the Supabase Dashboard, go to **Settings > API**
2. Copy the **Project URL** -- it looks like `https://abcdefg.supabase.co`
3. Copy the **anon / public** key (the publishable key, safe to expose in browser code)

## Step 4: Create the HTML file

Create a new file called `online-first-demo.html`. Start with the page structure:

<!-- Source: online-first-demo.html:1-31 -->
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Supabase Notes Demo</title>
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
    li .meta { font-size: 0.75rem; color: #aaa; margin-top: 4px; }
    #status { font-size: 0.85rem; color: #888; margin-top: 16px; }
  </style>
</head>
<body>

  <h1>Supabase Notes Demo</h1>
  <p class="subtitle">Reads and writes go directly to Supabase. No server, no framework — just HTML + the Supabase JS client.</p>

  <div class="add-row">
    <input id="noteInput" type="text" placeholder="Write a note..." />
    <button onclick="addNote()">Add</button>
  </div>

  <ul id="notesList"></ul>
  <div id="status"></div>
```

## Step 5: Load the Supabase client from CDN

Add the Supabase JS client directly from a CDN. No npm install, no bundler required.

<!-- Source: online-first-demo.html:33-37 -->
```html
  <!--
    Load the Supabase JS client directly from CDN.
    No npm, no bundler required.
  -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
```

## Step 6: Configure the client

Open a `<script>` tag and create the Supabase client. Replace the placeholder values with the credentials you copied in Step 3.

<!-- Source: online-first-demo.html:39-50 -->
```html
  <script>
    // ─── Configuration ──────────────────────────────────────────────────────
    // These values are safe to expose in the browser for a demo.
    // The "publishable" key only allows operations permitted by your
    // Supabase table policies (or, like here, an open table with no RLS).
    const SUPABASE_URL  = 'https://your-project.supabase.co'
    const SUPABASE_KEY  = 'your-publishable-key-here'

    // ─── Client ─────────────────────────────────────────────────────────────
    // supabase.createClient() is the entry point.
    // It returns a client object we use for all reads and writes.
    const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
```

`supabase.createClient()` is the entry point for the Supabase JS library. It returns a client object that you use for all database operations. The URL tells it which project to connect to; the key authorizes the request.

## Step 7: Implement loadNotes()

This function fetches all notes from the `notes` table, sorted newest-first, and renders them to the page.

<!-- Source: online-first-demo.html:52-69 -->
```js
    // ─── Read ────────────────────────────────────────────────────────────────
    // Fetch all notes from the "notes" table, newest first.
    async function loadNotes() {
      setStatus('Loading...')

      const { data, error } = await db
        .from('notes')           // which table
        .select('*')             // which columns (* = all)
        .order('created_at', { ascending: false })

      if (error) {
        setStatus('Error loading notes: ' + error.message)
        return
      }

      renderNotes(data)
      setStatus(`${data.length} note${data.length !== 1 ? 's' : ''} loaded.`)
    }
```

The Supabase client translates `.from('notes').select('*').order(...)` into a REST API call: `GET /rest/v1/notes?select=*&order=created_at.desc`. The response comes back as a JSON array.

## Step 8: Implement addNote()

This function inserts a new row and then reloads the full list to show it.

<!-- Source: online-first-demo.html:71-91 -->
```js
    // ─── Write ───────────────────────────────────────────────────────────────
    // Insert a new row into the "notes" table.
    async function addNote() {
      const input = document.getElementById('noteInput')
      const content = input.value.trim()
      if (!content) return

      setStatus('Saving...')

      const { error } = await db
        .from('notes')
        .insert({ content })     // insert a row with just the content column

      if (error) {
        setStatus('Error saving note: ' + error.message)
        return
      }

      input.value = ''
      await loadNotes()          // reload the list to show the new note
    }
```

Notice the `await loadNotes()` call at the end. After every insert, the app makes a second network request to re-fetch the entire list. This is a characteristic of the online-first pattern: there is no local state, so the only way to see the new note is to ask the server again.

## Step 9: Add helpers and start

Add the rendering helpers, wire up the Enter key, and call `loadNotes()` on startup.

<!-- Source: online-first-demo.html:93-119 -->
```js
    // ─── Helpers ─────────────────────────────────────────────────────────────
    function renderNotes(notes) {
      const list = document.getElementById('notesList')
      list.innerHTML = notes.map(note => `
        <li>
          <div>${escapeHtml(note.content)}</div>
          <div class="meta">${new Date(note.created_at).toLocaleString()}</div>
        </li>
      `).join('')
    }

    function setStatus(msg) {
      document.getElementById('status').textContent = msg
    }

    function escapeHtml(str) {
      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    }

    // Also submit on Enter key
    document.getElementById('noteInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') addNote()
    })

    // ─── Start ───────────────────────────────────────────────────────────────
    loadNotes()
  </script>

</body>
</html>
```

## Step 10: Serve and test

The Supabase client is loaded via CDN, so the file must be served over HTTP (not opened as a `file://` URL). Start a local server from the project root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/online-first-demo.html` in your browser.

1. Type a note and click **Add** -- it appears in the list
2. Refresh the page -- the note is still there (persisted in Supabase)
3. Open DevTools > Network tab, add another note, and observe:
   - A `POST` to `/rest/v1/notes` (the insert)
   - A `GET` to `/rest/v1/notes` (the reload)
4. Check the Supabase Dashboard **Table Editor** to confirm rows exist

## What you built

You built an online-first notes app with these characteristics:

| Aspect | Behavior |
|---|---|
| Data storage | Cloud only (Supabase Postgres) |
| Read path | REST GET on every load |
| Write path | REST POST, then full reload |
| Offline behavior | Nothing works |
| Multi-client sync | Manual refresh required |
| Dependencies | Single CDN script tag |

The app is simple and functional, but it has two significant limitations:

1. **No live updates** -- if another tab or user adds a note, you won't see it until you refresh
2. **No offline support** -- disconnect from the network and the app is completely non-functional

The next tutorial addresses the first limitation by adding Supabase Realtime.

---

Next: [Tutorial 02 -- Add Realtime Sync to the Notes App](online-with-sync.md)
