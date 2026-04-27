import { copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { basename, dirname, join, sep } from 'node:path';

import { CLAUDE_PATHS } from './paths';

/**
 * Snapshot a file or directory under ~/.claude/backups/<ISO>/ so we can
 * restore on failure. ISO timestamps are file-safe (replace ":" with "-").
 *
 * Returns the backup directory created. Caller should reuse this for any
 * subsequent backups within the same mutation so they group together.
 */
export async function backupForMutation(srcPath: string): Promise<string> {
  const ts = isoForFilename(new Date());
  const backupDir = join(CLAUDE_PATHS.backupsRoot, ts);
  await mkdir(backupDir, { recursive: true });

  const destPath = mirroredPath(backupDir, srcPath);
  await mkdir(dirname(destPath), { recursive: true });

  try {
    const stats = await stat(srcPath);
    if (stats.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  } catch (err) {
    if (!isMissing(err)) throw err;
    // Source missing — record the absence so restore knows the file didn't
    // exist before the mutation (and "restore" means delete).
  }

  return backupDir;
}

/**
 * Walk an entire directory tree, copying every file. Used when toggling
 * skill folders since they may contain assets, scripts, or sub-skills.
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcChild = join(src, entry.name);
    const destChild = join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(srcChild, destChild);
    } else if (entry.isFile()) {
      await copyFile(srcChild, destChild);
    }
    // Symlinks ignored — Claude Code config never legitimately contains them.
  }
}

/**
 * Reflect the absolute source path under the backup dir while preserving
 * directory structure so restore can compute the inverse mapping.
 */
function mirroredPath(backupDir: string, srcPath: string): string {
  // Strip drive letter and leading separator on Windows; on POSIX strip the leading /.
  const cleaned = srcPath.replace(/^[a-zA-Z]:/, '').replace(/^[/\\]+/, '');
  return join(backupDir, ...cleaned.split(/[\\/]+/));
}

function isMissing(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 'ENOENT';
}

function isoForFilename(date: Date): string {
  return date.toISOString().replace(/:/g, '-').replace(/\..+$/, 'Z');
}

/**
 * Backup retention. Spec: keep last N backups OR last D days, whichever is
 * MORE permissive. So a recent burst of activity isn't punished, and a
 * long quiet period isn't clipped to nothing.
 *
 * Runs on app start; doesn't block app boot — fire-and-forget at the call site.
 */
export interface RotationOptions {
  retainCount: number;
  retainDays: number;
}

export async function rotateBackups(options: RotationOptions): Promise<void> {
  const entries = await safeReaddir(CLAUDE_PATHS.backupsRoot);
  const dirsWithMtime: { path: string; mtimeMs: number }[] = [];
  for (const entry of entries) {
    const full = join(CLAUDE_PATHS.backupsRoot, entry);
    try {
      const st = await stat(full);
      if (st.isDirectory()) dirsWithMtime.push({ path: full, mtimeMs: st.mtimeMs });
    } catch {
      /* skip */
    }
  }

  dirsWithMtime.sort((a, b) => b.mtimeMs - a.mtimeMs);

  const cutoffMs = Date.now() - options.retainDays * 24 * 60 * 60 * 1000;
  const keep = new Set<string>();
  for (let i = 0; i < dirsWithMtime.length; i += 1) {
    const entry = dirsWithMtime[i];
    if (i < options.retainCount || entry.mtimeMs >= cutoffMs) {
      keep.add(entry.path);
    }
  }

  for (const entry of dirsWithMtime) {
    if (!keep.has(entry.path)) {
      await rm(entry.path, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

async function safeReaddir(path: string): Promise<string[]> {
  try {
    return await readdir(path);
  } catch {
    return [];
  }
}

/** Exposed for tests — keep it last so it doesn't crowd the public surface. */
export const __test = { mirroredPath, isoForFilename };
export { sep, basename };
