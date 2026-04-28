# Launch posts — Bridge v0.1

Drafts for the v0.1 launch across X, r/ClaudeAI, the Claude Code Discord,
Show HN, and Product Hunt. Every claim is verifiable today — no fictional
metrics, no exaggerated user counts, no testimonials.

**Pre-flight checklist before posting:**

- [ ] `v0.1.0` tag pushed and Releases page populated with `.dmg` + `.exe`
- [ ] `bridge-stack.pages.dev` is live and renders correctly
- [ ] README screenshot loads from the raw GitHub URL
- [ ] Tested both downloads on a clean machine (Mac + Windows) once

---

## X (Twitter)

### Main launch tweet

> Just shipped Bridge v0.1 — a visual dashboard for everything in your Claude Code stack.
>
> See, manage, and install MCPs, Skills, Agents, Plugins, slash commands, and hooks from one app. Local-first, open source, MIT.
>
> Mac + Windows: bridge-stack.pages.dev

Attach: dashboard screenshot.

### Follow-up thread (optional)

> 1/ Bridge reads `~/.claude.json` and `~/.claude/` and surfaces every item in your stack as a card. No setup, no auth, no permissions to grant.

> 2/ Toggle, edit, delete — every write is backed up first to `~/.claude/backups/<timestamp>/` and atomic. A crash mid-write can't corrupt your config.

> 3/ Paste a GitHub URL → Bridge clones, detects what kind of thing it is (Skill, Plugin, MCP, Agent, slash command, hook), previews what'll be written, then installs.

> 4/ Discover tab: 16 hand-curated, URL-verified plugins and skills. One click installs them via the same flow.

> 5/ Privacy is the contract — zero outbound network calls except when you trigger an import. No accounts, no telemetry, no analytics. Open source so you can audit.

> 6/ v0.1 ships unsigned (signing comes when traction warrants the $300+/yr). README has bypass instructions for both platforms.
>
> Repo: github.com/noahtekle/bridge

---

## r/ClaudeAI

### Title

`Bridge v0.1 — visual dashboard for your Claude Code stack (open source, local-first)`

### Body

I built Bridge because managing my Claude Code config by hand-editing `~/.claude.json` and `~/.claude/settings.json` got tiring fast.

Bridge is a desktop app that:

- **Reads your stack** — every MCP, Skill, Agent, Plugin, slash command, and hook surfaces as a card. Picks up plugin-bundled items too.
- **Manages with one click** — toggle on/off, edit descriptions, delete with a backup kept. Every write is atomic and snapshotted first.
- **Installs from GitHub** — paste a repo URL, Bridge detects what it is, previews what'll be written, then installs.
- **Discover tab** — 16 hand-curated plugins and skills (Superpowers, claude-mem, gstack, the official Anthropic skill bundle), one click to install.
- **Cmd-K palette** — search your stack and run actions like Linear/Raycast.

**Privacy is the whole pitch:** zero outbound calls except when you trigger a GitHub import. No accounts, no telemetry, no cloud. MIT, open source, you can audit before you trust it.

**v0.1 ships unsigned** for cost reasons — first launch shows a security warning, README has bypass instructions for Mac (right-click → Open) and Windows (SmartScreen → Run anyway). Signing comes when the project earns it.

