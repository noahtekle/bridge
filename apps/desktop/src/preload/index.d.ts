import type { BridgeApi } from './index';

declare global {
  interface Window {
    bridge: BridgeApi;
  }
}

export {};
