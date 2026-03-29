# How to Contribute

## Fork and Clone

1. Fork the repository at [github.com/virtualian/offline-first](https://github.com/virtualian/offline-first).
2. Clone your fork locally:

```bash
git clone https://github.com/<your-username>/offline-first.git
cd offline-first
```

## Branch Naming

Create branches from `main` with descriptive names. Examples:

```bash
git checkout -b feat/add-update-support
git checkout -b fix/realtime-reconnect-badge
git checkout -b docs/contributor-setup-guide
```

## Prerequisites

| Tool | Purpose |
|:-----|:--------|
| Python 3 | Serve the online demos and docs site locally |
| Node.js 18+ | Build and run the PowerSync demo |
| npm | Install PowerSync demo dependencies |

## Running Demos Locally

See [How to Run All Demos](../../maintainers/how-to/run-demos.md) for commands, ports, and environment variable setup for each demo and the documentation site.

## Documentation

Documentation lives in `docs/` and is served as a Docsify site. Content is organized by audience role first, then by content type following the Diataxis framework.

### Structure

```
docs/
  developers/        # People building with these patterns (primary audience)
    tutorials/       # Step-by-step learning paths (online-first → sync → offline)
    how-to/          # Setup and implementation guides
    reference/       # API and configuration reference
    explanation/     # Conceptual deep-dives
  maintainers/       # People maintaining the project
    how-to/          # Operational guides (running demos)
    reference/       # Infrastructure and configuration
    explanation/     # Design decisions and trade-offs
  contributors/      # People contributing to the project
    how-to/          # Contributing workflow
    reference/       # Project structure and file purposes
```

### Content Types

- **How-to guides** solve a specific task. Title with the task ("How to set up X"). Assume the reader already knows what they want to do.
- **Reference** describes the system accurately for lookup. Structured around code or architecture, not sequential reading.
- **Explanation** discusses the "why" behind decisions. No step-by-step instructions.
- **Tutorials** (developers role only) walk through a complete learning experience.

### Numbering Convention

Files within a content type directory use numbered prefixes to indicate reading order: `01-topic.md`, `02-topic.md`. This establishes progression within the learner path.

### Diagrams

Use Mermaid for all diagrams. Docsify renders them client-side. No image files for diagrams.

```markdown
    ```mermaid
    flowchart LR
        A[Client] --> B[Supabase]
    ```
```

### Sidebar Navigation

After adding a new documentation file, update `docs/_sidebar.md` to include it in the navigation.

## Code Style

- **Vanilla JS only.** No UI frameworks (React, Vue, Angular). The project demonstrates data patterns, not UI patterns.
- **Minimal dependencies.** The online demos have zero npm dependencies -- they load Supabase from CDN. The PowerSync demo has only four dependencies (`@powersync/web`, `@journeyapps/wa-sqlite`, `@supabase/supabase-js`, `vite`).
- **Commented code.** Each section in the demo files has a comment header explaining what it does and why. Maintain this convention in new code.
- **Single-file demos preferred.** The online demos are self-contained HTML files. Keep new online demos as single files when practical.

## Submitting Changes

1. Commit your changes with a clear message describing the change.
2. Push your branch to your fork.
3. Open a pull request against `main` on the upstream repository.
4. PRs are merged via squash merge.

Keep PRs focused -- one concern per PR. If your change spans multiple topics, split it into separate PRs.

## What to Work On

Check [GitHub Issues](https://github.com/virtualian/offline-first/issues) for open items. Issues are labeled by type:

| Label | Meaning |
|:------|:--------|
| Bug | Observed behavior differs from expected |
| Feature | Multi-story deliverable |
| Story | Small deliverable, completable in under 3 days |
| Task | Bounded non-feature work |

If you want to work on something not covered by an existing issue, open one first to discuss the approach.
