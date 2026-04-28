import type { StackCategory } from './schema';

/**
 * One curated entry. Lives in apps/desktop/src/main/discover/curated.json
 * and is loaded into the renderer via the GET_DISCOVER_LIST IPC. The shape
 * is deliberately minimal — anything richer (icons, install counts, ratings)
 * belongs in a real marketplace, not a curated static list.
 *
 * Adding a new entry is a 5-line PR. The whole point is that contribution
 * is cheap and review is human, not automated.
 */
export interface DiscoverEntry {
  /** Stable ID. Lowercase, kebab-case, unique across the curated list. */
  id: string;
  /** Display name. */
  name: string;
  /** What this is when installed via Bridge. */
  category: StackCategory;
  /** GitHub repo URL — must be cloneable via the Bridge import flow. */
  repoUrl: string;
  /**
   * Optional subdirectory inside `repoUrl` that contains the actual thing.
   * Use this for monorepos where one repo holds many installable items
   * (e.g. `anthropics/claude-plugins-official` → `plugins/superpowers`,
   * `modelcontextprotocol/servers` → `src/filesystem`).
   *
   * When provided, Bridge clones the repo as usual, then runs detection
   * and install against `<clone>/<subPath>` instead of the repo root.
   *
   * Path is normalized and validated to stay inside the cloned tree —
   * any `..` traversal is rejected.
   */
  subPath?: string;
  /** One- or two-sentence description. Renders as the card subtitle. */
  description: string;
  /** Why this entry made the curated list. Renders below description. */
  whyRecommended: string;
  /** GitHub org/user name. */
  maintainer: string;
  /** Optional tags for future filtering. UI doesn't use them yet. */
  tags?: string[];
}
