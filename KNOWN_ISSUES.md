# Known Issues

> **Note:** Many issues in earlier releases (v1.0.0–v2.0.0) are deliberate simplifications to keep the implementation accessible for learning. They will be addressed progressively in later releases as complexity is layered in.

## v3.3.0

### Old release URLs contain previous repository name

Release tags v1.0.0–v3.2.1 were created under the `offline-first` repository name. URLs in those tagged versions (README, docs) still reference `virtualian/offline-first`. GitHub redirects these automatically, but the redirect breaks if a new repository named `offline-first` is ever created under the same account.

**Workaround:** None required — GitHub redirects work transparently. Avoid creating a new repo named `offline-first` under the `virtualian` account.

### Existing clones require remote URL update

Anyone who cloned the repository before the rename still has the old remote URL configured.

**Fix:** Run `git remote set-url origin git@github.com:virtualian/learn-offline-first-apps.git`

## v3.2.1

No new issues introduced. Documentation site responsive layout issue from v3.2.0 is resolved.

## v3.2.0

### ~~Documentation site not responsive to device display sizes~~ — resolved in v3.2.1

### v3.x demo is overly complicated

The PowerSync demo (`powersync-demo/`) includes deletion and sync status indicators. While these features demonstrate real-world patterns, they complicate both the implementation and the learning experience for someone following the progressive tutorial path.

**Plan:** Simplify the v3.x demo to focus on the core offline-first concept — local reads and writes that sync when connectivity returns. Deletion, status indicators, and other features will be progressively added in subsequent releases.

## v3.1.0

No new issues introduced. All v3.0.0 issues remain open.

## v3.0.0

- PowerSync demo requires Vite build step (WASM + web workers), adding complexity vs the plain HTML demos
- Conflict resolution not yet implemented — concurrent edits from different clients create duplicate rows rather than merging

## v2.0.0

- Supabase Realtime requires manual publication setup (`alter publication supabase_realtime add table`)
- No offline fallback — if the WebSocket disconnects, the UI does not indicate loss of sync

## v1.0.0

- No error handling for failed Supabase requests
- Credentials hardcoded in HTML files (suitable for learning, not production)
