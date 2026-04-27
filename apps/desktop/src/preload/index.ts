import { contextBridge, ipcRenderer } from 'electron';

import {
  IPC_CHANNELS,
  type AppInfo,
  type ThemeState,
  type ThemeSource,
} from '@bridge/core';

const bridgeApi = {
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_INFO),
  getTheme: (): Promise<ThemeState> => ipcRenderer.invoke(IPC_CHANNELS.GET_THEME),
  setThemeSource: (source: ThemeSource): void =>
    ipcRenderer.send(IPC_CHANNELS.SET_THEME_SOURCE, source),
  onThemeUpdated: (handler: (state: ThemeState) => void): (() => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, state: ThemeState): void => handler(state);
    ipcRenderer.on(IPC_CHANNELS.THEME_UPDATED, wrapped);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.THEME_UPDATED, wrapped);
  },
} as const;

export type BridgeApi = typeof bridgeApi;

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('bridge', bridgeApi);
  } catch (error) {
    console.error('[bridge/preload] failed to expose API via contextBridge:', error);
  }
} else {
  // Defensive: if we ever boot without contextIsolation we want to fail loudly,
  // not silently expose a richer surface.
  throw new Error(
    '[bridge/preload] contextIsolation is required. Refusing to expose API on window.',
  );
}
