import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, FileText, Folder, Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { StackItem } from '@bridge/core';

import { cn } from '@/lib/utils';
import { useStackStore } from '@/store/stack';
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
        <DescriptionSection item={item} />

        {item.category === 'hook' && <HookTriggerSection item={item} />}

        <Section title={item.category === 'hook' ? 'Origin' : 'Source'}>
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

      <DeleteFooter item={item} />
    </motion.aside>
  );
}

function DescriptionSection({ item }: { item: StackItem }): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.description);
  const updateDescription = useStackStore((s) => s.updateDescription);
  const isPending = useStackStore((s) => s.pendingIds.has(item.id));

  // Reset draft when the user opens a different item.
  useEffect(() => {
    setDraft(item.description);
    setEditing(false);
  }, [item.id, item.description]);

  const canEdit =
    item.category === 'skill' ||
    item.category === 'agent' ||
    item.category === 'command' ||
    item.category === 'hook';

  if (editing) {
    return (
      <Section title="Description">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-md border border-border bg-bg px-3 py-2 text-sm leading-relaxed text-text outline-none transition-colors duration-fast focus:border-accent/60"
          placeholder="What does this do?"
        />
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(item.description);
              setEditing(false);
            }}
            className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-muted transition-colors duration-fast hover:bg-surface-raised hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending || draft === item.description}
            onClick={async () => {
              await updateDescription(item, draft);
              setEditing(false);
            }}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-fast',
              isPending || draft === item.description
                ? 'cursor-not-allowed bg-surface-raised text-subtle'
                : 'cursor-pointer bg-text text-bg hover:bg-text/90',
            )}
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </Section>
    );
  }

  return (
    <Section
      title="Description"
      action={
        canEdit ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex cursor-pointer items-center gap-1 rounded text-[10px] font-medium uppercase tracking-[0.14em] text-subtle transition-colors duration-fast hover:text-text"
          >
            <Pencil className="h-3 w-3" strokeWidth={1.75} />
            Edit
          </button>
        ) : undefined
      }
    >
      {item.description ? (
        <p className="text-sm leading-relaxed text-muted">{item.description}</p>
      ) : (
        <p className="text-sm italic text-subtle">
          {canEdit ? 'No description. Click Edit to add one.' : 'No description.'}
        </p>
      )}
    </Section>
  );
}

function HookTriggerSection({ item }: { item: StackItem }): JSX.Element {
  const eventType = typeof item.metadata.eventType === 'string' ? item.metadata.eventType : null;
  const matcher = typeof item.metadata.matcher === 'string' ? item.metadata.matcher : null;
  const command = typeof item.metadata.command === 'string' ? item.metadata.command : null;
  const type = typeof item.metadata.type === 'string' ? item.metadata.type : 'command';

  return (
    <Section title="Trigger">
      {eventType && (
        <DetailRow
          label="Event"
          value={
            <span className="inline-flex items-center rounded-full bg-[#064E3B] px-2 py-0.5 font-mono text-[10px] font-semibold text-[#6ee7b7]">
              {eventType}
            </span>
          }
        />
      )}
      <DetailRow label="Matcher" value={matcher ? matcher : <span className="text-subtle">— (any)</span>} mono={Boolean(matcher)} />
      <DetailRow label="Run" value={type} mono />
      {command && (
        <div className="mt-1 rounded-md border border-border bg-bg p-2 font-mono text-[11px] leading-relaxed text-muted">
          <pre className="whitespace-pre-wrap break-all">{command}</pre>
        </div>
      )}
    </Section>
  );
}

function DeleteFooter({ item }: { item: StackItem }): JSX.Element {
  const [confirming, setConfirming] = useState(false);
  const isPending = useStackStore((s) => s.pendingIds.has(item.id));
  const deleteItem = useStackStore((s) => s.deleteItem);

  if (item.category === 'plugin') {
    return (
      <footer className="border-t border-border-subtle px-5 py-3 text-xs text-subtle">
        Plugins are managed via Claude Code — uninstall there.
      </footer>
    );
  }

  if (confirming) {
    return (
      <footer className="space-y-2 border-t border-border-subtle bg-error/5 px-5 py-3">
        <p className="text-sm text-text">
          Delete <strong>{item.name}</strong>? A backup is kept under{' '}
          <span className="font-mono text-xs">~/.claude/backups/</span>.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-muted transition-colors duration-fast hover:bg-surface-raised hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={async () => {
              await deleteItem(item);
              setConfirming(false);
            }}
            className="cursor-pointer rounded-md bg-error px-3 py-1.5 text-sm font-medium text-white transition-colors duration-fast hover:bg-error/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </footer>
    );
  }

  return (
    <footer className="flex items-center justify-between border-t border-border-subtle px-5 py-3">
      <span className="text-xs text-subtle">Toggle, edit, delete enabled.</span>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-error transition-colors duration-fast hover:bg-error/10"
      >
        <Trash2 className="h-3 w-3" strokeWidth={1.75} />
        Delete
      </button>
    </footer>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}): JSX.Element {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">{title}</h3>
        {action}
      </div>
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
    case 'hook':
      return 'Hook';
  }
}
