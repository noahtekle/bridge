import { ExternalLink, Github, RefreshCw } from 'lucide-react';

import type { StackCategory } from '@bridge/core';

import { CategoryIcon, CATEGORY_LABELS_SINGULAR } from './CategoryIcon';

interface EmptyStateProps {
  /** When `'all'`, shows a generic "stack is empty" state. */
  category: StackCategory | 'all';
  /** When `true`, the stack itself is non-empty but the active filter+search returned nothing. */
  filtered?: boolean;
  /** When `true`, ~/.claude/ doesn't exist — Claude Code probably isn't installed. */
  claudeCodeMissing?: boolean;
  onImport?: () => void;
  onRescan?: () => void;
}

export function EmptyState({
  category,
  filtered,
  claudeCodeMissing,
  onImport,
  onRescan,
}: EmptyStateProps): JSX.Element {
  if (claudeCodeMissing) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
        <div className="text-md font-medium text-text">Bridge couldn&apos;t find Claude Code</div>
        <p className="mt-2 max-w-md text-sm text-muted">
          Neither <span className="font-mono text-xs">~/.claude/</span> nor{' '}
          <span className="font-mono text-xs">~/.claude.json</span> exists on this machine. Bridge
          works alongside Claude Code — install it first, then come back.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <a
            href="https://docs.claude.com/en/docs/claude-code/overview"
            target="_blank"
            rel="noreferrer"
            className="flex cursor-pointer items-center gap-1.5 rounded-md bg-text px-4 py-1.5 text-sm font-medium text-bg transition-colors duration-fast hover:bg-text/90"
          >
            Install Claude Code
            <ExternalLink className="h-3 w-3" strokeWidth={2} />
          </a>
          {onRescan && (
            <button
              type="button"
              onClick={onRescan}
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-muted transition-colors duration-fast hover:bg-surface-raised hover:text-text"
            >
              <RefreshCw className="h-3 w-3" strokeWidth={1.75} />
              Rescan
            </button>
          )}
        </div>
      </div>
    );
  }

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
          Bridge couldn&apos;t find any MCPs, Skills, Agents, Plugins, or slash commands in{' '}
          <span className="font-mono text-xs">~/.claude/</span>.
        </p>
        {onImport && (
          <button
            type="button"
            onClick={onImport}
            className="mt-5 flex cursor-pointer items-center gap-1.5 rounded-md bg-text px-4 py-1.5 text-sm font-medium text-bg transition-colors duration-fast hover:bg-text/90"
          >
            <Github className="h-3.5 w-3.5" strokeWidth={1.75} />
            Import from GitHub
          </button>
        )}
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
      </p>
      {onImport && (
        <button
          type="button"
          onClick={onImport}
          className="mt-4 flex cursor-pointer items-center gap-1.5 rounded-md bg-text px-4 py-1.5 text-sm font-medium text-bg transition-colors duration-fast hover:bg-text/90"
        >
          <Github className="h-3.5 w-3.5" strokeWidth={1.75} />
          Import from GitHub
        </button>
      )}
    </div>
  );
}
