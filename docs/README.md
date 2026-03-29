# Learn how offline-first applications work

> A learning project exploring offline-first data access and synchronisation using [Supabase](https://supabase.com/docs) and [PowerSync](https://docs.powersync.com/).

This project starts from the simplest possible online-first baseline and progressively adds offline capabilities, one step at a time. Each step has a working demo and documentation explaining the concepts behind it.

Each [release](https://github.com/virtualian/learn-offline-first-apps/releases) marks a working milestone — from online-first ([v1.0.0](https://github.com/virtualian/learn-offline-first-apps/releases/tag/v1.0.0)) through realtime sync ([v2.0.0](https://github.com/virtualian/learn-offline-first-apps/releases/tag/v2.0.0)) to offline-first ([v3.0.0](https://github.com/virtualian/learn-offline-first-apps/releases/tag/v3.0.0)). Check out any tag to see the project at that stage. See the [release notes](https://github.com/virtualian/learn-offline-first-apps/blob/main/RELEASE_NOTES.md) and [known issues](https://github.com/virtualian/learn-offline-first-apps/blob/main/KNOWN_ISSUES.md).

**Questions or feedback?** Join the [discussions](https://github.com/virtualian/learn-offline-first-apps/discussions).

## What you'll learn

1. **Online-first** — reading and writing directly to a cloud database (Supabase)
2. **Realtime sync** — keeping multiple clients in sync via WebSocket
3. **Offline-first** — local SQLite with bidirectional cloud sync (PowerSync)

## How the docs are organised

The docs follow the [Diataxis](https://diataxis.fr/) framework and are split by role:

| Section | Who it's for | What's in it |
|---|---|---|
| **Developer** | Anyone building or learning | Tutorials, how-to guides, reference, and explanations |
| **Maintainer** | Project operators | Running demos, infrastructure, architecture decisions |
| **Contributor** | Anyone submitting changes | Contributing guide and project structure |

Within each role you'll find:

- **Tutorials** — end-to-end walkthroughs that build something from scratch
- **How-To** — focused steps for a specific task (assumes you know the basics)
- **Reference** — technical descriptions for lookup, not sequential reading
- **Explanation** — the "why" behind design decisions and trade-offs

## Getting started

**New to the project?** Start with the Developer tutorials in order:

1. [Build a Notes App with Supabase](developers/tutorials/online-first.md) — online-first baseline
2. [Add Realtime Sync](developers/tutorials/online-with-sync.md) — multi-client sync via WebSocket
3. [Make It Work Offline](developers/tutorials/offline-first.md) — local-first with PowerSync

**Just want to run the demos?** See the how-to guides:

- [Set Up the Online-First Demo](developers/how-to/setup-online-first.md)
- [Set Up the Online Sync Demo](developers/how-to/setup-online-sync.md)
- [Set Up the PowerSync Demo](developers/how-to/setup-offline-first.md)

**Want to understand the concepts?** Read the explanations:

- [Why Online-First Works](developers/explanation/online-first.md)
- [How Realtime Sync Works](developers/explanation/realtime-sync.md)
- [How Offline-First Works](developers/explanation/offline-first.md)
