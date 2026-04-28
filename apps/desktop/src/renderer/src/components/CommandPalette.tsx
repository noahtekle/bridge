import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Boxes,
  Compass,
  Github,
  Settings as SettingsIcon,
  RefreshCw,
  Shield,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo } from 'react';

import type { StackItem } from '@bridge/core';

import { CategoryIcon } from './CategoryIcon';
import { useStackStore } from '@/store/stack';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenImport: () => void;
  onOpenSettings: () => void;
  onOpenPrivacy: () => void;
}

/**
 * Cmd-K palette. Searches across the user's stack and exposes top-level
 * actions ("Import from GitHub", "Settings", "Rescan", "Privacy"). Selecting
 * an item opens it in the detail panel; selecting an action runs it.
 *
 * cmdk handles keyboard nav + fuzzy match — we just supply the items.
 */
export function CommandPalette({
  open,
  onClose,
  onOpenImport,
  onOpenSettings,
  onOpenPrivacy,
}: CommandPaletteProps): JSX.Element {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <Body
          onClose={onClose}
          onOpenImport={onOpenImport}
          onOpenSettings={onOpenSettings}
          onOpenPrivacy={onOpenPrivacy}
        />
      )}
    </AnimatePresence>
  );
}

interface BodyProps {
  onClose: () => void;
  onOpenImport: () => void;
  onOpenSettings: () => void;
  onOpenPrivacy: () => void;
}

function Body({
  onClose,
  onOpenImport,
  onOpenSettings,
  onOpenPrivacy,
}: BodyProps): JSX.Element {
  const items = useStackStore((s) => s.items);
  const setSelected = useStackStore((s) => s.setSelected);
  const rescan = useStackStore((s) => s.rescan);
  const toggleItem = useStackStore((s) => s.toggleItem);
  const deleteItem = useStackStore((s) => s.deleteItem);
  const setView = useStackStore((s) => s.setView);
  const setFilter = useStackStore((s) => s.setFilter);

  const sortedItems = useMemo(() => {
    // Active items first, then disabled, then errored.
    return [...items].sort((a, b) => {
      const order = (s: StackItem['status']): number =>
        s === 'active' ? 0 : s === 'disabled' ? 1 : 2;
      return order(a.status) - order(b.status);
    });
  }, [items]);

  const closeAndRun = (fn: () => void): void => {
    onClose();
    fn();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="absolute inset-0 z-50 flex items-start justify-center bg-black/60 px-6 pt-[10vh]"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 6, opacity: 0 }}
        transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[640px] overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/50"
        role="dialog"
        aria-label="Command palette"
      >
        <Command label="Bridge command palette">
          <div className="border-b border-border-subtle px-4 py-3">
            <Command.Input
              placeholder="Search stack or run an action…"
              className="w-full bg-transparent text-sm text-text outline-none placeholder:text-subtle"
              autoFocus
            />
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="px-3 py-8 text-center text-sm text-subtle">
              Nothing matches.
            </Command.Empty>

            <Command.Group
              heading="Actions"
              className="text-[10px] font-medium uppercase tracking-[0.14em] text-subtle [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2"
            >
              <PaletteAction
                icon={<Github className="h-3.5 w-3.5" strokeWidth={1.75} />}
                label="Import from GitHub"
                shortcut="N"
                onSelect={() => closeAndRun(onOpenImport)}
              />
              <PaletteAction
                icon={<Compass className="h-3.5 w-3.5" strokeWidth={1.75} />}
                label="Browse Discover"
                onSelect={() => closeAndRun(() => setView('discover'))}
              />
              <PaletteAction
                icon={<Boxes className="h-3.5 w-3.5" strokeWidth={1.75} />}
                label="Show your stack"
                onSelect={() => closeAndRun(() => setFilter('all'))}
              />
              <PaletteAction
                icon={<RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />}
                label="Rescan stack"
                shortcut="R"
                onSelect={() => closeAndRun(() => void rescan())}
              />
              <PaletteAction
                icon={<SettingsIcon className="h-3.5 w-3.5" strokeWidth={1.75} />}
                label="Open Settings"
                shortcut=","
                onSelect={() => closeAndRun(onOpenSettings)}
              />
              <PaletteAction
                icon={<Shield className="h-3.5 w-3.5" strokeWidth={1.75} />}
                label="View privacy summary"
                onSelect={() => closeAndRun(onOpenPrivacy)}
              />
            </Command.Group>

            {sortedItems.length > 0 && (
              <Command.Group
                heading="Stack"
                className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-subtle [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2"
              >
                {sortedItems.map((item) => (
                  <Command.Item
                    key={`open-${item.id}`}
                    value={`${item.name} ${item.description} ${item.category}`}
                    onSelect={() =>
                      closeAndRun(() => {
                        setSelected(item.id);
                      })
                    }
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-text aria-selected:bg-surface-raised data-[selected=true]:bg-surface-raised"
                  >
                    <CategoryIcon
                      category={item.category}
                      size={20}
                      flat={item.status !== 'active'}
                    />
                    <span className="flex-1 truncate">{item.name}</span>
                    <span className="text-xs text-subtle">{item.category}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {sortedItems.length > 0 && (
              <Command.Group
                heading="Quick toggle"
                className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-subtle [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2"
              >
                {sortedItems.slice(0, 30).map((item) => (
                  <Command.Item
                    key={`toggle-${item.id}`}
                    value={`toggle ${item.name}`}
                    onSelect={() =>
                      closeAndRun(() => {
                        void toggleItem(item, item.status !== 'active');
                      })
                    }
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-text aria-selected:bg-surface-raised data-[selected=true]:bg-surface-raised"
                  >
                    <Boxes className="h-3.5 w-3.5 text-subtle" strokeWidth={1.75} />
                    <span className="flex-1 truncate">
                      {item.status === 'active' ? 'Disable' : 'Enable'} {item.name}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {sortedItems.length > 0 && (
              <Command.Group
                heading="Delete"
                className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-subtle [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2"
              >
                {sortedItems.slice(0, 30).map((item) => (
                  <Command.Item
                    key={`delete-${item.id}`}
                    value={`delete ${item.name}`}
                    onSelect={() =>
                      closeAndRun(() => {
                        if (confirm(`Delete ${item.name}? Backup is kept.`)) {
                          void deleteItem(item);
                        }
                      })
                    }
                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-error aria-selected:bg-error/10 data-[selected=true]:bg-error/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span className="flex-1 truncate">Delete {item.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          <div className="flex items-center justify-between border-t border-border-subtle px-3 py-2 text-[10px] text-subtle">
            <span>↑↓ navigate · ↵ select · Esc close</span>
            <span>Bridge</span>
          </div>
        </Command>
      </motion.div>
    </motion.div>
  );
}

function PaletteAction({
  icon,
  label,
  shortcut,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  onSelect: () => void;
}): JSX.Element {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-text aria-selected:bg-surface-raised data-[selected=true]:bg-surface-raised"
    >
      <span className="text-subtle">{icon}</span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <kbd className="rounded border border-border-subtle bg-surface-raised px-1.5 text-[10px] tabular-nums text-subtle">
          ⌘{shortcut}
        </kbd>
      )}
    </Command.Item>
  );
}
