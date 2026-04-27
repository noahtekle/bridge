import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron';
import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import windowStateKeeper from 'electron-window-state';
import { join } from 'node:path';

import {
  IPC_CHANNELS,
  type AppInfo,
  type ListStackOptions,
  type ListStackResult,
  type Platform,
  type ThemeSource,
} from '@bridge/core';

import {
  scanStack,
  startFileWatcher,
  type FileWatcherHandle,
  type ScanResult,
} from './config';

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
  scanInFlight = scanStack()
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
  return { items: filtered, scannedAt: result.scannedAt };
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
}

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

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', async () => {
  await watcher?.close();
  watcher = null;
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
