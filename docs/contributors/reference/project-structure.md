# Project Structure Reference

## Directory Tree

```
offline-first/
  .agents/                    # Agent skill source files
    skills/                   # PowerSync and Supabase skills
  .claude/                    # Claude Code configuration
    marr/                     # MARR agent configuration framework
      standards/              # AI agent behavioral standards
      MARR-PROJECT-CLAUDE.md  # Project-level MARR entry point
      README.md               # MARR framework documentation
    skills/                   # Symlinks to .agents/skills/
    settings.json             # Claude Code plugin configuration
    settings.local.json       # Local Claude Code overrides (not shared)
  .prd/                       # Product configuration
    .diataxis.md              # Diataxis documentation config (roles, audiences)
  docs/                       # Docsify documentation site
    developers/               # Docs for developers building with these patterns (primary)
      tutorials/              # Step-by-step learning paths
      how-to/                 # Setup and implementation guides
      reference/              # API and configuration reference
      explanation/            # Conceptual deep-dives
    maintainers/              # Docs for project maintainers
      how-to/                 # Operational guides
      reference/              # Infrastructure and configuration
      explanation/            # Architecture decisions
    contributors/             # Docs for project contributors
      how-to/                 # Contributing workflow
      reference/              # Project structure
    _sidebar.md               # Docsify sidebar navigation
    index.html                # Docsify configuration and theme
    .nojekyll                 # Prevents GitHub Pages Jekyll processing
  powersync-demo/             # Offline-first demo app
    src/                      # Application source code
      index.html              # Demo page markup and styles
      index.js                # App logic: database, watch, write, sync status
      schema.js               # PowerSync local SQLite schema definition
      connector.js            # PowerSync-Supabase bridge (auth + upload)
    .env.example              # Template for required environment variables
    package.json              # npm dependencies and scripts
    package-lock.json         # Locked dependency versions
    vite.config.js            # Vite build configuration (WASM/worker handling)
    node_modules/             # Installed dependencies (gitignored)
  supabase/                   # Supabase CLI working directory
    .temp/                    # Temporary files (gitignored)
  Plans/                      # Planning documents (empty)
  online-first-demo.html      # Demo 1: direct Supabase read/write
  online-sync-demo.html       # Demo 2: Supabase Realtime WebSocket sync
  .mcp.json                   # MCP server configuration for Claude Code
  .gitignore                  # Git ignore rules
  CLAUDE.md                   # Claude Code project instructions entry point
  README.md                   # Repository overview and getting started
  LICENSE                     # MIT license
  skills-lock.json            # Agent skill version lock file
```

## Demo Architecture

Each demo targets a different point on the online-to-offline spectrum:

| Demo | Files | Data Path | Build Tool | Dependencies |
|:-----|:------|:----------|:-----------|:-------------|
| Online-First | `online-first-demo.html` | Browser --> Supabase REST API --> Postgres | None | Supabase JS (CDN) |
| Online Sync | `online-sync-demo.html` | Browser <--> Supabase REST + Realtime WebSocket --> Postgres | None | Supabase JS (CDN) |
| Offline-First | `powersync-demo/src/` (4 files) | Browser --> Local SQLite <--> PowerSync Cloud <--> Postgres | Vite | `@powersync/web`, `@journeyapps/wa-sqlite`, `@supabase/supabase-js`, `vite` |

### Online demos (single-file)

`online-first-demo.html` and `online-sync-demo.html` are self-contained. Each file includes:
- HTML markup and CSS styles
- Supabase JS client loaded from CDN (`<script>` tag)
- Inline JavaScript with configuration constants, CRUD functions, and DOM helpers

The Supabase URL and publishable key are hardcoded as constants at the top of each file's `<script>` block.

### PowerSync demo (multi-file)

The PowerSync demo splits responsibilities across four source files in `powersync-demo/src/`:

| File | Responsibility |
|:-----|:---------------|
| `index.html` | Page markup, CSS styles, `<script type="module">` entry point |
| `index.js` | App orchestration: database init, note CRUD, sync status display, reactive query watch |
| `schema.js` | Defines the local SQLite schema (`notes` table with `content` and `created_at` columns) |
| `connector.js` | Implements `SupabaseConnector` with `fetchCredentials()` for auth and `uploadData()` for writing local changes to Supabase |

Environment variables are read via `import.meta.env` (Vite convention) from the `.env` file in the `powersync-demo/` root.

## Documentation Structure

Documentation follows Diataxis content types organized by user role.

### Roles and content types

| Role | Tutorials | How-To | Reference | Explanation |
|:-----|:----------|:-------|:----------|:------------|
| Developer (primary) | Learning paths (online-first → sync → offline) | Setup and implementation guides | API and configuration reference | Conceptual deep-dives |
| Maintainer | -- | Operational guides | Infrastructure, configuration | Architecture decisions |
| Contributor | -- | Contributing workflow | Project structure | -- |

### Reading order

Within each content type, the sidebar (`_sidebar.md`) controls reading order. Developer docs follow a progression from online-first through realtime sync to offline-first.

### Navigation

`docs/_sidebar.md` defines the Docsify sidebar. Each role is a top-level entry with content types nested beneath. Entries link to the Markdown files using relative paths from the `docs/` root.

## Configuration Files

| File | Purpose |
|:-----|:--------|
| `.mcp.json` | Registers MCP servers for Claude Code. Currently configures `powersync-docs` (HTTP endpoint at `https://docs.powersync.com/mcp`) for PowerSync documentation search. |
| `.claude/settings.json` | Enables Claude Code plugins: `supabase@claude-plugins-official` (Supabase MCP integration) and `postgres-best-practices@supabase-agent-skills` (Postgres optimization). |
| `.claude/marr/MARR-PROJECT-CLAUDE.md` | Entry point for MARR agent configuration. References standards in `.claude/marr/standards/` that define rules for documentation, version control, testing, development workflow, and prompt writing. |
| `.prd/.diataxis.md` | Diataxis documentation configuration. Defines roles (developers, maintainers, contributors), content types per role, and documentation sources. |
| `CLAUDE.md` | Project-level Claude Code instructions. Points to the MARR configuration. |
| `.gitignore` | Ignores `.DS_Store`, `node_modules/`, `dist/`, `.env`, and `supabase/.temp/`. |
| `skills-lock.json` | Locks agent skill versions for reproducible behavior. |
| `powersync-demo/.env.example` | Template with four required environment variables: `VITE_POWERSYNC_URL`, `VITE_POWERSYNC_DEV_TOKEN`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`. |
| `powersync-demo/vite.config.js` | Vite build config. Sets `src/` as root, excludes `@powersync/web` from pre-bundling, configures ES worker format, reads `.env` from parent directory. |
