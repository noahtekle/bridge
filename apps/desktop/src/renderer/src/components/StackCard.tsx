import { motion } from 'framer-motion';
import { CircleAlert, Loader2 } from 'lucide-react';

import type { StackItem } from '@bridge/core';

import { cn } from '@/lib/utils';
import { useStackStore } from '@/store/stack';
import { CategoryIcon } from './CategoryIcon';

interface StackCardProps {
  item: StackItem;
  selected: boolean;
  onSelect: () => void;
}

/**
 * The "Balanced" card variant from the spec. Click body → open detail panel.
 * Click toggle → flip status (Week 2). Pending state shown via spinner inside
 * the toggle while the mutation is in flight.
 */
export function StackCard({ item, selected, onSelect }: StackCardProps): JSX.Element {
  const isDisabled = item.status === 'disabled';
  const isPending = useStackStore((s) => s.pendingIds.has(item.id));
  const toggleItem = useStackStore((s) => s.toggleItem);

  const toggleLocked = isToggleLocked(item);

  const handleToggleClick = (event: React.MouseEvent): void => {
    event.stopPropagation();
    if (toggleLocked || isPending) return;
    void toggleItem(item, item.status !== 'active');
  };

  return (
    <motion.button
      type="button"
      layout
      onClick={onSelect}
      whileTap={{ scale: 0.995 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'group flex w-full cursor-pointer flex-col rounded-lg border bg-surface p-4 text-left transition-colors duration-fast ease-out',
        'hover:bg-surface-raised',
        selected
          ? 'border-accent/60 ring-1 ring-accent/40'
          : 'border-border hover:border-border-subtle',
        isDisabled && 'opacity-60',
      )}
      aria-label={item.name}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <CategoryIcon category={item.category} size={32} flat={isDisabled} />

        <Toggle
          status={item.status}
          pending={isPending}
          locked={toggleLocked}
          lockedReason={lockedReasonFor(item)}
          onClick={handleToggleClick}
        />
      </div>

      <div className="text-md font-semibold tracking-tight text-text">{item.name}</div>
      <div
        className={cn(
          'mt-1 text-sm text-muted',
          'line-clamp-2',
          !item.description && 'italic text-subtle',
        )}
      >
        {item.description || 'No description.'}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <CategoryPill category={item.category} />
        <SourcePill item={item} />
        {item.needsRestart && <RestartPill />}
      </div>
    </motion.button>
  );
}

interface ToggleProps {
  status: StackItem['status'];
  pending: boolean;
  locked: boolean;
  lockedReason?: string;
  onClick: (event: React.MouseEvent) => void;
}

function Toggle({ status, pending, locked, lockedReason, onClick }: ToggleProps): JSX.Element {
  const isError = status === 'error';
  const isDisabled = status === 'disabled';
  const interactive = !locked && !pending;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={status === 'active'}
      aria-disabled={!interactive}
      title={locked ? lockedReason : status === 'active' ? 'Toggle off' : 'Toggle on'}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        'flex h-[18px] w-8 items-center rounded-full p-[2px] transition-colors duration-fast',
        interactive ? 'cursor-pointer' : 'cursor-not-allowed',
        isError
          ? 'justify-center bg-error/15'
          : isDisabled
            ? 'justify-start bg-disabled'
            : 'justify-end bg-success',
        locked && 'opacity-50',
      )}
    >
      {pending ? (
        <Loader2 className="h-3 w-3 animate-spin text-white" strokeWidth={2.25} />
      ) : isError ? (
        <CircleAlert className="h-3 w-3 text-error" strokeWidth={2} />
      ) : (
        <span
          className={cn(
            'h-[14px] w-[14px] rounded-full',
            isDisabled ? 'bg-subtle' : 'bg-white',
          )}
        />
      )}
    </button>
  );
}

const CATEGORY_LABEL: Record<StackItem['category'], string> = {
  mcp: 'MCP',
  plugin: 'Plugin',
  skill: 'Skill',
  agent: 'Agent',
  command: 'Command',
};

const CATEGORY_PILL_COLOR: Record<StackItem['category'], string> = {
  mcp: 'bg-[#1E3A8A] text-[#93c5fd]',
  plugin: 'bg-[#581C87] text-[#d8b4fe]',
  skill: 'bg-[#78350F] text-[#fcd34d]',
  agent: 'bg-[#831843] text-[#f9a8d4]',
  command: 'bg-[#155E75] text-[#67e8f9]',
};

function CategoryPill({ category }: { category: StackItem['category'] }): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide',
        CATEGORY_PILL_COLOR[category],
      )}
    >
      {CATEGORY_LABEL[category]}
    </span>
  );
}

function SourcePill({ item }: { item: StackItem }): JSX.Element {
  return (
    <span className="inline-flex items-center rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-muted">
      {sourceLabel(item)}
    </span>
  );
}

function RestartPill(): JSX.Element {
  return (
    <span className="inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
      restart
    </span>
  );
}

function sourceLabel(item: StackItem): string {
  if (item.source === 'official') return 'official';
  if (item.source === 'github') return 'github';
  if (item.source === 'plugin') {
    const ref = typeof item.metadata.parentPlugin === 'string' ? item.metadata.parentPlugin : null;
    if (ref) {
      const at = ref.lastIndexOf('@');
      return at >= 0 ? ref.slice(at + 1) : ref;
    }
    return 'plugin';
  }
  return 'user';
}

/**
 * Some items can't be toggled directly:
 *  - plugin-bundled skills (managed by the parent plugin)
 *  - items in 'error' state (state mismatch — fix the underlying issue first)
 */
function isToggleLocked(item: StackItem): boolean {
  if (item.status === 'error') return true;
  if (item.metadata.isPluginBundled === true) return true;
  return false;
}

function lockedReasonFor(item: StackItem): string | undefined {
  if (item.status === 'error') return 'State mismatch — see detail panel for the cause.';
  if (item.metadata.isPluginBundled === true) {
    return 'This skill is bundled with its plugin — toggle the parent plugin to enable/disable.';
  }
  return undefined;
}
