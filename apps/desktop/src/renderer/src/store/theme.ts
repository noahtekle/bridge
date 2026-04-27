import { create } from 'zustand';
import type { ThemeSource, ThemeState } from '@bridge/core';

interface ThemeStore extends ThemeState {
  setSource: (source: ThemeSource) => void;
  applyToDocument: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  shouldUseDarkColors: true,
  themeSource: 'system',

  setSource: (source) => {
    window.bridge.setThemeSource(source);
    set({ themeSource: source });
  },

  applyToDocument: () => {
    const { shouldUseDarkColors } = get();
    const root = document.documentElement;
    root.classList.toggle('dark', shouldUseDarkColors);
    root.classList.toggle('light', !shouldUseDarkColors);
  },
}));

/**
 * Bridge the renderer-side theme store to the main process's nativeTheme.
 * Call once on app boot.
 */
export async function initTheme(): Promise<() => void> {
  const initial = await window.bridge.getTheme();
  useThemeStore.setState(initial);
  useThemeStore.getState().applyToDocument();

  const unsubscribe = window.bridge.onThemeUpdated((state) => {
    useThemeStore.setState(state);
    useThemeStore.getState().applyToDocument();
  });

  return unsubscribe;
}
