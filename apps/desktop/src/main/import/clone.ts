import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import simpleGit from 'simple-git';

export interface CloneResult {
  /** Absolute path to the cloned working tree. Caller must clean up via dispose(). */
  path: string;
  /** Removes the cloned tree. Idempotent. */
  dispose: () => Promise<void>;
}

/**
 * Shallow-clone the given repo URL into a fresh tmp directory. Shallow
 * because we only ever need the current state — no history, no branches.
 *
 * Network errors, auth failures, and 404s all bubble up as Errors with the
 * underlying git stderr included. Caller should surface the message to the
 * user rather than retry.
 */
export async function cloneRepo(url: string): Promise<CloneResult> {
  validateRepoUrl(url);

  const root = await mkdtemp(join(tmpdir(), 'bridge-import-'));
  const target = join(root, 'repo');

  const git = simpleGit({ baseDir: root, timeout: { block: 30_000 } });
  await git.clone(url, target, ['--depth=1', '--single-branch']);

  return {
    path: target,
    dispose: async () => {
      await rm(root, { recursive: true, force: true }).catch(() => undefined);
    },
  };
}

/**
 * Block obvious mistakes before we shell out to git. Real validation
 * happens server-side at clone time — this is just for fail-fast UX.
 */
function validateRepoUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Not a valid URL');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only http(s) URLs are supported');
  }

  // Block obviously-non-repo URLs. Real misspellings will surface from git.
  if (!/\.com$|\.dev$|\.io$|\.org$|\.net$/i.test(parsed.hostname)) {
    // permissive — most git hosts have these TLDs; we don't enforce a host whitelist
  }
}
