import { create } from 'zustand';
import type { StackCategory, StackItem } from '@bridge/core';

export type CategoryFilter = 'all' | StackCategory;

interface StackStore {
  items: StackItem[];
  loading: boolean;
  error: string | null;
  scannedAt: number | null;

  filter: CategoryFilter;
  search: string;
  selectedId: string | null;
  sidebarCollapsed: boolean;
  hasSeenReveal: boolean;

  load: () => Promise<void>;
  rescan: () => Promise<void>;
  setFilter: (filter: CategoryFilter) => void;
  setSearch: (search: string) => void;
  setSelected: (id: string | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  markRevealSeen: () => void;
}

const SIDEBAR_KEY = 'bridge:sidebarCollapsed';
const REVEAL_KEY = 'bridge:hasSeenReveal';

const readBoolFlag = (key: string): boolean => {
  try {
    return localStorage.getItem(key) === 'true';
  } catch {
    return false;
  }
};

const writeBoolFlag = (key: string, value: boolean): void => {
  try {
    localStorage.setItem(key, value ? 'true' : 'false');
  } catch {
    /* localStorage unavailable — fall through */
  }
};

export const useStackStore = create<StackStore>((set) => ({
  items: [],
  loading: true,
  error: null,
  scannedAt: null,

  filter: 'all',
  search: '',
  selectedId: null,
  sidebarCollapsed: readBoolFlag(SIDEBAR_KEY),
  hasSeenReveal: readBoolFlag(REVEAL_KEY),

  load: async () => {
    set({ loading: true, error: null });
    try {
      const result = await window.bridge.listStack({ includeDisabled: true });
      set({ items: result.items, scannedAt: result.scannedAt, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to read stack',
        loading: false,
      });
    }
  },

  rescan: async () => {
    set({ loading: true, error: null });
    try {
      const result = await window.bridge.rescan();
      set({ items: result.items, scannedAt: result.scannedAt, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Rescan failed',
        loading: false,
      });
    }
  },

  setFilter: (filter) => set({ filter }),
  setSearch: (search) => set({ search }),
  setSelected: (id) => set({ selectedId: id }),

  setSidebarCollapsed: (collapsed) => {
    writeBoolFlag(SIDEBAR_KEY, collapsed);
    set({ sidebarCollapsed: collapsed });
  },

  markRevealSeen: () => {
    writeBoolFlag(REVEAL_KEY, true);
    set({ hasSeenReveal: true });
  },
}));

/** Subscribe the store to STACK_UPDATED pushes from main. Call once on boot. */
export function bindStackUpdates(): () => void {
  return window.bridge.onStackUpdated((result) => {
    useStackStore.setState({
      items: result.items,
      scannedAt: result.scannedAt,
      loading: false,
      error: null,
    });
  });
}

/**
 * Derived selectors. Co-located so all read-from-store logic lives next to
 * the store definition — easier to reason about than scattering across hooks.
 */

export function getFilteredItems(state: StackStore): StackItem[] {
  const search = state.search.trim().toLowerCase();
  return state.items.filter((item) => {
    if (state.filter !== 'all' && item.category !== state.filter) return false;
    if (search) {
      const haystack = `${item.name}\n${item.description}\n${item.sourceRef ?? ''}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export function getCategoryCounts(items: StackItem[]): Record<StackCategory, number> {
  const counts: Record<StackCategory, number> = {
    mcp: 0,
    plugin: 0,
    skill: 0,
    agent: 0,
    command: 0,
  };
  for (const item of items) counts[item.category] += 1;
  return counts;
}
