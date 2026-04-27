import { useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';

import { Sidebar } from './Sidebar';
import { SearchBar } from './SearchBar';
import { StackGrid } from './StackGrid';
import { DetailPanel } from './DetailPanel';
import { EmptyState } from './EmptyState';
import { StackReveal } from './StackReveal';
import { CATEGORY_LABELS } from './CategoryIcon';
import {
  bindStackUpdates,
  getCategoryCounts,
  getFilteredItems,
  useStackStore,
} from '@/store/stack';

export function Shell(): JSX.Element {
  const items = useStackStore((s) => s.items);
  const filter = useStackStore((s) => s.filter);
  const search = useStackStore((s) => s.search);
  const selectedId = useStackStore((s) => s.selectedId);
  const setSelected = useStackStore((s) => s.setSelected);
  const sidebarCollapsed = useStackStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useStackStore((s) => s.setSidebarCollapsed);
  const hasSeenReveal = useStackStore((s) => s.hasSeenReveal);
  const markRevealSeen = useStackStore((s) => s.markRevealSeen);
  const loading = useStackStore((s) => s.loading);
  const load = useStackStore((s) => s.load);
  const scannedAt = useStackStore((s) => s.scannedAt);

  // Boot: initial load + subscribe to push updates from main.
  useEffect(() => {
    void load();
    const unsubscribe = bindStackUpdates();
    return unsubscribe;
  }, [load]);

  // Cmd/Ctrl-R triggers a manual rescan.
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const isMod = event.metaKey || event.ctrlKey;
      if (isMod && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        void useStackStore.getState().rescan();
      }
      if (event.key === 'Escape' && useStackStore.getState().selectedId) {
        useStackStore.getState().setSelected(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filtered = useMemo(
    () => getFilteredItems({ items, filter, search } as never),
    [items, filter, search],
  );
  const counts = useMemo(() => getCategoryCounts(items), [items]);
  const selectedItem = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId],
  );

  const showReveal = !hasSeenReveal && !loading && scannedAt !== null;
  const stackHasItems = items.length > 0;

  return (
    <div className="relative flex h-full w-full">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className="flex h-full min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border-subtle px-6 py-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight text-text">
              {filter === 'all' ? 'Your stack' : CATEGORY_LABELS[filter]}
            </h1>
            <p className="text-xs text-subtle">
              {filtered.length} of {items.length} items
              {scannedAt && ` · scanned ${formatTimestamp(scannedAt)}`}
            </p>
          </div>
          <div className="w-[420px] max-w-full">
            <SearchBar />
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto p-6">
          {loading && !stackHasItems ? (
            <ScanningState />
          ) : !stackHasItems ? (
            <EmptyState category="all" />
          ) : filtered.length === 0 ? (
            <EmptyState category={filter === 'all' ? 'all' : filter} filtered />
          ) : (
            <StackGrid items={filtered} selectedId={selectedId} onSelect={setSelected} />
          )}
        </div>
      </main>

      <DetailPanel item={selectedItem} onClose={() => setSelected(null)} />

      <AnimatePresence>
        {showReveal && (
          <StackReveal
            key="reveal"
            counts={counts}
            onContinue={markRevealSeen}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ScanningState(): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="text-md text-muted">Scanning your stack…</div>
      <p className="mt-1 max-w-xs text-sm text-subtle">
        Reading <span className="font-mono text-xs">~/.claude/</span> — usually under a second.
      </p>
    </div>
  );
}

function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
