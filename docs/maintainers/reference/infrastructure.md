# Infrastructure Reference

## External Services

### Supabase

Supabase provides the cloud Postgres database, auto-generated REST API, and Realtime (WebSocket change streaming) used by all three demos.

| Capability | Used By |
|:-----------|:--------|
| REST API (PostgREST) | `online-first-demo.html`, `online-sync-demo.html` |
| Realtime (WebSocket via Postgres WAL) | `online-sync-demo.html` |
| Postgres database (cloud) | All demos -- source of truth for synced data |
| Publishable API key | All demos -- safe to expose in browser code |

**Dashboard:** [https://supabase.com/dashboard](https://supabase.com/dashboard)

Key dashboard locations:
- **Project Settings > API** -- project URL, `anon`/`public` key, `service_role` key
- **Table Editor** -- browse and edit the `notes` table directly
- **SQL Editor** -- run ad hoc queries (e.g., create/alter the `notes` table)
- **Database > Replication** -- verify `supabase_realtime` publication includes the `notes` table
- **Logs > Postgres** -- query-level logs for debugging

### PowerSync Cloud

PowerSync Cloud provides the sync service that sits between the local SQLite database in the browser and the Supabase Postgres database. It reads the Postgres WAL, computes per-client sync diffs, and delivers them over a persistent connection.

| Capability | Used By |
|:-----------|:--------|
| Sync service (WAL-based replication) | `powersync-demo/` |
| Development token auth | `powersync-demo/` (no Supabase Auth in this project) |
| Local SQLite via `@journeyapps/wa-sqlite` | `powersync-demo/` |

**Dashboard:** [https://powersync.journeyapps.com](https://powersync.journeyapps.com)

Key dashboard locations:
- **Instance overview** -- instance URL, connection status, connected clients
- **Sync Rules** -- defines which tables and columns sync to clients
- **Development tokens** -- generate tokens for local development without full auth
- **Diagnostics** -- sync lag, replication status, error logs

---

## Environment Variables

| Variable | Demo | Purpose | Where to Find |
|:---------|:-----|:--------|:--------------|
| `SUPABASE_URL` | `online-first-demo.html`, `online-sync-demo.html` | Supabase project URL | Supabase dashboard > Project Settings > API |
| `SUPABASE_KEY` | `online-first-demo.html`, `online-sync-demo.html` | Publishable anon key | Supabase dashboard > Project Settings > API |
| `VITE_SUPABASE_URL` | `powersync-demo/` | Supabase project URL (Vite-prefixed) | Supabase dashboard > Project Settings > API |
| `VITE_SUPABASE_KEY` | `powersync-demo/` | Publishable anon key (Vite-prefixed) | Supabase dashboard > Project Settings > API |
| `VITE_POWERSYNC_URL` | `powersync-demo/` | PowerSync Cloud instance URL | PowerSync dashboard > Instance |
| `VITE_POWERSYNC_DEV_TOKEN` | `powersync-demo/` | Development authentication token | PowerSync dashboard > Development tokens |

**Note:** The two online demos embed `SUPABASE_URL` and `SUPABASE_KEY` directly as JavaScript constants in the HTML files. The PowerSync demo reads its variables from `powersync-demo/.env` via Vite's `import.meta.env`.

The `.env` file is gitignored. A template is provided at `powersync-demo/.env.example`.

---

## Database Schema

All three demos operate on a single `notes` table (`id`, `content`, `created_at`). See [Supabase Configuration Reference](../../developers/reference/supabase-config.md#sql-schema) for the full CREATE TABLE statement and column details.

The Realtime publication must include this table for `online-sync-demo.html` to receive change events. See [Realtime Publication Setup](../../developers/reference/supabase-config.md#realtime-publication-setup) for the ALTER PUBLICATION SQL.

---

## MCP Configuration

The file `.mcp.json` at the project root configures MCP (Model Context Protocol) servers for Claude Code:

```json
{
  "mcpServers": {
    "powersync-docs": {
      "type": "http",
      "url": "https://docs.powersync.com/mcp"
    }
  }
}
```

This gives Claude Code access to PowerSync documentation search during development sessions.

Additional MCP integrations are enabled via Claude Code plugins (configured in `.claude/settings.json`):
- **Supabase MCP** -- query logs, run advisors, execute SQL, manage the project
- **Supabase Postgres Best Practices** -- schema and query optimization guidance

---

## Claude Code Settings

The file `.claude/settings.json` enables two plugins:

```json
{
  "enabledPlugins": {
    "postgres-best-practices@supabase-agent-skills": true,
    "supabase@claude-plugins-official": true
  }
}
```

These are checked into the repository so any maintainer using Claude Code gets the same tooling automatically.

The `.claude/skills/` directory contains symlinks to agent skills in `.agents/skills/`:
- `powersync` -- PowerSync onboarding and best practices
- `supabase-postgres-best-practices` -- Postgres optimization guidance

---

## MARR Standards

The `.claude/marr/standards/` directory contains five standards that govern AI agent behavior on this project:

| Standard | Governs |
|:---------|:--------|
| `prj-documentation-standard.md` | Documentation organization, Diataxis structure, Mermaid diagrams |
| `prj-development-workflow-standard.md` | Issue tracking, branching, release process |
| `prj-version-control-standard.md` | Branch naming, commit messages, PR workflow |
| `prj-testing-standard.md` | Test coverage, testing strategy |
| `prj-writing-prompts-standard.md` | Prompt and standard file authoring |
