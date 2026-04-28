import { AnimatePresence, motion } from 'framer-motion';
import { CircleAlert, RefreshCw, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useStackStore } from '@/store/stack';

/**
 * Slim sticky bands that sit between the header and the grid.
 * Both share the same animation and stack — restart sits on top, failure
 * below it, when both are present. (Failures get more visual weight than
 * restart pending because the user is more likely to need to act on them.)
 */
export function Banners(): JSX.Element {
  const restartPending = useStackStore((s) => s.restartPending);
  const failure = useStackStore((s) => s.failure);
  const acknowledgeRestart = useStackStore((s) => s.acknowledgeRestart);
  const dismissFailure = useStackStore((s) => s.dismissFailure);

  return (
    <div className="flex flex-col">
      <AnimatePresence initial={false}>
        {restartPending && (
          <motion.div
            key="restart"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
            className="overflow-hidden border-b border-warning/30 bg-warning/10"
          >
            <BannerRow
              icon={<RefreshCw className="h-3.5 w-3.5 text-warning" strokeWidth={2} />}
              text={
                <>
                  Some changes won&apos;t take effect until Claude Code is restarted.
                  <span className="ml-1 text-subtle">Quit and reopen the CLI to apply.</span>
                </>
              }
              actions={
                <button
                  type="button"
                  onClick={acknowledgeRestart}
                  className="cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium text-warning transition-colors duration-fast hover:bg-warning/15"
                >
                  Got it
                </button>
              }
            />
          </motion.div>
        )}

        {failure && (
          <motion.div
            key="failure"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
            className="overflow-hidden border-b border-error/30 bg-error/10"
          >
            <BannerRow
              icon={<CircleAlert className="h-3.5 w-3.5 text-error" strokeWidth={2} />}
              text={
                <>
                  <span className="font-medium text-error">Could not save:</span>{' '}
                  <span className="text-text">{failure.message}</span>
                  {failure.backupPath && (
                    <span className="ml-2 hidden font-mono text-[11px] text-subtle md:inline">
                      Backup at {shortenBackupPath(failure.backupPath)}
                    </span>
                  )}
                </>
              }
              actions={
                <button
                  type="button"
                  onClick={dismissFailure}
                  aria-label="Dismiss error"
                  className="grid h-6 w-6 cursor-pointer place-items-center rounded text-error transition-colors duration-fast hover:bg-error/20"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface BannerRowProps {
  icon: React.ReactNode;
  text: React.ReactNode;
  actions: React.ReactNode;
}

function BannerRow({ icon, text, actions }: BannerRowProps): JSX.Element {
  return (
    <div className={cn('flex items-center gap-3 px-6 py-2 text-sm')}>
      <span className="grid h-5 w-5 place-items-center">{icon}</span>
      <span className="flex-1 text-muted">{text}</span>
      {actions}
    </div>
  );
}

/** Drop the home directory prefix so the banner stays compact. */
function shortenBackupPath(p: string): string {
  return p.replace(/^.*[\\/]\.claude[\\/]backups[\\/]/, '~/.claude/backups/');
}
