# Changelog

All notable changes to Bridge are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
