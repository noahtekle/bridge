import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron';
import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import windowStateKeeper from 'electron-window-state';
import { join } from 'node:path';

import {
  IPC_CHANNELS,
  type AppInfo,
  type BridgeSettings,
  type ConfirmImportRequest,
  type DeleteItemRequest,
  type ImportInstallResult,
  type ImportPreview,
  type ListStackOptions,
  type ListStackResult,
  type MutationResult,
  type Platform,
  type PreviewImportRequest,
  type StackItem,
  type ThemeSource,
  type ToggleItemRequest,
  type UpdateItemRequest,
} from '@bridge/core';

import {
  ConfigWriter,
  rotateBackups,
  scanStack,
  startFileWatcher,
  stableHookId,
  type FileWatcherHandle,
  type ScanResult,
} from './config';
import {
  cloneRepo,
  detect,
  install as installImport,
  type CloneResult,
} from './import';
import { loadSettings, updateSettings } from './settings';

const writer = new ConfigWriter();

// Active import previews keyed by previewId. Each holds the cloned tmp tree
// and a cleanup function. Cleared on confirm or cancel.
const activeImports = new Map<string, { clone: CloneResult; preview: ImportPreview }>();

const isDev = is.dev;

// In-memory snapshot of the most recent successful scan. Kept here (not in
// the renderer) because:
//  - filesystem access lives in the main process per security boundary
//  - multiple renderer windows (future feature) all see the same data
//  - the watcher invalidates this on disk changes, so it can't go stale silently
let latestScan: ScanResult | null = null;
let scanInFlight: Promise<ScanResult> | null = null;
let watcher: FileWatcherHandle | null = null;

async function refreshScan(): Promise<ScanResult> {
  if (scanInFlight) return scanInFlight;
  scanInFlight = (async () => {
    const settings = await loadSettings();
    return scanStack({
      hookDescriptions: settings.hookDescriptions,
      disabledHooks: settings.disabledHooks,
    });
  })()
    .then((result) => {
      latestScan = result;
      return result;
    })
    .finally(() => {
      scanInFlight = null;
    });
  return scanInFlight;
}

function broadcastStackUpdated(): void {
  if (!latestScan) return;
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC_CHANNELS.STACK_UPDATED, toListResult(latestScan));
  }
}

function toListResult(result: ScanResult, options?: ListStackOptions): ListStackResult {
  const filtered = options
    ? result.items.filter((item) => {
        if (options.categories && !options.categories.includes(item.category)) return false;
        if (!options.includeDisabled && item.status === 'disabled') return false;
        return true;
      })
    : result.items;
  return {
    items: filtered,
    scannedAt: result.scannedAt,
    claudeCodeDetected: result.claudeCodeDetected,
  };
}

