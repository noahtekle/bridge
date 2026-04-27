/**
 * Typed IPC contract — the ONLY surface the renderer can call.
 *
 * Channels for the full read/write/import surface (Week 1+) live here too,
 * commented as `// week-1`, `// week-2`, etc. Kept in one place so the contract
 * is auditable end-to-end and so renderer/main can't drift.
 */

import type { StackCategory, StackItem } from './schema';

export const IPC_CHANNELS = {
  // Day 0 — surface needed by the bare scaffold.
  GET_APP_INFO: 'bridge:get-app-info',
  GET_THEME: 'bridge:get-theme',
  SET_THEME_SOURCE: 'bridge:set-theme-source',
  THEME_UPDATED: 'bridge:theme-updated',

  // Week 1 — read pipeline.
  LIST_STACK: 'bridge:list-stack',
  SUBSCRIBE_STACK: 'bridge:subscribe-stack',
  STACK_UPDATED: 'bridge:stack-updated',
  RESCAN: 'bridge:rescan',

  // Week 2 — writes.
  TOGGLE_ITEM: 'bridge:toggle-item',
  ADD_ITEM: 'bridge:add-item',
  UPDATE_ITEM: 'bridge:update-item',
  DELETE_ITEM: 'bridge:delete-item',
  RESTORE_BACKUP: 'bridge:restore-backup',

  // Week 3 — GitHub import + settings.
  IMPORT_FROM_GITHUB: 'bridge:import-from-github',
  IMPORT_PROGRESS: 'bridge:import-progress',
  GET_SETTINGS: 'bridge:get-settings',
  UPDATE_SETTINGS: 'bridge:update-settings',
  SET_GITHUB_TOKEN: 'bridge:set-github-token',
  GET_GITHUB_TOKEN_STATUS: 'bridge:get-github-token-status',
} as const;

// ──────────────────────────────────────────────────────────────────────────
// Day 0 types
// ──────────────────────────────────────────────────────────────────────────

export type Platform =
  | 'aix'
  | 'android'
  | 'darwin'
  | 'freebsd'
  | 'haiku'
  | 'linux'
  | 'openbsd'
  | 'sunos'
  | 'win32'
  | 'cygwin'
  | 'netbsd';

export interface AppInfo {
  name: string;
  version: string;
  platform: Platform;
  isDev: boolean;
}

export type ThemeSource = 'system' | 'light' | 'dark';

export interface ThemeState {
  shouldUseDarkColors: boolean;
  themeSource: ThemeSource;
}

// ──────────────────────────────────────────────────────────────────────────
// Week 1 types — read pipeline
// ──────────────────────────────────────────────────────────────────────────

export interface ListStackOptions {
  categories?: StackCategory[];
  includeDisabled?: boolean;
}

export interface ListStackResult {
  items: StackItem[];
  scannedAt: number;
}

// ──────────────────────────────────────────────────────────────────────────
// Week 2 types — writes
// ──────────────────────────────────────────────────────────────────────────

export interface ToggleItemRequest {
  id: string;
  enabled: boolean;
}

export interface UpdateItemRequest {
  id: string;
  description?: string;
}

export interface DeleteItemRequest {
  id: string;
}

export interface MutationResult {
  ok: boolean;
  /** Path of the backup written before the mutation, if any. */
  backupPath?: string;
  /** Whether Claude Code needs a restart for this change. */
  needsRestart: boolean;
  error?: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Week 3 types — GitHub import
// ──────────────────────────────────────────────────────────────────────────

export interface ImportPreview {
  detectedCategory: StackCategory | 'ambiguous' | 'unknown';
  candidates: StackCategory[];
  name: string;
  description?: string;
  readmeSnippet?: string;
  filesToWrite: { source: string; dest: string }[];
}

export interface ImportProgressEvent {
  stage: 'cloning' | 'detecting' | 'writing' | 'done' | 'error';
  message: string;
  progress?: number;
}

// ──────────────────────────────────────────────────────────────────────────
// Settings
// ──────────────────────────────────────────────────────────────────────────

export interface BridgeSettings {
  themeSource: ThemeSource;
  backupRetentionDays: number;
  backupRetentionCount: number;
  scanOnFocus: boolean;
}

export const DEFAULT_SETTINGS: BridgeSettings = {
  themeSource: 'system',
  backupRetentionDays: 30,
  backupRetentionCount: 50,
  scanOnFocus: true,
};

// ──────────────────────────────────────────────────────────────────────────
// Renderer-facing API surface (the only thing exposed via contextBridge)
// ──────────────────────────────────────────────────────────────────────────

/**
 * The shape the preload exposes to the renderer as `window.bridge`.
 *
 * Defined here (not in preload) so the renderer can import the type without
 * pulling in electron runtime imports. preload/index.ts implements this
 * interface; renderer/global.d.ts uses it to type `window.bridge`.
 */
export interface BridgeApi {
  getAppInfo: () => Promise<AppInfo>;
  getTheme: () => Promise<ThemeState>;
  setThemeSource: (source: ThemeSource) => void;
  onThemeUpdated: (handler: (state: ThemeState) => void) => () => void;

  // Week 1 — read pipeline
  listStack: (options?: ListStackOptions) => Promise<ListStackResult>;
  rescan: () => Promise<ListStackResult>;
  onStackUpdated: (handler: (result: ListStackResult) => void) => () => void;

  // Week 2 — writes
  toggleItem: (request: ToggleItemRequest) => Promise<MutationResult>;
  updateItem: (request: UpdateItemRequest) => Promise<MutationResult>;
  deleteItem: (request: DeleteItemRequest) => Promise<MutationResult>;
}
