import type { DiscoverEntry, StackCategory } from '@bridge/core';

import curatedRaw from './curated.json';
import { isRecord } from '../config/read-json';

/**
 * `curated.json` is bundled into the main process at build time via Vite's
 * JSON import. We still validate at runtime so a malformed commit can only
 * degrade Discover gracefully (return an empty list), never crash the app.
 */
let cached: DiscoverEntry[] | null = null;

export async function loadCurated(): Promise<DiscoverEntry[]> {
  if (cached) return cached;
  cached = parseCurated(curatedRaw);
  return cached;
}

const VALID_CATEGORIES: ReadonlySet<StackCategory> = new Set([
  'mcp',
  'plugin',
  'skill',
  'agent',
  'command',
  'hook',
]);

function parseCurated(raw: unknown): DiscoverEntry[] {
  if (!isRecord(raw) || !Array.isArray(raw.entries)) return [];
  const out: DiscoverEntry[] = [];
  for (const entry of raw.entries) {
    if (!isRecord(entry)) continue;
    const category = typeof entry.category === 'string' ? entry.category : '';
    if (!VALID_CATEGORIES.has(category as StackCategory)) continue;
    if (
      typeof entry.id !== 'string' ||
      typeof entry.name !== 'string' ||
      typeof entry.repoUrl !== 'string' ||
      typeof entry.description !== 'string' ||
      typeof entry.whyRecommended !== 'string' ||
      typeof entry.maintainer !== 'string'
    ) {
      continue;
    }
    out.push({
      id: entry.id,
      name: entry.name,
      category: category as StackCategory,
      repoUrl: entry.repoUrl,
      description: entry.description,
      whyRecommended: entry.whyRecommended,
      maintainer: entry.maintainer,
      tags: Array.isArray(entry.tags)
        ? entry.tags.filter((t): t is string => typeof t === 'string')
        : undefined,
    });
  }
  return out;
}
