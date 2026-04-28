import type { StackCategory } from '@bridge/core';

import { CategoryIcon, CATEGORY_LABELS_SINGULAR } from './CategoryIcon';

interface EmptyStateProps {
  /** When `'all'`, shows a generic "stack is empty" state. */
  category: StackCategory | 'all';
  /** When `true`, the stack itself is non-empty but the active filter+search returned nothing. */
  filtered?: boolean;
}

export function EmptyState({ category, filtered }: EmptyStateProps): JSX.Element {
  if (filtered) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
        <div className="text-md font-medium text-text">No matches</div>
        <p className="mt-1 max-w-xs text-sm text-muted">
          Nothing in this category matches your search. Try a different query or clear the filter.
        </p>
      </div>
    );
  }

  if (category === 'all') {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
        <div className="text-md font-medium text-text">No items in your stack yet</div>
        <p className="mt-1 max-w-md text-sm text-muted">
          Bridge couldn&apos;t find any MCPs, Skills, Agents, Plugins, or slash commands in
          <span className="font-mono text-xs"> ~/.claude/</span>. Once you add some via Claude Code,
          they&apos;ll show up here.
        </p>
      </div>
    );
  }

  const label = CATEGORY_LABELS_SINGULAR[category];

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <CategoryIcon category={category} size={56} className="opacity-80" />
      <div className="mt-4 text-md font-medium text-text">No {label.toLowerCase()}s yet</div>
      <p className="mt-1 max-w-xs text-sm text-muted">
        Add your first {label.toLowerCase()} from a folder or import one from GitHub.
        <br />
        <span className="text-subtle">(GitHub import lands in Week 3.)</span>
      </p>
    </div>
  );
}
