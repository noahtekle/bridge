import chokidar, { type FSWatcher } from 'chokidar';

import { WATCH_PATHS } from './paths';

/** Debounce time before triggering a rescan after a watched path changes. */
const DEBOUNCE_MS = 250;

export interface FileWatcherHandle {
  close: () => Promise<void>;
}

/**
 * Watch the 6 source paths and call `onChange` when any of them mutate.
 * Burst events (multiple files saved in the same operation, e.g. a plugin
 * install) are coalesced into one call via a trailing debounce.
 *
 * Errors are logged to stderr — never thrown. We never want a stale watcher
 * to crash the whole app.
 */
export function startFileWatcher(onChange: () => void): FileWatcherHandle {
  const watcher: FSWatcher = chokidar.watch([...WATCH_PATHS], {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 150,
      pollInterval: 50,
    },
    ignored: [
      // Avoid noisy directories that change a lot but never affect the stack.
      /(^|[/\\])\.(git|DS_Store)([/\\]|$)/,
      /node_modules/,
      /\.tmp$/,
      /backups[/\\]/,
    ],
  });

  let timer: NodeJS.Timeout | null = null;
  const trigger = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      onChange();
    }, DEBOUNCE_MS);
  };

  watcher.on('add', trigger);
  watcher.on('change', trigger);
  watcher.on('unlink', trigger);
  watcher.on('addDir', trigger);
  watcher.on('unlinkDir', trigger);
  watcher.on('error', (err) => {
    console.error('[bridge/file-watcher] error:', err);
  });

  return {
    close: async () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await watcher.close();
    },
  };
}
