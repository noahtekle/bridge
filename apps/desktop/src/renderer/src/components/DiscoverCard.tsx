import { motion } from 'framer-motion';
import { ArrowRight, ExternalLink } from 'lucide-react';

import type { DiscoverEntry } from '@bridge/core';

import { cn } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { useImportStore } from '@/store/import';

interface DiscoverCardProps {
  entry: DiscoverEntry;
}

export function DiscoverCard({ entry }: DiscoverCardProps): JSX.Element {
  const openWithUrl = useImportStore((s) => s.openModalWithUrl);

  const handleInstall = (e: React.MouseEvent): void => {
    e.stopPropagation();
    void openWithUrl(entry.repoUrl, entry.subPath);
  };

  const handleOpenRepo = (e: React.MouseEvent): void => {
    e.stopPropagation();
    // Bridge's main process intercepts http(s) links and opens them in the
    // OS browser via shell.openExternal — so a regular <a> works correctly.
  };

  return (
    <motion.article
      layout
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="group flex flex-col rounded-lg border border-border bg-surface p-4 transition-colors duration-fast ease-out hover:bg-surface-raised hover:border-border-subtle"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <CategoryIcon category={entry.category} size={32} />
        <a
          href={entry.repoUrl}
          target="_blank"
          rel="noreferrer"
          onClick={handleOpenRepo}
          className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-subtle opacity-0 transition-all duration-fast hover:bg-surface hover:text-text group-hover:opacity-100"
          title="View on GitHub"
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
        </a>
      </div>

      <h3 className="text-md font-semibold tracking-tight text-text">{entry.name}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted">{entry.description}</p>

      <p className="mt-2 line-clamp-2 text-xs italic text-subtle">
        Why: {entry.whyRecommended}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <CategoryPill category={entry.category} />
        <span className="inline-flex items-center rounded-full bg-surface-raised px-2 py-0.5 font-mono text-[10px] text-muted">
          {entry.maintainer}
        </span>
      </div>

      <button
        type="button"
        onClick={handleInstall}
        className="mt-4 flex cursor-pointer items-center justify-center gap-1.5 rounded-md bg-text px-3 py-1.5 text-sm font-medium text-bg transition-colors duration-fast hover:bg-text/90"
      >
        Install with Bridge
        <ArrowRight className="h-3 w-3" strokeWidth={2} />
      </button>
    </motion.article>
  );
}

const CATEGORY_LABEL: Record<DiscoverEntry['category'], string> = {
  mcp: 'MCP',
  plugin: 'Plugin',
  skill: 'Skill',
  agent: 'Agent',
  command: 'Command',
  hook: 'Hook',
};

const CATEGORY_PILL_COLOR: Record<DiscoverEntry['category'], string> = {
  mcp: 'bg-[#1E3A8A] text-[#93c5fd]',
  plugin: 'bg-[#581C87] text-[#d8b4fe]',
  skill: 'bg-[#78350F] text-[#fcd34d]',
  agent: 'bg-[#831843] text-[#f9a8d4]',
  command: 'bg-[#155E75] text-[#67e8f9]',
  hook: 'bg-[#064E3B] text-[#6ee7b7]',
};

function CategoryPill({ category }: { category: DiscoverEntry['category'] }): JSX.Element {
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
