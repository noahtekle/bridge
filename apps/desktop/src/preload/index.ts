import { contextBridge, ipcRenderer } from 'electron';

import {
  IPC_CHANNELS,
  type AppInfo,
  type BridgeApi,
  type DeleteItemRequest,
  type ListStackOptions,
  type ListStackResult,
  type MutationResult,
  type ThemeState,
  type ThemeSource,
  type ToggleItemRequest,
  type UpdateItemRequest,
} from '@bridge/core';

const bridgeApi: BridgeApi = {
  getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke(IPC_CHANNELS.GET_APP_INFO),
  getTheme: (): Promise<ThemeState> => ipcRenderer.invoke(IPC_CHANNELS.GET_THEME),
  setThemeSource: (source: ThemeSource): void =>
    ipcRenderer.send(IPC_CHANNELS.SET_THEME_SOURCE, source),
  onThemeUpdated: (handler) => {
    const wrapped = (_event: Electron.IpcRendererEvent, state: ThemeState): void => handler(state);
    ipcRenderer.on(IPC_CHANNELS.THEME_UPDATED, wrapped);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.THEME_UPDATED, wrapped);
  },

  listStack: (options?: ListStackOptions): Promise<ListStackResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.LIST_STACK, options),
  rescan: (): Promise<ListStackResult> => ipcRenderer.invoke(IPC_CHANNELS.RESCAN),
  onStackUpdated: (handler) => {
    const wrapped = (_event: Electron.IpcRendererEvent, result: ListStackResult): void =>
      handler(result);
    ipcRenderer.on(IPC_CHANNELS.STACK_UPDATED, wrapped);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.STACK_UPDATED, wrapped);
  },

  toggleItem: (request: ToggleItemRequest): Promise<MutationResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_ITEM, request),
  updateItem: (request: UpdateItemRequest): Promise<MutationResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_ITEM, request),
  deleteItem: (request: DeleteItemRequest): Promise<MutationResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_ITEM, request),
};

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
