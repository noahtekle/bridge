import type { BridgeApi } from '@bridge/core';

declare global {
  interface Window {
    /** Set by preload via contextBridge.exposeInMainWorld('bridge', ...). */
    bridge: BridgeApi;
  }
}

export {};
