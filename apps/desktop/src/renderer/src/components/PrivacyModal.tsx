import { AnimatePresence, motion } from 'framer-motion';
import { Eye, FileText, Shield, X } from 'lucide-react';
import { useEffect } from 'react';

interface PrivacyModalProps {
  open: boolean;
  onClose: () => void;
}

export function PrivacyModal({ open, onClose }: PrivacyModalProps): JSX.Element {
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 px-6 py-10"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/50"
            role="dialog"
            aria-label="Privacy"
          >
            <header className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-accent/15">
                  <Shield className="h-4 w-4 text-accent" strokeWidth={1.75} />
                </span>
                <div>
                  <h2 className="text-md font-semibold text-text">What Bridge does</h2>
                  <p className="text-xs text-subtle">
                    The contract: read your config locally, never phone home.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted transition-colors duration-fast hover:bg-surface-raised hover:text-text"
                aria-label="Close"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <Section icon={<Eye className="h-3.5 w-3.5" strokeWidth={1.75} />} title="Reads">
                <ul className="space-y-1 text-sm leading-relaxed text-muted">
                  <li>
                    <code className="font-mono text-xs">~/.claude.json</code> — your MCP server
                    list
                  </li>
                  <li>
                    <code className="font-mono text-xs">~/.claude/settings.json</code> — enabled
                    plugins, marketplaces
                  </li>
                  <li>
                    <code className="font-mono text-xs">~/.claude/plugins/installed_plugins.json</code>{' '}
                    — plugin manifests
                  </li>
                  <li>
                    <code className="font-mono text-xs">~/.claude/skills/</code>,{' '}
                    <code className="font-mono text-xs">agents/</code>,{' '}
                    <code className="font-mono text-xs">commands/</code> — your file-based items
                  </li>
                  <li>
                    Plugin caches under{' '}
                    <code className="font-mono text-xs">~/.claude/plugins/cache/</code> (read-only,
                    for plugin-bundled skills)
                  </li>
                </ul>
              </Section>

              <Section
                icon={<FileText className="h-3.5 w-3.5" strokeWidth={1.75} />}
                title="Writes"
              >
                <p className="text-sm leading-relaxed text-muted">
                  Only when you explicitly toggle, edit, or import. Every change snapshots the
                  source file to{' '}
                  <code className="font-mono text-xs">~/.claude/backups/&lt;timestamp&gt;/</code>{' '}
                  first. Backups rotate automatically — keep last 50 OR last 30 days, whichever is
                  more permissive.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Atomic JSON writes (<code className="font-mono text-xs">.tmp</code> + fsync +
                  rename) so a crash mid-write can&apos;t corrupt the original.
                </p>
              </Section>

              <Section icon={<Shield className="h-3.5 w-3.5" strokeWidth={1.75} />} title="Network">
                <p className="text-sm leading-relaxed text-muted">
                  Zero outbound network calls except when <strong>you</strong> paste a GitHub URL
                  to import. No telemetry. No analytics. No crash reporting. No accounts. No cloud.
                  Open source — auditable end-to-end.
                </p>
              </Section>
            </div>

            <footer className="flex items-center justify-end border-t border-border-subtle px-5 py-3">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-md bg-text px-5 py-1.5 text-sm font-medium text-bg transition-colors duration-fast hover:bg-text/90"
              >
                Got it
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">
        {icon}
        {title}
      </div>
      <div>{children}</div>
    </section>
  );
}
