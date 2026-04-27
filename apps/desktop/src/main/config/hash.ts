import { createHash } from 'node:crypto';

import type { StackCategory } from '@bridge/core';

/**
 * Stable per-item ID. Same input always produces the same output, so cards
 * keep their identity across rescans (lets the renderer animate updates
 * instead of full re-render).
 */
export function stableId(category: StackCategory, source: string, name: string): string {
  return createHash('sha256').update(`${category}:${source}:${name}`).digest('hex').slice(0, 12);
}
