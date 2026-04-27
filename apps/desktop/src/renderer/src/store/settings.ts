import { create } from 'zustand';
import {
  DEFAULT_SETTINGS,
  type BridgeSettings,
} from '@bridge/core';

interface SettingsStore {
  settings: BridgeSettings;
  loaded: boolean;

  load: () => Promise<void>;
  update: (partial: Partial<BridgeSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  load: async () => {
    const settings = await window.bridge.getSettings();
    set({ settings, loaded: true });
  },

  update: async (partial) => {
    const next = await window.bridge.updateSettings(partial);
    set({ settings: next });
  },
}));
