import { stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

/**
 * Resolve a user-supplied subPath against a freshly cloned repo and verify:
 *   1. It doesn't escape the clone via `..` (path traversal)
 *   2. It actually exists on disk and is a directory
 *
 * Returns the absolute path to use as the "logical root" for detect + install.
 * Throws a clear Error otherwise — caller surfaces the message to the user.
 *
 * Empty / undefined subPath returns `cloneRoot` unchanged.
 */
export async function resolveSubPath(cloneRoot: string, subPath?: string): Promise<string> {
  if (!subPath || subPath.trim().length === 0) return cloneRoot;

  // Normalize backslashes so curated.json can use either POSIX or Windows
  // separators — but keep leading separators intact. Stripping a leading `/`
  // would silently coerce a POSIX-absolute escape attempt (`/etc/passwd`)
  // into a relative join under cloneRoot, which the existing prefix check
  // would then reject for a confusing reason ("not found") instead of the
  // correct one ("escapes"). Let path.resolve handle absolute-vs-relative.
  const normalizedInput = subPath.replace(/\\/g, '/');
  const root = resolve(cloneRoot);
  const target = resolve(cloneRoot, normalizedInput);

  // Must stay inside the cloneRoot. Compare with a trailing separator so
  // `/cloneA/foo` doesn't accidentally pass the prefix check for `/cloneA`.
  const rootWithSep = root.endsWith(sep) ? root : root + sep;
  if (target !== root && !target.startsWith(rootWithSep)) {
    throw new Error('subPath escapes the cloned repo');
  }

  let stats;
  try {
    stats = await stat(target);
  } catch {
    throw new Error(`subPath not found in repo: ${normalizedInput}`);
  }
  if (!stats.isDirectory()) {
    throw new Error(`subPath is not a directory: ${normalizedInput}`);
  }

  return target;
}
