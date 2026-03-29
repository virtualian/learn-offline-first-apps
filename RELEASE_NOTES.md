# Release Notes

## v3.3.0 — Repository Rename

Released: 2026-03-29

- Renamed repository from `offline-first` to `learn-offline-first-apps`
- Updated all internal GitHub URLs, clone commands, and Docsify config
- Old URLs redirect automatically via GitHub

## v3.2.1 — Responsive Docs Site

Released: 2026-03-29

- Fixed docs site layout overflow at narrow viewport widths
- Header brand text truncates gracefully instead of forcing horizontal scroll
- Subtitle and role tabs hidden on mobile (≤768px) where sidebar provides equivalent navigation
- Header padding reduced on mobile for better space utilisation

## v3.2.0 — Improved Docs Site and Release Documentation

Released: 2026-03-29

- Documentation site header with title, home button, and role-based navigation tabs
- Collapsible sidebar sections with intro pages for each role and content type
- Landing page rewritten as a getting-started guide
- README restructured: clone and docs are now the first steps
- Added KNOWN_ISSUES.md and RELEASE_NOTES.md
- Added releases and discussions references to READMEs
- Fixed docsify-sidebar-collapse plugin registration and docsify-themeable nav positioning

## v3.1.0 — Diataxis Documentation Site

Released: 2026-03-29

- Restructured documentation into a Diataxis site with three audience roles (Developer, Maintainer, Contributor) and four content types (Tutorials, How-To, Reference, Explanation)
- Docsify-powered docs site with search, Mermaid diagrams, and syntax highlighting
- Tutorials walk through the full online-first to offline-first progression
- How-to guides for setting up each demo independently

## v3.0.0 — Offline-First with PowerSync

Released: 2026-03-29

- Offline-first demo using PowerSync for local-first sync with Supabase
- Local SQLite database via WASM with bidirectional cloud sync
- Notes persist offline and sync automatically when connectivity returns
- Sync status indicators show per-note sync state
- Vite build tooling for WASM and web worker support

## v2.0.0 — Online Sync with Supabase Realtime

Released: 2026-03-27

- Online sync demo using Supabase Realtime WebSocket channels
- Multiple browser tabs and windows see changes instantly
- Notes added or deleted in any instance appear or disappear across all connected clients

## v1.0.0 — Initial Online-First Example App

Released: 2026-03-27

- Plain HTML + Supabase JS app that reads and writes directly to Postgres
- No framework, no build step — single HTML file
- Demonstrates the simplest possible online-first architecture
