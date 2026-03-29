# offline-first

A learning project exploring offline-first data access and synchronisation using Supabase and PowerSync. Built in small steps, starting from the simplest possible online-first baseline and progressively adding offline capabilities.

## What's Here

| File | What it is |
|---|---|
| `online-first-demo.html` | Reads and writes directly to Supabase — no framework, no build step |
| `online-sync-demo.html` | Adds Supabase Realtime — multiple tabs/browsers see changes instantly via WebSocket |
| `powersync-demo/` | Offline-first demo using PowerSync — local SQLite with bidirectional Supabase sync |
| `docs/` | Explanation guides documenting the concepts behind each step |

---

## Getting Started

### 1. Create the Supabase table

In your Supabase project, open the SQL Editor and run:

```sql
create table notes (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  created_at timestamptz default now()
);
```

### 2. Enable Realtime for the table

Add the `notes` table to the Supabase Realtime publication (required for `online-sync-demo.html`):

```bash
supabase link --project-ref <your-project-ref>
supabase db query "alter publication supabase_realtime add table public.notes;" --linked
```

### 3. Configure the demos

Open `online-first-demo.html` and `online-sync-demo.html` and replace the two constants at the top of each script:

```js
const SUPABASE_URL = 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = 'your-anon-key'
```

Your project URL and anon key are in your Supabase dashboard under **Project Settings → API**.

### 4. Run the online demos

```bash
python3 -m http.server 8081
```

- `http://localhost:8081/online-first-demo.html` — basic read/write
- `http://localhost:8081/online-sync-demo.html` — open in two tabs to see live sync

### 5. Run the PowerSync demo

```bash
cd powersync-demo
cp .env.example .env   # fill in your PowerSync and Supabase credentials
npm install
npm run dev
```

Open `http://localhost:5173` — add notes and watch the sync badge.

**Testing offline:** Turn off Wi-Fi, add a note — it saves locally and shows "Not sync'd" in red. Turn Wi-Fi back on and watch it sync automatically.

**Testing multi-client sync:** Open a second browser window (or use the [PowerSync Diagnostics App](https://diagnostics-app.powersync.com)) to see changes appear across clients. Each browser instance has its own local SQLite — PowerSync keeps them in sync via the cloud.

**Note on conflicts:** Each note gets a unique UUID, so two clients adding the same text creates two separate rows — not a conflict. This demo only supports insert and delete. Row updates and conflict reconciliation will be covered in the next version.

### 6. Run the docs

```bash
python3 -m http.server 8080 --directory docs
```

Open `http://localhost:8080`.

---

## Prerequisites

| Prerequisite | Purpose | Notes |
|---|---|---|
| **Python 3** | Serve the demo and docs locally | Ships with macOS |
| **Chrome** | Run the demo and browser tooling | Any recent version |
| **Supabase account** | Back the online-first demo | Free tier is sufficient |
| **Claude Code** | AI assistance, Supabase MCP integration | Install: `npm i -g @anthropic-ai/claude-code` |
| **Claude in Chrome extension** | Visual testing and browser automation via MCP | Optional; install from the Chrome Web Store |

### Claude Code AI Tools

The `.mcp.json` and `.claude/settings.json` files are checked in — Claude Code picks them up automatically when you open the project.

| Tool | What it does | How to enable |
|---|---|---|
| **Supabase MCP** | Query logs, run advisors, execute SQL, manage your project, and search Supabase docs — all from Claude Code | Enable the `supabase` plugin in Claude Code settings |
| **Supabase Postgres Best Practices skill** | Postgres query and schema optimisation guidance | Enable the `postgres-best-practices` skill in Claude Code settings |
| **PowerSync Docs MCP** | Search PowerSync documentation from Claude Code | Configured in `.mcp.json` — loads automatically |
| **PowerSync skill** | Guided onboarding and best practices for PowerSync integration | Install via Claude Code skill manager |

---

## Stack

- **Supabase** — cloud Postgres database, REST API, and Realtime (WebSocket change streaming)
- **PowerSync** — offline-first sync layer with local SQLite and bidirectional Supabase sync
- **Vite** — build tool for the PowerSync demo (required for WASM + web workers)
