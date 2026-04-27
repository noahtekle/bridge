import { stat } from 'node:fs/promises';

import type { StackItem } from '@bridge/core';

import { CLAUDE_PATHS } from './paths';
import { scanMcps } from './scan-mcps';
import { scanPlugins } from './scan-plugins';
import { scanSkills } from './scan-skills';
import { scanAgents, scanCommands } from './scan-md-items';

export interface ScanResult {
  items: StackItem[];
  scannedAt: number;
  durationMs: number;
  claudeCodeDetected: boolean;
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
  const [mcps, plugins, skills, agents, commands, detected] = await Promise.all([
    scanMcps(),
    scanPlugins(),
    scanSkills(),
    scanAgents(),
    scanCommands(),
    detectClaudeCode(),
  ]);
  const items = [...mcps, ...plugins, ...skills, ...agents, ...commands];
  const scannedAt = Date.now();
  return {
    items,
    scannedAt,
    durationMs: scannedAt - startedAt,
    claudeCodeDetected: detected,
  };
}

async function detectClaudeCode(): Promise<boolean> {
  // We treat either presence as proof of an install — a fresh user may have
  // ~/.claude.json without the dir, or vice versa.
  const checks = await Promise.all([
    stat(CLAUDE_PATHS.home).then(
      (s) => s.isDirectory(),
      () => false,
    ),
    stat(CLAUDE_PATHS.claudeJson).then(
      (s) => s.isFile(),
      () => false,
    ),
  ]);
  return checks.some(Boolean);
}
