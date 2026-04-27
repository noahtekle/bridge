import { create } from 'zustand';
import type { StackCategory, StackItem } from '@bridge/core';

export type CategoryFilter = 'all' | StackCategory;

export interface MutationFailure {
  /** Brief one-line message shown in the failure banner. */
  message: string;
  /** Backup path the user can roll back from, when available. */
  backupPath?: string;
  /** Item id the failure relates to, for navigation. */
  itemId?: string;
}

interface StackStore {
  items: StackItem[];
  loading: boolean;
  error: string | null;
  scannedAt: number | null;
  claudeCodeDetected: boolean;

  filter: CategoryFilter;
  search: string;
  selectedId: string | null;
  sidebarCollapsed: boolean;
  hasSeenReveal: boolean;

  /** Set of item ids currently being mutated, so the UI can show pending state. */
  pendingIds: Set<string>;
  /** Latest failure to show in the global failure banner. Cleared by the user. */
  failure: MutationFailure | null;
  /** True when at least one mutation needs Claude Code restarted to take effect. */
  restartPending: boolean;

  load: () => Promise<void>;
  rescan: () => Promise<void>;
  setFilter: (filter: CategoryFilter) => void;
  setSearch: (search: string) => void;
  setSelected: (id: string | null) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  markRevealSeen: () => void;

  toggleItem: (item: StackItem, enabled: boolean) => Promise<void>;
  updateDescription: (item: StackItem, description: string) => Promise<void>;
  deleteItem: (item: StackItem) => Promise<void>;

  dismissFailure: () => void;
  acknowledgeRestart: () => void;
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

export const useStackStore = create<StackStore>((set, get) => ({
  items: [],
  loading: true,
  error: null,
  scannedAt: null,
  claudeCodeDetected: true,

  filter: 'all',
  search: '',
  selectedId: null,
  sidebarCollapsed: readBoolFlag(SIDEBAR_KEY),
  hasSeenReveal: readBoolFlag(REVEAL_KEY),

  pendingIds: new Set<string>(),
  failure: null,
  restartPending: false,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const result = await window.bridge.listStack({ includeDisabled: true });
      set({
        items: result.items,
        scannedAt: result.scannedAt,
        claudeCodeDetected: result.claudeCodeDetected,
        loading: false,
      });
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
      set({
        items: result.items,
        scannedAt: result.scannedAt,
        claudeCodeDetected: result.claudeCodeDetected,
        loading: false,
      });
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

  toggleItem: async (item, enabled) => {
    await runMutation(set, item, () => window.bridge.toggleItem({ id: item.id, enabled }));
  },

  updateDescription: async (item, description) => {
    await runMutation(set, item, () => window.bridge.updateItem({ id: item.id, description }));
  },

  deleteItem: async (item) => {
    await runMutation(set, item, () => window.bridge.deleteItem({ id: item.id }));
    // Drop selection if the deleted item was open in the detail panel.
    if (get().selectedId === item.id) set({ selectedId: null });
  },

  dismissFailure: () => set({ failure: null }),
  acknowledgeRestart: () => set({ restartPending: false }),
}));

type StackSet = (
  partial:
    | Partial<StackStore>
    | ((state: StackStore) => Partial<StackStore>),
) => void;

async function runMutation(
  set: StackSet,
  item: StackItem,
  fn: () => Promise<{ ok: boolean; error?: string; backupPath?: string; needsRestart: boolean }>,
): Promise<void> {
  // Mark pending. Use a fresh Set so React re-renders consumers.
  set((state) => {
    const pending = new Set(state.pendingIds);
    pending.add(item.id);
    return { pendingIds: pending };
  });

  try {
    const result = await fn();
    if (!result.ok) {
      set({
        failure: {
          message: result.error ?? 'Could not save the change',
          backupPath: result.backupPath,
          itemId: item.id,
        },
      });
      return;
    }
    if (result.needsRestart) {
      set({ restartPending: true });
    }
  } catch (err) {
    set({
      failure: {
        message: err instanceof Error ? err.message : 'Mutation failed',
        itemId: item.id,
      },
    });
  } finally {
    set((state) => {
      const pending = new Set(state.pendingIds);
      pending.delete(item.id);
      return { pendingIds: pending };
    });
  }
}

/** Subscribe the store to STACK_UPDATED pushes from main. Call once on boot. */
export function bindStackUpdates(): () => void {
  return window.bridge.onStackUpdated((result) => {
    useStackStore.setState({
      items: result.items,
      scannedAt: result.scannedAt,
      claudeCodeDetected: result.claudeCodeDetected,
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
