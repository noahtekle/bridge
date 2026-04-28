import type { StackItem } from '@bridge/core';

import { scanMcps } from './scan-mcps';
import { scanPlugins } from './scan-plugins';
import { scanSkills } from './scan-skills';
import { scanAgents, scanCommands } from './scan-md-items';

export interface ScanResult {
  items: StackItem[];
  scannedAt: number;
  durationMs: number;
}

/**
 * Single entry point that drives all per-category scanners in parallel and
 * merges the results.
 *
 * Week 1 reads live on every call — no SQLite cache yet because the native
 * better-sqlite3 build needs MSVC tools and we don't want to block on that
 * before we're sure caching is even necessary. If the renderer ends up
 * feeling laggy with large stacks, the cache lands in Week 2.
 */
export async function scanStack(): Promise<ScanResult> {
  const startedAt = Date.now();
  const [mcps, plugins, skills, agents, commands] = await Promise.all([
    scanMcps(),
    scanPlugins(),
    scanSkills(),
    scanAgents(),
    scanCommands(),
  ]);
  const items = [...mcps, ...plugins, ...skills, ...agents, ...commands];
  const scannedAt = Date.now();
  return { items, scannedAt, durationMs: scannedAt - startedAt };
}
