import { motion } from 'framer-motion';
import { CircleAlert } from 'lucide-react';

import type { StackItem } from '@bridge/core';

import { cn } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';

interface StackCardProps {
  item: StackItem;
  selected: boolean;
  onSelect: () => void;
}

/**
 * The "Balanced" card variant from the spec. Read-only in Week 1 — toggle
 * is rendered but disabled. Real toggle action lives on the detail panel
 * starting in Week 2.
 */
export function StackCard({ item, selected, onSelect }: StackCardProps): JSX.Element {
  const isDisabled = item.status === 'disabled';
  const isError = item.status === 'error';

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

        <span
          className={cn(
            'flex h-[18px] w-8 items-center rounded-full p-[2px] transition-colors duration-fast',
            isError
              ? 'justify-center bg-error/15'
              : isDisabled
                ? 'justify-start bg-disabled'
                : 'justify-end bg-success',
          )}
          role="presentation"
        >
          {isError ? (
            <CircleAlert className="h-3 w-3 text-error" strokeWidth={2} />
          ) : (
            <span
              className={cn(
                'h-[14px] w-[14px] rounded-full',
                isDisabled ? 'bg-subtle' : 'bg-white',
              )}
            />
          )}
        </span>
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
      </div>
    </motion.button>
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
  const label = sourceLabel(item);
  return (
    <span className="inline-flex items-center rounded-full bg-surface-raised px-2 py-0.5 text-[10px] text-muted">
      {label}
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
