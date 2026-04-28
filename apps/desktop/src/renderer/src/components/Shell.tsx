import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import { Banners } from './Banners';
import { CommandPalette } from './CommandPalette';
import { DiscoverView } from './DiscoverView';
import { ImportModal } from './ImportModal';
import { PrivacyModal } from './PrivacyModal';
import { SettingsPanel } from './SettingsPanel';
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
import { useImportStore } from '@/store/import';
import { useSettingsStore } from '@/store/settings';

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
  const claudeCodeDetected = useStackStore((s) => s.claudeCodeDetected);
  const rescan = useStackStore((s) => s.rescan);
  const view = useStackStore((s) => s.view);

  const openImport = useImportStore((s) => s.openModal);

  const settings = useSettingsStore((s) => s.settings);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const loadSettings = useSettingsStore((s) => s.load);
  const updateSettings = useSettingsStore((s) => s.update);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  // Boot: initial load + subscribe to push updates from main + load settings.
  useEffect(() => {
    void load();
    void loadSettings();
    const unsubscribe = bindStackUpdates();
    return unsubscribe;
  }, [load, loadSettings]);

  // Auto-show privacy modal once on first run.
  useEffect(() => {
    if (settingsLoaded && !settings.hasSeenPrivacyModal) {
      setPrivacyOpen(true);
    }
  }, [settingsLoaded, settings.hasSeenPrivacyModal]);

  // Rescan when window regains focus, when the user opted in via Settings.
  useEffect(() => {
    if (!settings.scanOnFocus) return;
    const onFocus = (): void => {
      void useStackStore.getState().rescan();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [settings.scanOnFocus]);

  // Global hotkeys.
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const isMod = event.metaKey || event.ctrlKey;

      if (isMod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (isMod && event.key.toLowerCase() === 'r') {
        event.preventDefault();
        void useStackStore.getState().rescan();
        return;
      }
      if (isMod && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        openImport();
        return;
      }
      if (isMod && event.key === ',') {
        event.preventDefault();
        setSettingsOpen(true);
        return;
      }
      if (event.key === 'Escape' && useStackStore.getState().selectedId) {
        useStackStore.getState().setSelected(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [openImport]);

  const filtered = useMemo(
    () => getFilteredItems({ items, filter, search } as never),
    [items, filter, search],
  );
  const counts = useMemo(() => getCategoryCounts(items), [items]);
  const selectedItem = useMemo(
    () => items.find((it) => it.id === selectedId) ?? null,
    [items, selectedId],
  );

  const showReveal =
    !hasSeenReveal && !loading && scannedAt !== null && !privacyOpen;
  const stackHasItems = items.length > 0;

  const closePrivacy = (): void => {
    setPrivacyOpen(false);
    if (!settings.hasSeenPrivacyModal) {
      void updateSettings({ hasSeenPrivacyModal: true });
    }
  };

  return (
    <div className="relative flex h-full w-full">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        onOpenImport={openImport}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <main className="flex h-full min-w-0 flex-1 flex-col">
        <Banners />

        {view === 'discover' ? (
          <DiscoverView />
        ) : (
          <>
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
              ) : !claudeCodeDetected ? (
                <EmptyState category="all" claudeCodeMissing onRescan={() => void rescan()} />
              ) : !stackHasItems ? (
                <EmptyState category="all" onImport={openImport} />
              ) : filtered.length === 0 ? (
                <EmptyState
                  category={filter === 'all' ? 'all' : filter}
                  filtered
                  onImport={openImport}
                />
              ) : (
                <StackGrid items={filtered} selectedId={selectedId} onSelect={setSelected} />
              )}
            </div>
          </>
        )}
      </main>

      <DetailPanel item={selectedItem} onClose={() => setSelected(null)} />

      <ImportModal />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onShowPrivacy={() => {
          setSettingsOpen(false);
          setPrivacyOpen(true);
        }}
      />
      <PrivacyModal open={privacyOpen} onClose={closePrivacy} />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onOpenImport={openImport}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenPrivacy={() => setPrivacyOpen(true)}
      />

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
