/**
 * Normalized schema for everything Bridge displays.
 *
 * Every MCP, Skill, Agent, Plugin, and slash command — regardless of where it
 * lives on disk — funnels into this shape before reaching the UI.
 */

export type StackCategory = 'mcp' | 'plugin' | 'skill' | 'agent' | 'command';

export type StackSource = 'user' | 'plugin' | 'github' | 'official';

export type StackStatus = 'active' | 'disabled' | 'error';

export interface StackItem {
  /** Stable hash of source + category + name. Survives renames within a session. */
  id: string;
  category: StackCategory;
  name: string;
  description: string;
  source: StackSource;
  /** e.g. 'superpowers@official', a github URL, etc. */
  sourceRef?: string;
  status: StackStatus;
  /** True if Claude Code must be restarted for this item's status to take effect. */
  needsRestart: boolean;
  /** Path to the file or folder backing this item, if any. */
  filePath?: string;
  /** Where this item's status is configured. */
  configPath: {
    file: string;
    /** JSONPath-style pointer into the file, when applicable. */
    jsonPath?: string;
  };
  /** Free-form metadata (version, deps, etc.). Renderer must treat as untrusted. */
  metadata: Record<string, unknown>;
}

/** Per-category accent colors used by the renderer. Mirrors design tokens. */
export const CATEGORY_ACCENT: Record<StackCategory, { from: string; to: string; pill: string }> = {
  mcp: { from: '#3B82F6', to: '#1E40AF', pill: '#1E3A8A' },
  skill: { from: '#F59E0B', to: '#B45309', pill: '#78350F' },
  agent: { from: '#EC4899', to: '#9D174D', pill: '#831843' },
  plugin: { from: '#A855F7', to: '#6B21A8', pill: '#581C87' },
  command: { from: '#06B6D4', to: '#0E7490', pill: '#155E75' },
};
