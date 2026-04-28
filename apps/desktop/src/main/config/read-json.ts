import { readFile } from 'node:fs/promises';

/**
 * Defensive JSON read. Treats any failure (missing file, parse error, wrong
 * shape) as "empty" rather than throwing, because:
 *  - on first run users may not have all files yet
 *  - Claude Code can rewrite files mid-scan; we want to resync, not crash
 *  - all data here is untrusted user input
 *
 * Callers do their own narrowing on the unknown return.
 */
export async function readJsonSafe(path: string): Promise<unknown> {
  try {
    const buf = await readFile(path, 'utf8');
    return JSON.parse(buf) as unknown;
  } catch {
    return null;
  }
}

/** True if `value` is a non-null, non-array record we can index safely. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