Mac + Windows: [github.com/noahtekle/bridge/releases](https://github.com/noahtekle/bridge/releases)
Site: [bridge-stack.pages.dev](https://bridge-stack.pages.dev)
Source: [github.com/noahtekle/bridge](https://github.com/noahtekle/bridge)

Feedback welcome — bug reports and Discover-list PRs especially.

---

## Claude Code Discord

### Channel: #show-and-tell (or equivalent)

> Hey folks 👋
>
> I shipped Bridge v0.1 — a desktop dashboard for the Claude Code stack you've already built.
>
> What it does:
> • See every MCP, Skill, Agent, Plugin, slash command, and hook on one screen
> • Toggle / edit / delete with atomic backed-up writes
> • Import from GitHub (paste URL → preview → install)
> • Discover tab: 16 hand-curated, URL-verified plugins + skills
> • Cmd-K palette for everything
> • Local-first — never phones home
>
> Mac + Windows downloads: github.com/noahtekle/bridge/releases
> Site: bridge-stack.pages.dev
>
> v0.1 ships unsigned (cost reasons), README walks through the bypass on each platform. Open source, MIT.
>
> Would love feedback from people who actually live in Claude Code daily.

---

## Show HN

### Title

`Show HN: Bridge — visual dashboard for your Claude Code stack`

### Body

Bridge is a local-first desktop app for managing the Claude Code stack you've already built — MCPs, Skills, Agents, Plugins, slash commands, and hooks.

The trigger: I had ~100 items across `~/.claude.json` and `~/.claude/`, and managing them meant hand-editing JSON and moving folders around. There was no UI for any of it.

What v0.1 does:

- **Reads the config tree** and surfaces every item as a card. Plugin-bundled skills picked up too.
- **Mutations are atomic and backed up** — every write snapshots the source to `~/.claude/backups/<timestamp>/` first, then writes via `.tmp` + `fsync` + `rename`. Backup retention rotates (last 50 OR last 30 days).
- **GitHub import** — paste a repo URL, Bridge clones, runs filename-signal detection (`SKILL.md`, `plugin.json`, `mcpServers` in any json, `agents/*.md`, `commands/*.md`), shows a preview with override, then installs. Monorepo subPath is supported (e.g. `anthropics/skills` + `skills/pdf`).
- **Discover tab** — 16 hand-curated, URL-verified plugins and skills.
- **Cmd-K palette**, settings, privacy modal, "Claude Code not detected" fallback.

Stack: Electron 32 + Vite + React + TypeScript + Tailwind. 58 vitest tests covering the writer + scanner + import detection. Renderer has no Node access (`contextIsolation`, `sandbox` from commit one).

Privacy is the contract: zero outbound calls except when the user triggers a GitHub import. No accounts, no telemetry, no analytics. MIT, open source, auditable.

Honest about what's not in v0.1:

- **MCP install path** — Bridge can't auto-install MCP servers from a clone yet (they need npm + JSON config patching beyond what the import flow does). Discover entries are skills + plugins for now. MCP install lands in v0.2.
- **Code signing** — both binaries are unsigned. Cost reasons. README has bypass instructions for Mac (right-click → Open) and Windows (SmartScreen → Run anyway). Source is public, you can audit before approving.
- **Cloud sync, marketplace, performance metrics** — all on the roadmap, none in v0.1.

Mac + Windows: [github.com/noahtekle/bridge/releases](https://github.com/noahtekle/bridge/releases)
Site: [bridge-stack.pages.dev](https://bridge-stack.pages.dev)
Source: [github.com/noahtekle/bridge](https://github.com/noahtekle/bridge)

Want to hear from people whose actual Claude Code workflow this either solves or doesn't — architecture Qs welcome too.

---

## Product Hunt

### Tagline

`The OS for Claude Code — see, manage, and install your stack from one local-first dashboard.`

### Description

Bridge is a desktop app that turns the Claude Code config tree into a visual dashboard. See every MCP, Skill, Agent, Plugin, slash command, and hook on one screen. Toggle, edit, delete with atomic backed-up writes. Install from any GitHub URL — Bridge detects what it is, previews what'll be written, then installs.

A Discover tab with 16 hand-curated, URL-verified plugins and skills lets you set up a fresh Claude Code install in minutes.

Local-first. Zero outbound network calls except when you explicitly trigger a GitHub import. No accounts, no telemetry, no cloud. MIT, open source, auditable end-to-end.

Mac and Windows. Unsigned for v0.1 — first launch shows a security prompt, README has bypass instructions.

### Topics
Developer Tools, Productivity, AI, Open Source

### First comment (poster)

> Hey Product Hunt 👋 Bridge maker here.
>
> Built this because my own Claude Code stack hit ~100 items and managing it through JSON edits stopped scaling. The architecture I cared most about getting right:
>
> 1. **Privacy is the contract.** Zero outbound calls except for user-triggered GitHub clones. No accounts, no telemetry. The whole point.
>
> 2. **Mutations are safe.** Every write snapshots the source to `~/.claude/backups/<timestamp>/` first. Atomic JSON writes. 58 vitest tests covering the write paths.
>
> 3. **Honest about scope.** v0.1 covers reads + writes + GitHub import + Discover. MCP server auto-install, cloud sync, marketplace — all on the roadmap, none on the page.
>
> Honest about what's not v0.1 yet:
> • Code signing (cost reasons; README has bypass instructions)
> • MCP server install (still needs the README → mcpServers JSON path)
>
> Feedback especially welcome from people whose actual Claude Code stack this either solves or doesn't.
