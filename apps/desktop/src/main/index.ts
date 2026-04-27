import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron';
import { electronApp, is, optimizer } from '@electron-toolkit/utils';
import windowStateKeeper from 'electron-window-state';
import { join } from 'node:path';

import { IPC_CHANNELS, type AppInfo } from '@bridge/core';

const isDev = is.dev;

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

  // Reject any in-page navigation away from our own renderer.
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    const allowed =
      navigationUrl.startsWith('http://localhost:5173') ||
      navigationUrl.startsWith('file://');
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

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.bridge.app');

  app.on('browser-window-created', (_event, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  // Day 0 IPC stub — full surface implemented in Week 1+.
  ipcMain.handle(IPC_CHANNELS.GET_APP_INFO, (): AppInfo => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform,
      isDev,
    };
  });

  ipcMain.handle(IPC_CHANNELS.GET_THEME, () => ({
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    themeSource: nativeTheme.themeSource,
  }));

  ipcMain.on(IPC_CHANNELS.SET_THEME_SOURCE, (_event, source: 'system' | 'light' | 'dark') => {
    nativeTheme.themeSource = source;
  });

  nativeTheme.on('updated', () => {
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send(IPC_CHANNELS.THEME_UPDATED, {
        shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
        themeSource: nativeTheme.themeSource,
      });
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Block everything other than the preload from accessing Node.
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event, webPreferences) => {
    event.preventDefault();
    webPreferences.preload = undefined;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
  });
});
