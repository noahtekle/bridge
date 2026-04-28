import { AnimatePresence, motion } from 'framer-motion';
import { Compass, Search, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { cn } from '@/lib/utils';
import {
  CategoryIcon,
  CATEGORIES_ORDER,
  CATEGORY_LABELS,
  CATEGORY_LABELS_SINGULAR,
} from './CategoryIcon';
import { DiscoverCard } from './DiscoverCard';
import {
  type DiscoverFilter,
  getFilteredDiscover,
  useDiscoverStore,
} from '@/store/discover';

export function DiscoverView(): JSX.Element {
  const entries = useDiscoverStore((s) => s.entries);
  const filter = useDiscoverStore((s) => s.filter);
  const search = useDiscoverStore((s) => s.search);
  const setFilter = useDiscoverStore((s) => s.setFilter);
  const setSearch = useDiscoverStore((s) => s.setSearch);
  const loading = useDiscoverStore((s) => s.loading);
  const load = useDiscoverStore((s) => s.load);

  useEffect(() => {
    if (entries.length === 0 && !loading) void load();
  }, [entries.length, loading, load]);

  const filtered = useMemo(
    () => getFilteredDiscover({ entries, filter, search } as never),
    [entries, filter, search],
  );

  const counts = useMemo(() => {
    const c: Record<DiscoverFilter, number> = {
      all: entries.length,
      mcp: 0,
      plugin: 0,
      skill: 0,
      agent: 0,
      command: 0,
      hook: 0,
    };
    for (const entry of entries) c[entry.category] += 1;
    return c;
  }, [entries]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="space-y-4 border-b border-border-subtle px-6 py-5">
        <div className="flex items-start gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#A855F7]">
            <Compass className="h-5 w-5 text-white" strokeWidth={1.75} />
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-text">Discover</h1>
            <p className="text-sm text-muted">
              Hand-picked Claude Code repos. One click installs them via the GitHub import flow you
              already know.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className={cn(
              'flex h-9 flex-1 min-w-[280px] items-center gap-2 rounded-md border border-border bg-surface px-3',
              'transition-colors duration-fast focus-within:border-accent/60',
            )}
          >
            <Search className="h-4 w-4 text-subtle" strokeWidth={1.75} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, description, or maintainer..."
              className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-subtle"
              aria-label="Search discover"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="grid h-5 w-5 cursor-pointer place-items-center rounded text-subtle hover:text-text"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterChip
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label="All"
            count={counts.all}
          />
          {CATEGORIES_ORDER.map((cat) => (
            <FilterChip
              key={cat}
              active={filter === cat}
              onClick={() => setFilter(cat)}
              label={CATEGORY_LABELS[cat]}
              count={counts[cat]}
              icon={<CategoryIcon category={cat} size={14} />}
            />
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {loading && entries.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Loading curated list…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyDiscover filter={filter} hasSearch={search.length > 0} onClear={() => {
            setFilter('all');
            setSearch('');
          }} />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((entry) => (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
                >
                  <DiscoverCard entry={entry} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: React.ReactNode;
}

function FilterChip({ active, onClick, label, count, icon }: FilterChipProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors duration-fast',
        active
          ? 'border-accent/60 bg-accent/15 text-accent'
          : 'border-border bg-surface text-muted hover:bg-surface-raised hover:text-text',
      )}
    >
      {icon}
      <span>{label}</span>
      <span className={cn('tabular-nums', active ? 'text-accent/80' : 'text-subtle')}>
        {count}
      </span>
    </button>
  );
}

function EmptyDiscover({
  filter,
  hasSearch,
  onClear,
}: {
  filter: DiscoverFilter;
  hasSearch: boolean;
  onClear: () => void;
}): JSX.Element {
  const noun =
    filter === 'all' ? 'curated entries' : `${CATEGORY_LABELS_SINGULAR[filter].toLowerCase()}s`;
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
      <div className="text-md font-medium text-text">No {noun} match</div>
      <p className="mt-1 max-w-xs text-sm text-muted">
        {hasSearch
          ? 'Try a different query or clear the filter.'
          : 'No curated entries in this category yet.'}
      </p>
      {(hasSearch || filter !== 'all') && (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 cursor-pointer rounded-md px-3 py-1.5 text-sm text-muted transition-colors duration-fast hover:bg-surface-raised hover:text-text"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
