# Tutorial: Add Realtime Sync to the Notes App

In this tutorial you will take the online-first notes app from Tutorial 01 and add live synchronization using Supabase Realtime. When any client -- this tab, another tab, another browser, another device -- inserts or deletes a note, every connected client sees the change instantly without refreshing.

This is the **online-with-sync** pattern: the app still requires a network connection for every write, but reads are pushed to all subscribers over a persistent WebSocket connection. No polling, no manual refresh.

## What you will build

An enhanced notes app that:

- Receives live INSERT and DELETE events over WebSocket
- Updates the UI instantly when changes arrive from any source
- Shows a "Live" badge when the WebSocket connection is active
- Animates newly arrived notes with a highlight effect

## Prerequisites

- Completed [Tutorial 01 -- Build a Notes App with Supabase](online-first.md)
- The `notes` table already exists in your Supabase project
- Your Supabase project credentials (URL and publishable key)

## Step 1: Enable Realtime publication

Supabase does not stream changes from all tables by default. You need to add the `notes` table to the `supabase_realtime` publication so that Postgres broadcasts row-level changes over the Write-Ahead Log (WAL).

Run this SQL in the Supabase SQL Editor:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
```

Alternatively, via the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db query "ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;" --linked
```

To verify it worked:

```sql
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

The `notes` table should appear in the results.

## Step 2: Create the sync demo file

Create a new file called `online-sync-demo.html`. The page structure is similar to the online-first demo, with two additions: a "Live" badge and a CSS animation for incoming notes.

<!-- Source: online-sync-demo.html:1-57 -->
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Supabase Realtime Online Sync Demo</title>
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
    li.new { animation: highlight 1.5s ease-out; }
    @keyframes highlight {
      0%   { background: #f0fdf4; border-color: #3ecf8e; }
      100% { background: transparent; border-color: #eee; }
    }
    li .meta { font-size: 0.75rem; color: #aaa; margin-top: 4px; }
    #status { font-size: 0.85rem; color: #888; margin-top: 16px; }
    #live-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 999px;
      margin-left: 8px;
      vertical-align: middle;
      background: #fee2e2;
      color: #b91c1c;
    }
    #live-badge.connected {
      background: #dcfce7;
      color: #15803d;
    }
  </style>
</head>
<body>

  <h1>
    Supabase Realtime Online Sync Demo
    <span id="live-badge">connecting...</span>
  </h1>
  <p class="subtitle">
    Any note added in any tab or browser window appears here instantly --
    no polling, no refresh. Powered by Supabase Realtime over WebSocket.
  </p>

  <div class="add-row">
    <input id="noteInput" type="text" placeholder="Write a note..." />
    <button onclick="addNote()">Add</button>
  </div>

  <ul id="notesList"></ul>
  <div id="status"></div>
```

Two things changed from Tutorial 01:

- The `<span id="live-badge">` in the header shows the WebSocket connection status
- The `li.new` CSS class with a `@keyframes highlight` animation draws attention to notes arriving via the subscription

## Step 3: Maintain an in-memory note list

In Tutorial 01, `loadNotes()` was called after every insert to re-fetch the full list. With Realtime, you maintain a local array and update it incrementally.

<!-- Source: online-sync-demo.html:65-75 -->
```html
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>

  <script>
    const SUPABASE_URL  = 'https://your-project.supabase.co'
    const SUPABASE_KEY  = 'your-publishable-key-here'

    const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

    // In-memory list -- maintained by the initial load and the realtime subscription.
    // We keep our own copy so we can prepend new notes without re-fetching.
    let notes = []
```

The `notes` array replaces the pattern of re-fetching from the server after every mutation.

## Step 4: Load notes once on startup

The `loadNotes()` function still fetches from Supabase, but it now populates the local `notes` array. After the initial load, you never call `loadNotes()` again -- the subscription keeps the list current.

<!-- Source: online-sync-demo.html:77-96 -->
```js
    // Fetch existing notes once on startup. After this, the subscription keeps
    // the list current -- we never call loadNotes() again.
    async function loadNotes() {
      setStatus('Loading...')

      const { data, error } = await db
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        setStatus('Error loading notes: ' + error.message)
        return
      }

      notes = data
      renderNotes(notes)
      setStatus(`${notes.length} note${notes.length !== 1 ? 's' : ''} loaded. Listening for changes...`)
    }
```

## Step 5: Remove the reload from addNote()

The insert function no longer calls `loadNotes()` afterward. The Realtime subscription will receive the INSERT event and update the UI instead.

<!-- Source: online-sync-demo.html:98-119 -->
```js
    // Insert a new row. We do NOT reload the list here -- the realtime
    // subscription will receive the INSERT event and update the UI instead.
    async function addNote() {
      const input = document.getElementById('noteInput')
      const content = input.value.trim()
      if (!content) return

      setStatus('Saving...')

      const { error } = await db
        .from('notes')
        .insert({ content })

      if (error) {
        setStatus('Error saving note: ' + error.message)
        return
      }

      input.value = ''
      // No loadNotes() call here -- the subscription handles the UI update.
    }
```

