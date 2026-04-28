import { open, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Write a JSON file atomically: write next to the target as `.tmp.<rand>`,
 * fsync the new contents, then rename over the original. The rename is
 * atomic on every modern filesystem we care about (NTFS, APFS, ext4).
 *
 * If the process dies between `.tmp` write and the rename, the original is
 * untouched. The leftover `.tmp` is harmless and gets reaped on next mutation
 * or by the user — never blocks anything.
 */
export async function atomicWriteJson(targetPath: string, value: unknown): Promise<void> {
  const dir = dirname(targetPath);
  const tmpName = `.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const tmpPath = join(dir, tmpName);
  const payload = `${JSON.stringify(value, null, 2)}\n`;

  // Write + fsync so we know the bytes hit the disk before the rename promotes
  // the file. Without fsync, a power loss between write and rename can leave
  // an empty file under the original name.
  const handle = await open(tmpPath, 'w');
  try {
    await handle.writeFile(payload, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }

  try {
    await rename(tmpPath, targetPath);
  } catch (err) {
    // Best-effort cleanup of the tmp file; rethrow the rename failure.
    await unlink(tmpPath).catch(() => undefined);
    throw err;
  }
}

/** Plain text variant for SKILL.md / agent.md / command.md edits. */
export async function atomicWriteText(targetPath: string, content: string): Promise<void> {
  const dir = dirname(targetPath);
  const tmpName = `.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const tmpPath = join(dir, tmpName);

  const handle = await open(tmpPath, 'w');
  try {
    await handle.writeFile(content, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }

  try {
    await rename(tmpPath, targetPath);
  } catch (err) {
    await unlink(tmpPath).catch(() => undefined);
    throw err;
  }
}

/** Mirror writeFile's signature for callers that want non-atomic writes. */
export { writeFile };
