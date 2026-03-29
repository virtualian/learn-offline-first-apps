# How to Run All Demos

> Quick reference for starting each demo and the documentation site locally.

## Prerequisites

| Tool | Purpose | Minimum Version |
|:-----|:--------|:----------------|
| Python 3 | Serve static HTML demos and docs site | 3.x (ships with macOS) |
| Node.js | Build and run the PowerSync demo | 18+ |
| npm | Install PowerSync demo dependencies | Bundled with Node.js |

## Online-First Demo

Serves `online-first-demo.html` -- direct reads and writes to Supabase with no sync layer.

```bash
# From project root
python3 -m http.server 8081
```

Open: `http://localhost:8081/online-first-demo.html`

The demo loads the Supabase JS client from CDN and connects using the `SUPABASE_URL` and `SUPABASE_KEY` constants defined inline in the HTML file. No `.env` or build step required.

## Online Sync Demo

Serves `online-sync-demo.html` -- adds Supabase Realtime (WebSocket) so changes appear across tabs instantly.

```bash
# From project root (same server works for both online demos)
python3 -m http.server 8081
```

Open: `http://localhost:8081/online-sync-demo.html`

Open in two browser tabs to verify real-time sync. The "Live" badge in the header confirms the WebSocket subscription is active.

## PowerSync Demo

Runs `powersync-demo/` -- offline-first with local SQLite and bidirectional Supabase sync via PowerSync Cloud.

```bash
cd powersync-demo
npm install
npm run dev
```

Open: `http://localhost:5173`

This demo requires a `.env` file. Copy the example and fill in credentials:

```bash
cp .env.example .env
```

The `.env` file needs four `VITE_`-prefixed variables. See [Environment Variables](../../developers/reference/powersync-config.md#environment-variables-env) for the full list, sources, and usage details.

Vite serves the demo with hot module replacement. The build uses `vite.config.js` to exclude `@powersync/web` from dependency optimization (required for its WASM and web worker files).

## Documentation Site

Serves the Docsify site from the `docs/` directory.

```bash
# From project root
python3 -m http.server 8080 --directory docs
```

Open: `http://localhost:8080`

The site uses Docsify 4 loaded from CDN -- no build step. Navigation is driven by `docs/_sidebar.md`. Mermaid diagrams render client-side via the Mermaid 11 CDN script configured in `docs/index.html`.

## Running Everything at Once

Open three terminal sessions:

| Terminal | Command | URL |
|:---------|:--------|:----|
| 1 | `python3 -m http.server 8081` (from project root) | `http://localhost:8081/online-first-demo.html` and `http://localhost:8081/online-sync-demo.html` |
| 2 | `cd powersync-demo && npm run dev` | `http://localhost:5173` |
| 3 | `python3 -m http.server 8080 --directory docs` (from project root) | `http://localhost:8080` |

## Troubleshooting

**Port already in use:** Change the port number in the command (e.g., `python3 -m http.server 8082`). For the PowerSync demo, edit `vite.config.js` or pass `--port` to Vite: `npm run dev -- --port 5174`.

**PowerSync demo fails to start:** Verify `node_modules/` exists (`npm install`) and that `.env` contains all four variables from `.env.example`.

**Online demos show loading errors:** Check the browser console. The most common cause is an invalid or expired `SUPABASE_KEY` in the HTML file.
