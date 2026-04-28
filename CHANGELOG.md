# Changelog

All notable changes to Bridge are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
