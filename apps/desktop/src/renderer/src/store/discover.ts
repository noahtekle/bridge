import { create } from 'zustand';
import type { DiscoverEntry, StackCategory } from '@bridge/core';

export type DiscoverFilter = 'all' | StackCategory;

interface DiscoverStore {
  entries: DiscoverEntry[];
  loading: boolean;
  error: string | null;

  filter: DiscoverFilter;
  search: string;

  load: () => Promise<void>;
  setFilter: (filter: DiscoverFilter) => void;
  setSearch: (search: string) => void;
}

export const useDiscoverStore = create<DiscoverStore>((set) => ({
  entries: [],
  loading: false,
  error: null,
  filter: 'all',
  search: '',

  load: async () => {
    set({ loading: true, error: null });
    try {
      const entries = await window.bridge.getDiscoverList();
      set({ entries, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Could not load discover list',
      });
    }
  },

  setFilter: (filter) => set({ filter }),
  setSearch: (search) => set({ search }),
}));

export function getFilteredDiscover(state: DiscoverStore): DiscoverEntry[] {
  const search = state.search.trim().toLowerCase();
  return state.entries.filter((entry) => {
    if (state.filter !== 'all' && entry.category !== state.filter) return false;
    if (search) {
      const haystack =
        `${entry.name}\n${entry.description}\n${entry.whyRecommended}\n${entry.maintainer}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}
