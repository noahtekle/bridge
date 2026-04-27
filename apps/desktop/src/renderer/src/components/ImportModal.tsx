import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Github,
  Loader2,
  X,
} from 'lucide-react';
import { useEffect } from 'react';

import type { StackCategory } from '@bridge/core';

import { cn } from '@/lib/utils';
import { CategoryIcon, CATEGORY_LABELS_SINGULAR } from './CategoryIcon';
import { useImportStore } from '@/store/import';

const CATEGORY_OPTIONS: StackCategory[] = ['skill', 'agent', 'command', 'mcp', 'plugin'];

export function ImportModal(): JSX.Element {
  const open = useImportStore((s) => s.open);
  const closeModal = useImportStore((s) => s.closeModal);

  // Esc closes from anywhere inside the modal.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') void closeModal();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, closeModal]);

  return (
    <AnimatePresence>{open && <Body key="modal" />}</AnimatePresence>
  );
}

function Body(): JSX.Element {
  const stage = useImportStore((s) => s.stage);
  const closeModal = useImportStore((s) => s.closeModal);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 px-6 py-10"
      onClick={() => void closeModal()}
    >
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-[640px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/50"
        role="dialog"
        aria-label="Import from GitHub"
      >
        <header className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-surface-raised">
              <Github className="h-4 w-4 text-text" strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-md font-semibold text-text">Import from GitHub</h2>
              <p className="text-xs text-subtle">
                Paste a repo URL — Bridge detects what kind of thing it is.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void closeModal()}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted transition-colors duration-fast hover:bg-surface-raised hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {stage === 'idle' || stage === 'loading' || (stage === 'error' && !useImportStore.getState().preview) ? (
            <UrlStage />
          ) : stage === 'preview' || stage === 'installing' ? (
            <PreviewStage />
          ) : stage === 'success' ? (
            <SuccessStage />
          ) : (
            <ErrorStage />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function UrlStage(): JSX.Element {
  const url = useImportStore((s) => s.url);
  const setUrl = useImportStore((s) => s.setUrl);
  const stage = useImportStore((s) => s.stage);
  const error = useImportStore((s) => s.error);
  const loadPreview = useImportStore((s) => s.loadPreview);
  const isLoading = stage === 'loading';

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">
          Repository URL
        </span>
        <input
          type="url"
          autoFocus
          value={url}
          disabled={isLoading}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && url.trim()) void loadPreview();
          }}
          placeholder="https://github.com/owner/repo"
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors duration-fast focus:border-accent/60 disabled:opacity-60"
        />
      </label>

      {error && (
        <div className="flex items-start gap-2 rounded-md bg-error/10 px-3 py-2 text-sm text-error">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span>{error}</span>
        </div>
      )}

      <p className="text-xs text-subtle">
        Bridge does a shallow git clone, scans for{' '}
        <code className="font-mono">SKILL.md</code>,{' '}
        <code className="font-mono">plugin.json</code>,{' '}
        <code className="font-mono">mcpServers</code>, and the{' '}
        <code className="font-mono">agents/</code> + <code className="font-mono">commands/</code>{' '}
        directories. Nothing leaves your machine besides the clone request.
      </p>

      <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
        <button
          type="button"
          onClick={() => void loadPreview()}
          disabled={isLoading || !url.trim()}
          className={cn(
            'flex cursor-pointer items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors duration-fast',
            isLoading || !url.trim()
              ? 'cursor-not-allowed bg-surface-raised text-subtle'
              : 'bg-text text-bg hover:bg-text/90',
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Cloning…
            </>
          ) : (
            <>
              Preview <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function PreviewStage(): JSX.Element {
  const preview = useImportStore((s) => s.preview);
  const overrideCategory = useImportStore((s) => s.overrideCategory);
  const setOverrideCategory = useImportStore((s) => s.setOverrideCategory);
  const editableName = useImportStore((s) => s.editableName);
  const setEditableName = useImportStore((s) => s.setEditableName);
  const stage = useImportStore((s) => s.stage);
  const confirmInstall = useImportStore((s) => s.confirmInstall);
  const closeModal = useImportStore((s) => s.closeModal);

  if (!preview) return <></>;

  const detectedPrimary =
    preview.detectedCategory === 'ambiguous'
      ? preview.candidates[0]
      : preview.detectedCategory === 'unknown'
        ? null
        : preview.detectedCategory;

  const effectiveCategory = overrideCategory ?? detectedPrimary;
  const isInstalling = stage === 'installing';
  const isPlugin = effectiveCategory === 'plugin';
  const detectionFailed = preview.detectedCategory === 'unknown';

  return (
    <div className="space-y-5">
      {detectionFailed && (
        <div className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span>
            Couldn&apos;t auto-detect what this repo is. Pick a category below to install it
            as.
          </span>
        </div>
      )}

      {preview.detectedCategory === 'ambiguous' && (
        <div className="flex items-start gap-2 rounded-md bg-surface-raised px-3 py-2 text-sm text-muted">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} />
          <span>
            Multiple signals found — pick which one to install.
          </span>
        </div>
      )}

      <section className="space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">
          Detected
        </span>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_OPTIONS.map((cat) => {
            const detected = preview.candidates.includes(cat);
            const active = effectiveCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                disabled={isInstalling}
                onClick={() => setOverrideCategory(cat)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors duration-fast',
                  active
                    ? 'border-accent/60 bg-accent/10 text-accent'
                    : 'border-border bg-bg text-muted hover:bg-surface-raised hover:text-text',
                  isInstalling && 'pointer-events-none opacity-50',
                )}
                aria-pressed={active}
              >
                <CategoryIcon category={cat} size={16} />
                {CATEGORY_LABELS_SINGULAR[cat]}
                {detected && (
                  <span className="rounded-full bg-success/20 px-1.5 text-[9px] font-semibold uppercase text-success">
                    found
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">Name</span>
        <input
          type="text"
          value={editableName}
          disabled={isInstalling}
          onChange={(e) => setEditableName(e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors duration-fast focus:border-accent/60"
        />
      </section>

      {preview.description && (
        <section className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">
            Description
          </span>
          <p className="text-sm leading-relaxed text-muted">{preview.description}</p>
        </section>
      )}

      {preview.readmeSnippet && (
        <section className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">
            README preview
          </span>
          <pre className="overflow-x-auto rounded-md border border-border bg-bg p-3 font-mono text-[11px] leading-relaxed text-muted">
            {preview.readmeSnippet}
          </pre>
        </section>
      )}

      {effectiveCategory && !isPlugin && preview.filesToWrite.length > 0 && (
        <section className="space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">
            Will write to
          </span>
          <div className="space-y-1 rounded-md border border-border bg-bg p-3 font-mono text-[11px] text-muted">
            {preview.filesToWrite.map((f, idx) => (
              <div key={idx} className="truncate">
                <span className="text-subtle">→ </span>
                {f.dest}
              </div>
            ))}
          </div>
        </section>
      )}

      {isPlugin && (
        <section className="space-y-2 rounded-md bg-surface-raised p-4">
          <p className="text-sm text-text">
            Plugins install through Claude Code, not Bridge.
          </p>
          <p className="text-xs text-muted">
            Open the Claude Code CLI and run the plugin install command for this repo. Bridge
            will pick it up on the next scan.
          </p>
        </section>
      )}

      <div className="flex items-center justify-between border-t border-border-subtle pt-4">
        <button
          type="button"
          onClick={() => void closeModal()}
          disabled={isInstalling}
          className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-muted transition-colors duration-fast hover:bg-surface-raised hover:text-text"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void confirmInstall()}
          disabled={isInstalling || !effectiveCategory || isPlugin}
          className={cn(
            'flex cursor-pointer items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors duration-fast',
            isInstalling || !effectiveCategory || isPlugin
              ? 'cursor-not-allowed bg-surface-raised text-subtle'
              : 'bg-text text-bg hover:bg-text/90',
          )}
        >
          {isInstalling ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Installing…
            </>
          ) : (
            <>Install</>
          )}
        </button>
      </div>
    </div>
  );
}

function SuccessStage(): JSX.Element {
  const installResult = useImportStore((s) => s.installResult);
  const closeModal = useImportStore((s) => s.closeModal);
  const editableName = useImportStore((s) => s.editableName);

  return (
    <div className="space-y-4 text-center">
      <div className="grid h-12 w-12 mx-auto place-items-center rounded-full bg-success/15">
        <CheckCircle2 className="h-6 w-6 text-success" strokeWidth={1.75} />
      </div>
      <h3 className="text-md font-semibold text-text">Installed {editableName}</h3>
      {installResult && installResult.installed.length > 0 && (
        <ul className="mx-auto max-w-md space-y-0.5 rounded-md border border-border bg-bg p-3 text-left font-mono text-[11px] text-muted">
          {installResult.installed.slice(0, 8).map((path, idx) => (
            <li key={idx} className="truncate">
              {path}
            </li>
          ))}
          {installResult.installed.length > 8 && (
            <li className="text-subtle">… and {installResult.installed.length - 8} more</li>
          )}
        </ul>
      )}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => void closeModal()}
          className="cursor-pointer rounded-md bg-text px-5 py-1.5 text-sm font-medium text-bg transition-colors duration-fast hover:bg-text/90"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function ErrorStage(): JSX.Element {
  const error = useImportStore((s) => s.error);
  const installResult = useImportStore((s) => s.installResult);
  const closeModal = useImportStore((s) => s.closeModal);

  return (
    <div className="space-y-4 text-center">
      <div className="grid h-12 w-12 mx-auto place-items-center rounded-full bg-error/15">
        <CircleAlert className="h-6 w-6 text-error" strokeWidth={1.75} />
      </div>
      <h3 className="text-md font-semibold text-text">Import failed</h3>
      <p className="mx-auto max-w-md text-sm text-muted">{error ?? 'Unknown error'}</p>
      {installResult?.cliInstruction && (
        <pre className="mx-auto max-w-md overflow-x-auto rounded-md border border-border bg-bg p-3 text-left font-mono text-[11px] text-muted">
          {installResult.cliInstruction}
        </pre>
      )}
      <div className="flex justify-center gap-2">
        <a
          href="https://github.com/noahtekle/bridge/issues/new?template=bug.yml"
          target="_blank"
          rel="noreferrer"
          className="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted transition-colors duration-fast hover:bg-surface-raised hover:text-text"
        >
          File a bug
          <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
        </a>
        <button
          type="button"
          onClick={() => void closeModal()}
          className="cursor-pointer rounded-md bg-text px-5 py-1.5 text-sm font-medium text-bg transition-colors duration-fast hover:bg-text/90"
        >
          Close
        </button>
      </div>
    </div>
  );
}
