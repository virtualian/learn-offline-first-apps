# offline-first

A learning project exploring offline-first data access and synchronisation using Supabase and PowerSync. Built in small steps, starting from the simplest possible online-first baseline and progressively adding offline capabilities.

## Prerequisites

| Prerequisite | Purpose | Notes |
|---|---|---|
| **Python 3** | Serve the docs site locally | `python3 -m http.server` — ships with macOS |
| **Chrome** | Run the demo and browser tooling | Any recent version |
| **Supabase account** | Back the online-first demo | Free tier is sufficient; you need a project with a `notes` table (`id uuid`, `content text`, `created_at timestamptz`) |
| **Claude Code** | AI assistance, Supabase MCP integration | Install: `npm i -g @anthropic-ai/claude-code` |
| **Claude in Chrome extension** | Visual testing and browser automation via MCP | Optional; install from the Chrome Web Store |

The demo HTML file (`online-first-demo.html`) has a Supabase URL and anon key hardcoded at the top. Replace these with your own project's values before running.

### Claude Code AI Tools

This project is configured for the following Claude Code integrations. The `.mcp.json` and `.claude/settings.json` files are checked in — Claude Code picks them up automatically when you open the project.

| Tool | What it does | How to enable |
|---|---|---|
| **Supabase MCP** | Query logs, run advisors, execute SQL, manage your project, and search Supabase docs — all from Claude Code | Enable the `supabase` plugin in Claude Code settings |
| **Supabase Postgres Best Practices skill** | Postgres query and schema optimisation guidance | Enable the `postgres-best-practices` skill in Claude Code settings |
| **PowerSync Docs MCP** | Search PowerSync documentation from Claude Code | Configured in `.mcp.json` — loads automatically |
| **PowerSync skill** | Guided onboarding and best practices for PowerSync integration | Install via Claude Code skill manager |

---

## What's Here

| File | What it is |
|---|---|
| `online-first-demo.html` | A plain HTML page that reads and writes directly to Supabase — no framework, no build step |
| `docs/` | Explanation guides documenting the concepts behind each step |

## Docs

The `docs/` folder contains explanation guides written in Markdown. They are served as a browsable site using [Docsify](https://docsify.js.org/) — a runtime Markdown renderer that requires no build step.

To view the docs locally:

```bash
python3 -m http.server 8080 --directory docs
```

Then open `http://localhost:8080`.

Docs are organised by role then content type following the [Diátaxis](https://diataxis.fr/) framework. Diagrams use [Mermaid](https://mermaid.js.org/).

## Stack

- **Supabase** — cloud Postgres database and REST API
- **PowerSync** — offline sync layer (coming)
- **Supabase CLI** — local development and migrations
- **PowerSync CLI** — sync configuration and deployment
