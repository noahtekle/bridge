# Changelog

All notable changes to Bridge are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Week 3 — Import + polish

- **GitHub import**: paste URL → shallow clone to tmp → filename signal detection → preview screen with override → install with backup-first
  - Detection: `SKILL.md`, `plugin.json`, `mcpServers` field in `mcp.json` / `.mcp.json` / `claude_desktop_config.json`, `agents/*.md`, `commands/*.md`
  - Reports `ambiguous` when multiple signals match (user picks via override)
  - Reports `unknown` when no signal matches (user picks manually)
  - Plugin installs route to Claude Code with the CLI command surfaced — Bridge doesn't fork the install pipeline
  - Two-step IPC: `previewImport` → `confirmImport` / `cancelImport`, with a 10-minute auto-cleanup timeout for orphaned previews
- **Cmd-K command palette** (`cmdk`) — searches stack items, top-level actions, quick toggles, and quick deletes
- **Settings panel** with theme (system/light/dark), backup retention (count + days), scan-on-focus toggle, and a privacy-summary deeplink
- **Privacy modal** auto-shown on first run (after which `hasSeenPrivacyModal` is persisted to `<userData>/bridge-settings.json`)
- **"Claude Code not detected" fallback** — when neither `~/.claude/` nor `~/.claude.json` exist, renders an install-prompt screen with a Rescan button instead of empty cards
- Empty states now offer "Import from GitHub" CTAs
- Full hotkey set wired: `Cmd-K` palette, `Cmd-,` settings, `Cmd-N` new (import), `Cmd-R` rescan, `Cmd-F` focus search, `Esc` close
- Sidebar has "Import from GitHub", "Command palette", "Rescan", and "Settings" entries with keyboard hints
- 12 new tests for the detect logic (single signal, ambiguous, unknown, README snippet extraction, install plan)

### Week 2 — Writes

- `ConfigWriter` class with serialized mutation queue, backup-first, atomic writes
- Per-category mutations:
  - **Plugin** toggle → `settings.json` `enabledPlugins[name] = boolean`
  - **MCP** toggle → remove from `~/.claude.json` `mcpServers` (off) / restore from most recent backup (on)
  - **Skill / Agent / Slash command** toggle → move file/folder to/from `.disabled/` sibling
  - **Delete** for all 5 categories (plugin → routed to Claude Code; everything else → backed up + removed)
  - **Edit description** for file-based items (writes back to YAML frontmatter)
- Backups land in `~/.claude/backups/<ISO>/` mirroring the original path
- Backup rotation runs on app start: keep last 50 OR last 30 days, whichever is more permissive
- Atomic JSON writes (`.tmp.<rand>` + fsync + rename) so partial writes can't corrupt the original
- IPC contract extended: `TOGGLE_ITEM`, `UPDATE_ITEM`, `DELETE_ITEM`
- Renderer:
  - Card toggle is now clickable, with spinner during pending mutation and lock state for plugin-bundled skills
  - Detail panel: inline description editor (skill/agent/command), delete with inline confirm
  - Restart-needed banner with Got-it dismiss
  - Failure banner with backup path shown, X dismiss
- Plugin-bundled skills are toggle-locked with a tooltip explaining they're managed by the parent plugin
- Items in `error` state (settings/installed mismatch) cannot be toggled directly — fix the underlying issue first

### Week 1 — Read pipeline + UI shell

- ConfigReader scans all 5 sources end-to-end:
  - `~/.claude.json` → MCP servers
  - `~/.claude/settings.json` + `~/.claude/plugins/installed_plugins.json` → Plugins (with state-mismatch detection)
  - `~/.claude/skills/` (user) + `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/skills/` (bundled) → Skills
  - `~/.claude/agents/` → Agents
  - `~/.claude/commands/` → Slash commands
  - `.disabled/` subdirectories scanned for items toggled off via Bridge
- `gray-matter` parses YAML frontmatter from SKILL.md, agent.md, command.md
- FileWatcher (chokidar) watches the 6 source paths, debounces 250ms, broadcasts `STACK_UPDATED`
- Typed IPC contract extended with `LIST_STACK`, `RESCAN`, `STACK_UPDATED`
- Renderer shell: collapsible sidebar (220 / 56px) + 3-col card grid + slide-in detail panel
- "Balanced" StackCard variant with 5 hand-tuned category gradient icons (custom SVG, not Lucide)
- Search + category filter (in-memory, instant), Cmd-F focus, Cmd-R rescan, Esc close
- First-run "stack reveal" — count-up animation per category with staggered timing
- Empty states per category and a global no-stack-found state
- All renders use only `transform`/`opacity`; `prefers-reduced-motion` respected

### Day 0 — Repo + scaffold

- Initialize public GitHub repo with MIT license
- Set up pnpm monorepo (`apps/desktop`, `packages/core`, `packages/ui`)
- Lock Electron security: `contextIsolation`, `nodeIntegration: false`, `sandbox: true`
- Wire `electron-window-state` for window persistence
- Wire `prefers-color-scheme` detection for theme sync
- Define typed IPC contract in `packages/core/src/ipc.ts`
- Define normalized `StackItem` schema
- Stack: Electron 30 + Vite + React + TypeScript + Tailwind + shadcn/ui + Lucide + Framer Motion + Zustand + better-sqlite3 + chokidar + simple-git + cmdk + keytar + electron-window-state

## [0.0.1] — 2026-04-26

- Day 0 scaffold released