This is a key architectural change. In Tutorial 01, the flow was: insert --> re-fetch entire list --> render. Now the flow is: insert --> Supabase broadcasts change via WAL --> subscription receives it --> prepend to local array --> render.

## Step 6: Subscribe to changes

This is the core of the Realtime pattern. The `subscribeToNotes()` function opens a WebSocket channel and listens for `postgres_changes` events on the `notes` table.

<!-- Source: online-sync-demo.html:121-165 -->
```js
    // Subscribe to INSERT events on the notes table.
    //
    // When any client -- this tab, another tab, another browser, another device --
    // inserts a row, Supabase detects the change via Postgres WAL (Write-Ahead Log)
    // and pushes it to all subscribers over a persistent WebSocket connection.
    //
    // The payload contains the new row's data, so we can prepend it to our local
    // list without making another network request.
    function subscribeToNotes() {
      db.channel('notes-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notes' },
          (payload) => {
            // payload.new is the newly inserted row
            const newNote = payload.new
            notes.unshift(newNote)          // prepend to keep newest-first order
            renderNotes(notes, newNote.id)  // pass the new id to animate it
            setStatus(`${notes.length} note${notes.length !== 1 ? 's' : ''} -- last update just now`)
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'notes' },
          (payload) => {
            // payload.old contains the deleted row. With default replica identity,
            // only the primary key (id) is guaranteed to be present -- which is
            // all we need to remove it from our local list.
            notes = notes.filter(n => n.id !== payload.old.id)
            renderNotes(notes)
            setStatus(`${notes.length} note${notes.length !== 1 ? 's' : ''} -- last update just now`)
          }
        )
        .subscribe((status) => {
          const badge = document.getElementById('live-badge')
          if (status === 'SUBSCRIBED') {
            badge.textContent = 'Live'
            badge.classList.add('connected')
          } else {
            badge.textContent = status.toLowerCase()
            badge.classList.remove('connected')
          }
        })
    }
```

There are three parts to this subscription:

1. **INSERT handler** -- When a new row arrives, `payload.new` contains the full row data. The handler prepends it to the local array and re-renders, passing the new ID so the `renderNotes` function can apply the highlight animation.

2. **DELETE handler** -- When a row is deleted (from any source, including the Supabase Dashboard), `payload.old` contains at minimum the primary key. The handler filters it out of the local array.

3. **Status callback** -- The `.subscribe()` callback fires when the WebSocket connection state changes. When the status is `'SUBSCRIBED'`, the badge turns green and shows "Live".

## Step 7: Add helpers and wire up startup

The `renderNotes` function now accepts an optional `highlightId` parameter to animate newly arrived notes.

<!-- Source: online-sync-demo.html:167-196 -->
```js
    function renderNotes(notes, highlightId) {
      const list = document.getElementById('notesList')
      list.innerHTML = notes.map(note => `
        <li class="${note.id === highlightId ? 'new' : ''}">
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

    document.getElementById('noteInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') addNote()
    })

    // Load existing notes first, then open the realtime subscription.
    // Order matters: load before subscribe so we don't miss events that
    // arrive while the initial fetch is in flight.
    loadNotes()
    subscribeToNotes()
  </script>

</body>
</html>
```

Note the startup order: `loadNotes()` runs first, then `subscribeToNotes()`. This matters because if you subscribe first, events arriving during the initial fetch could be duplicated or missed.

## Step 8: Test with two tabs

1. Serve the file: `python3 -m http.server 8000`
2. Open `http://localhost:8000/online-sync-demo.html` in two browser tabs, side by side
3. Confirm both tabs show the green **Live** badge
4. In Tab A, type a note and click **Add**
5. The note appears in Tab B instantly with a green highlight animation
6. In Tab B, type a note and click **Add**
7. The note appears in Tab A instantly

To test delete sync:

1. Open the Supabase Dashboard > Table Editor > `notes` table
2. Delete a row
3. The row disappears from both browser tabs immediately

## What you built

You extended the online-first app with Realtime sync:

| Aspect | Tutorial 01 (Online-First) | Tutorial 02 (Online + Sync) |
|---|---|---|
| Data storage | Cloud only | Cloud only |
| Read path | REST GET on every load | REST GET once, then WebSocket |
| Write path | REST POST + full reload | REST POST (no reload) |
| Live updates | No | Yes, via WebSocket push |
| Offline behavior | Nothing works | Nothing works |

The app now has live multi-client sync, but it still has one major limitation: **no offline support**. Disconnect from the network and you cannot read or write anything. The notes list goes blank on refresh because there is no local copy of the data.

The next tutorial solves this by moving to an offline-first architecture with PowerSync and local SQLite.

---

Previous: [Tutorial 01 -- Build a Notes App with Supabase](online-first.md)
Next: [Tutorial 03 -- Make the Notes App Work Offline with PowerSync](offline-first.md)