function createWindow(): BrowserWindow {
  const windowState = windowStateKeeper({
    defaultWidth: 1280,
    defaultHeight: 800,
  });

  const win = new BrowserWindow({
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Bridge',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0A0A0B' : '#FAFAFA',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Security defaults — locked from commit 1.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  windowState.manage(win);

  win.on('ready-to-show', () => {
    win.show();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, navigationUrl) => {
    const allowed =
      navigationUrl.startsWith('http://localhost:') || navigationUrl.startsWith('file://');
    if (!allowed) {
      event.preventDefault();
      void shell.openExternal(navigationUrl);
    }
  });

  if (isDev && process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_APP_INFO, (): AppInfo => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform as Platform,
      isDev,
    };
  });

  ipcMain.handle(IPC_CHANNELS.GET_THEME, () => ({
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    themeSource: nativeTheme.themeSource,
  }));

  ipcMain.on(IPC_CHANNELS.SET_THEME_SOURCE, (_event, source: ThemeSource) => {
    nativeTheme.themeSource = source;
  });

  ipcMain.handle(
    IPC_CHANNELS.LIST_STACK,
    async (_event, options?: ListStackOptions): Promise<ListStackResult> => {
      const result = latestScan ?? (await refreshScan());
      return toListResult(result, options);
    },
  );

  ipcMain.handle(IPC_CHANNELS.RESCAN, async (): Promise<ListStackResult> => {
    const result = await refreshScan();
    broadcastStackUpdated();
    return toListResult(result);
  });

  ipcMain.handle(
    IPC_CHANNELS.TOGGLE_ITEM,
    async (_event, request: ToggleItemRequest): Promise<MutationResult> =>
      runMutation(async (item) => {
        if (item.category === 'plugin') return writer.togglePlugin(item, request.enabled);
        if (item.category === 'mcp') return writer.toggleMcp(item, request.enabled);
        if (item.category === 'hook') return toggleHook(item, request.enabled);
        return writer.toggleFileItem(item, request.enabled);
      }, request.id),
  );

  ipcMain.handle(
    IPC_CHANNELS.UPDATE_ITEM,
    async (_event, request: UpdateItemRequest): Promise<MutationResult> =>
      runMutation(async (item) => {
        if (request.description === undefined) {
          return {
            ok: false,
            needsRestart: false,
            error: 'No fields provided to update',
          } satisfies MutationResult;
        }
        if (item.category === 'hook') {
          return updateHookDescription(item.id, request.description);
        }
        return writer.updateDescription(item, request.description);
      }, request.id),
  );

  ipcMain.handle(
    IPC_CHANNELS.DELETE_ITEM,
    async (_event, request: DeleteItemRequest): Promise<MutationResult> =>
      runMutation(async (item) => {
        if (item.category === 'hook') return deleteHook(item);
        return writer.deleteItem(item);
      }, request.id),
  );

  ipcMain.handle(
    IPC_CHANNELS.PREVIEW_IMPORT,
    async (_event, request: PreviewImportRequest): Promise<ImportPreview> => {
      const clone = await cloneRepo(request.url);
      try {
        const detected = await detect(clone.path);
        const previewId = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const preview = { ...detected, previewId } satisfies ImportPreview;
        activeImports.set(previewId, { clone, preview });

        // Auto-clean orphaned previews after 10 minutes so a forgotten modal
        // doesn't leak tmp dirs forever.
        setTimeout(
          () => {
            const slot = activeImports.get(previewId);
            if (slot) {
              activeImports.delete(previewId);
              void slot.clone.dispose();
            }
          },
          10 * 60_000,
        );

        return preview;
      } catch (err) {
        await clone.dispose();
        throw err;
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.CONFIRM_IMPORT,
    async (_event, request: ConfirmImportRequest): Promise<ImportInstallResult> => {
      const slot = activeImports.get(request.previewId);
      if (!slot) {
        return {
          ok: false,
          installed: [],
          error: 'Preview expired or already used. Re-paste the URL.',
        };
      }
      try {
        const result = await installImport(slot.clone.path, request.category, request.name);
        if (result.ok) {
          await refreshScan();
          broadcastStackUpdated();
        }
        return result;
      } finally {
        activeImports.delete(request.previewId);
        void slot.clone.dispose();
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.CANCEL_IMPORT, async (_event, previewId: string): Promise<void> => {
    const slot = activeImports.get(previewId);
    if (!slot) return;
    activeImports.delete(previewId);
    await slot.clone.dispose();
  });

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, (): Promise<BridgeSettings> => loadSettings());
  ipcMain.handle(
    IPC_CHANNELS.UPDATE_SETTINGS,
    async (_event, partial: Partial<BridgeSettings>): Promise<BridgeSettings> =>
      updateSettings(partial),
  );
}

async function runMutation(
  fn: (item: StackItem) => Promise<MutationResult>,
  id: string,
): Promise<MutationResult> {
  const item = latestScan?.items.find((it) => it.id === id);
  if (!item) {
    return { ok: false, needsRestart: false, error: `Item ${id} not in current scan` };
  }
  try {
    const result = await fn(item);
    if (result.ok) {
      // Pre-emptively rescan + broadcast so the UI updates without waiting
      // for the FileWatcher debounce to kick in.
      await refreshScan();
      broadcastStackUpdated();
    }
    return result;
  } catch (err) {
    return {
      ok: false,
      needsRestart: false,
      error: err instanceof Error ? err.message : 'Unknown mutation error',
    };
  }
}

// ─── Hook orchestration ─────────────────────────────────────────────────
// Hooks live across two files: settings.json holds the active entry, and
// bridge-settings.json holds Bridge-only state (descriptions for the UI,
// captured content for disabled hooks). These helpers coordinate both so
// the writer + settings store stay free of cross-cutting knowledge.

async function toggleHook(item: StackItem, enabled: boolean): Promise<MutationResult> {
  const current = await loadSettings();

  if (enabled) {
    const captured = current.disabledHooks[item.id];
    if (!captured) {
      return {
        ok: false,
        needsRestart: false,
        error: 'No disabled-hook entry found — was it deleted instead?',
      };
    }
    const result = await writer.restoreHookToClaude(captured);
    if (result.ok) {
      const { [item.id]: _removed, ...rest } = current.disabledHooks;
      void _removed;
      await updateSettings({ disabledHooks: rest });
    }
    return result;
  }

  const result = await writer.removeHookFromClaude(item);
  if (!result.ok || !result.captured) return result;

  await updateSettings({
    disabledHooks: { ...current.disabledHooks, [item.id]: result.captured },
  });
  return result;
}

async function deleteHook(item: StackItem): Promise<MutationResult> {
  const current = await loadSettings();

  const wasDisabled = item.id in current.disabledHooks;

  if (wasDisabled) {
    // Disabled hooks live only in bridge-settings.json, not in claude
    // settings.json. Delete is sidecar-only.
    const { [item.id]: _removed, ...rest } = current.disabledHooks;
    void _removed;
    const { [item.id]: _description, ...descriptions } = current.hookDescriptions;
    void _description;
    await updateSettings({ disabledHooks: rest, hookDescriptions: descriptions });
    return { ok: true, needsRestart: false };
  }

  const result = await writer.deleteHookFromClaude(item);
  if (result.ok) {
    const { [item.id]: _description, ...descriptions } = current.hookDescriptions;
    void _description;
    if (Object.keys(descriptions).length !== Object.keys(current.hookDescriptions).length) {
      await updateSettings({ hookDescriptions: descriptions });
    }
  }
  return result;
}

async function updateHookDescription(id: string, description: string): Promise<MutationResult> {
  const current = await loadSettings();
  const next = { ...current.hookDescriptions };
  if (description.trim().length === 0) {
    delete next[id];
  } else {
    next[id] = description;
  }
  await updateSettings({ hookDescriptions: next });
  return { ok: true, needsRestart: false };
}

// Silence the unused-import warnings — TS keeps these in sight even though
// they're indirectly used through type narrowing.
void stableHookId;

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.bridge.app');

  app.on('browser-window-created', (_event, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  registerIpcHandlers();

  nativeTheme.on('updated', () => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC_CHANNELS.THEME_UPDATED, {
        shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
        themeSource: nativeTheme.themeSource,
      });
    }
  });

  // Kick off initial scan early so the splash → reveal handoff has data ready.
  // Don't await — the renderer also calls LIST_STACK and will resolve from the
  // same in-flight promise via refreshScan() coalescing.
  void refreshScan().then(() => {
    broadcastStackUpdated();
  });

  watcher = startFileWatcher(() => {
    void refreshScan().then(() => {
      broadcastStackUpdated();
    });
  });

  // Backup retention runs in the background — never blocks app boot.
  // 30 days OR last 50 backups, whichever is more permissive.
  void rotateBackups({ retainCount: 50, retainDays: 30 }).catch((err) => {
    console.error('[bridge] backup rotation failed:', err);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', async () => {
  await watcher?.close();
  watcher = null;
  // Clean up any orphaned import tmp dirs.
  for (const [, slot] of activeImports) {
    await slot.clone.dispose().catch(() => undefined);
  }
  activeImports.clear();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Block any future webview from sneaking in with a different security posture.
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event, webPreferences) => {
    event.preventDefault();
    webPreferences.preload = undefined;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
  });
});
