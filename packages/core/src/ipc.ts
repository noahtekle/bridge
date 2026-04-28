/**
 * Typed IPC contract — the ONLY surface the renderer can call.
 *
 * Channels for the full read/write/import surface (Week 1+) live here too,
 * commented as `// week-1`, `// week-2`, etc. Kept in one place so the contract
 * is auditable end-to-end and so renderer/main can't drift.
 */

import type { DiscoverEntry } from './discover';
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
  PREVIEW_IMPORT: 'bridge:preview-import',
  CONFIRM_IMPORT: 'bridge:confirm-import',
  CANCEL_IMPORT: 'bridge:cancel-import',
  GET_SETTINGS: 'bridge:get-settings',
  UPDATE_SETTINGS: 'bridge:update-settings',
  GET_DISCOVER_LIST: 'bridge:get-discover-list',
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
  /**
   * False when neither `~/.claude/` nor `~/.claude.json` exists, indicating
   * Claude Code probably isn't installed. The renderer shows a friendlier
   * "couldn't find your install" screen in that case.
   */
  claudeCodeDetected: boolean;
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
  /** Token identifying the cloned tmp tree on the main side. Pass back to confirm/cancel. */
  previewId: string;
  detectedCategory: StackCategory | 'ambiguous' | 'unknown';
  candidates: StackCategory[];
  name: string;
  description?: string;
  readmeSnippet?: string;
  filesToWrite: { source: string; dest: string }[];
}

export interface PreviewImportRequest {
  url: string;
}

export interface ConfirmImportRequest {
  previewId: string;
  /** What category the user chose. May differ from detected when the user overrides. */
  category: StackCategory;
  /** Name to install under (folder/key). Defaults to the detected name. */
  name: string;
}

export interface ImportInstallResult {
  ok: boolean;
  installed: string[];
  backupPath?: string;
  error?: string;
  /** When category === 'plugin' or otherwise can't auto-install, the CLI command to run. */
  cliInstruction?: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Settings
// ──────────────────────────────────────────────────────────────────────────

export interface BridgeSettings {
  themeSource: ThemeSource;
  backupRetentionDays: number;
  backupRetentionCount: number;
  scanOnFocus: boolean;
  hasSeenPrivacyModal: boolean;
  /**
   * Hook descriptions live here, not inside Claude Code's settings.json,
   * because hooks have no native description schema — and we don't want to
   * pollute the user's Claude config with Bridge-only metadata.
   *
   * Keyed by stable hook ID (hash of event + matcher + command).
   */
  hookDescriptions: Record<string, string>;
  /**
   * Hooks the user has toggled off via Bridge. The hook entry itself is
   * removed from settings.json so Claude Code stops running it, but its
   * full content is parked here so we can restore it on toggle-on without
   * depending on backup-folder rotation.
   */
  disabledHooks: Record<string, DisabledHookEntry>;
}

export interface DisabledHookEntry {
  eventType: string;
  matcher: string | undefined;
  command: string;
  /** Optional `type` field from the hook entry — usually 'command'. */
  type?: string;
  /** Free-form passthrough so we don't lose unknown fields on round trip. */
  passthrough?: Record<string, unknown>;
}

export const DEFAULT_SETTINGS: BridgeSettings = {
  themeSource: 'system',
  backupRetentionDays: 30,
  backupRetentionCount: 50,
  scanOnFocus: true,
  hasSeenPrivacyModal: false,
  hookDescriptions: {},
  disabledHooks: {},
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

  // Week 3 — GitHub import + settings
  previewImport: (request: PreviewImportRequest) => Promise<ImportPreview>;
  confirmImport: (request: ConfirmImportRequest) => Promise<ImportInstallResult>;
  cancelImport: (previewId: string) => Promise<void>;

  getSettings: () => Promise<BridgeSettings>;
  updateSettings: (partial: Partial<BridgeSettings>) => Promise<BridgeSettings>;

  getDiscoverList: () => Promise<DiscoverEntry[]>;
}
