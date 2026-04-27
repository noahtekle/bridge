<div align="center">

# Bridge

**The OS for Claude Code.**

A visual dashboard for your MCPs, Skills, Agents, Plugins, and slash commands.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status: Pre-release](https://img.shields.io/badge/Status-Pre--release-yellow.svg)]()
[![Stack: Electron + React](https://img.shields.io/badge/Stack-Electron%20%2B%20React-brightgreen.svg)]()

_Screenshot coming soon._

</div>

---

## What is Bridge?

Claude Code's power-user surface is scattered across `~/.claude.json`, `~/.claude/settings.json`, and a handful of folders for skills, agents, and slash commands. There's no native UI for any of it. You manage your stack by hand-editing config.

Bridge is the missing GUI layer.

- See every MCP, Skill, Agent, Plugin, and slash command on one dashboard
- Toggle, add, edit, and delete from a card grid
- Import skills/agents/plugins straight from a GitHub URL — Bridge detects the type and previews before installing
- Linear/Raycast/Arc-inspired interface, dark mode default
- Local-only — your config never leaves your machine

## Status

**Pre-release. Day 0 scaffold.** First public build (`v0.1.0`) targets ~4 weeks out. Follow the repo for updates.

## Installation

Pre-built binaries will be attached to GitHub Releases starting with `v0.1.0`. Until then, build from source:

```bash
git clone https://github.com/noahtekle/bridge.git
cd bridge
pnpm install
pnpm dev
```

## Why is this unsigned?

Bridge ships as **unsigned** binaries for `v0.1`. This is a deliberate cost decision for an indie project:

- **Apple Developer Program:** $99/year + notarization round-trip per release
- **Windows code-signing certificate:** $200–500/year from a Certificate Authority

For a `v0.1` with zero users, signing those costs against this is a bad bet. Bridge will revisit signing once the project sees meaningful traction.

This means the first launch on each platform shows a security warning. **It is not malware.** Source is public. Once you trust the build, your OS remembers and won't warn again.

### macOS — first launch

The default Open will say _"Bridge can't be opened because it is from an unidentified developer."_

**Bypass:**
1. Locate `Bridge.app` in your Applications folder
2. **Right-click → Open** (don't double-click)
3. Click **Open** in the confirmation dialog
4. macOS remembers the choice; future launches are normal

### Windows — first launch

SmartScreen Defender will show _"Windows protected your PC."_

**Bypass:**
1. Click **More info** in the SmartScreen dialog
2. Click **Run anyway**
3. Windows remembers the choice; future launches are normal

## Privacy

**Bridge reads your Claude Code config locally and never phones home.**

No telemetry. No analytics. No crash reporting. No accounts. No cloud. Zero outbound network calls except when you explicitly trigger a GitHub import. This is a contract — anything that violates it is a bug.

Backups of your config are written to `~/.claude/backups/<timestamp>/` before any mutation, and rotated automatically (last 50 / 30 days, whichever is more permissive).

## Features (V1)

- [x] Read pipeline for all 5 categories
- [x] Sidebar nav + 3-column card grid
- [x] Dark + light theme with system sync
- [x] First-run "stack reveal" moment
- [x] Toggle, add, edit, delete
- [x] GitHub import with type detection
- [x] Cmd-K command palette
- [x] Settings (theme, backup retention, GitHub PAT)

## Roadmap

**V1.5+** (deferred from V1, listed for transparency):
- Marketplace ("browse community setups")
- Share-as-link / "export my setup"
- Cloud sync / accounts / paid tier
- Performance metrics
- Right-click context menus
- Drag-and-drop folder import
- Code signing + notarization

## Architecture

- **Stack:** Electron 30, React, TypeScript, Tailwind, shadcn/ui, Lucide, Framer Motion, Zustand
- **Cache:** `better-sqlite3` at `<userData>/cache.db`
- **File watching:** `chokidar` on the 6 source files/directories
- **Security:** `contextIsolation`, `nodeIntegration: false`, `sandbox: true` from commit 1; renderer talks to main only via typed IPC

See [`docs/`](docs/) (forthcoming) for full architecture and design system.

## Contributing

PRs welcome once V1 ships. Open issues anytime. See [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/) for templates.

## License

MIT — see [LICENSE](LICENSE).
