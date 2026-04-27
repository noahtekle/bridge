import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, FileText, Folder, X } from 'lucide-react';

import type { StackItem } from '@bridge/core';

import { cn } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';

interface DetailPanelProps {
  item: StackItem | null;
  onClose: () => void;
}

export function DetailPanel({ item, onClose }: DetailPanelProps): JSX.Element {
  return (
    <AnimatePresence>
      {item && <Panel key={item.id} item={item} onClose={onClose} />}
    </AnimatePresence>
  );
}

function Panel({ item, onClose }: { item: StackItem; onClose: () => void }): JSX.Element {
  const isDisabled = item.status === 'disabled';
  const isError = item.status === 'error';

  return (
    <motion.aside
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
      className="absolute right-0 top-0 z-10 flex h-full w-[420px] flex-col border-l border-border-subtle bg-surface shadow-2xl shadow-black/30"
      role="dialog"
      aria-label={`${item.name} details`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border-subtle p-5">
        <div className="flex flex-1 items-start gap-3">
          <CategoryIcon category={item.category} size={40} flat={isDisabled} />
          <div className="min-w-0 flex-1">
            <div className="text-md font-semibold tracking-tight text-text">{item.name}</div>
            <div className="mt-0.5 text-xs uppercase tracking-wider text-subtle">
              {labelFor(item)}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail panel"
          className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted transition-colors duration-fast hover:bg-surface-raised hover:text-text"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </header>

      {isError && (
        <div className="border-b border-border-subtle bg-error/10 px-5 py-3 text-sm text-error">
          <CircleAlert className="mr-1 inline h-3.5 w-3.5" strokeWidth={2} />
          State mismatch — settings.json and installed_plugins.json don&apos;t agree on this item.
        </div>
      )}

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <Section title="Description">
          {item.description ? (
            <p className="text-sm leading-relaxed text-muted">{item.description}</p>
          ) : (
            <p className="text-sm italic text-subtle">
              No description. (You&apos;ll be able to add your own in Week 3.)
            </p>
          )}
        </Section>

        <Section title="Source">
          <DetailRow label="Type" value={labelFor(item)} />
          <DetailRow label="Source" value={item.source} mono />
          {item.sourceRef && <DetailRow label="Reference" value={item.sourceRef} mono />}
          {item.metadata.version !== undefined &&
            typeof item.metadata.version === 'string' && (
              <DetailRow label="Version" value={item.metadata.version} mono />
            )}
        </Section>

        <Section title="Status">
          <DetailRow
            label="State"
            value={
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  isDisabled
                    ? 'bg-disabled/40 text-muted'
                    : isError
                      ? 'bg-error/15 text-error'
                      : 'bg-success/15 text-success',
                )}
              >
                {isError ? 'error' : isDisabled ? 'disabled' : 'active'}
              </span>
            }
          />
          {item.needsRestart && <DetailRow label="Restart needed" value="yes" mono />}
        </Section>

        {item.filePath && (
          <Section title="On disk">
            <div className="rounded-md border border-border bg-bg p-2 font-mono text-[11px] leading-relaxed text-muted">
              <Folder className="mr-1 inline h-3 w-3" strokeWidth={1.75} />
              {item.filePath}
            </div>
          </Section>
        )}

        <Section title="Config">
          <div className="rounded-md border border-border bg-bg p-2 font-mono text-[11px] leading-relaxed text-muted">
            <FileText className="mr-1 inline h-3 w-3" strokeWidth={1.75} />
            {item.configPath.file}
            {item.configPath.jsonPath && (
              <span className="text-subtle"> @ {item.configPath.jsonPath}</span>
            )}
          </div>
        </Section>
      </div>

      <footer className="border-t border-border-subtle px-5 py-3 text-xs text-subtle">
        Read-only in Week 1. Toggle, edit, and delete actions ship in Week 2.
      </footer>
    </motion.aside>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="space-y-2">
      <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">{title}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className={cn('text-right text-text', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  );
}

function labelFor(item: StackItem): string {
  switch (item.category) {
    case 'mcp':
      return 'MCP';
    case 'plugin':
      return 'Plugin';
    case 'skill':
      return 'Skill';
    case 'agent':
      return 'Agent';
    case 'command':
      return 'Slash command';
  }
}
