import type { StackCategory } from '@bridge/core';

import { cn } from '@/lib/utils';

interface CategoryIconProps {
  category: StackCategory;
  size?: number;
  className?: string;
  /** Render a flat (non-gradient) variant for sidebar rails. */
  flat?: boolean;
}

/**
 * Hand-tuned SVG marks for each of the 5 categories. Each renders as a
 * rounded square with a category-color gradient and a unique abstract glyph
 * inside. Designed to read clearly at 16px (sidebar) and 32px (cards).
 *
 * Icons stay specific to Bridge — not Lucide — because the dashboard's
 * "personality" hangs on the cards, and emoji or generic boxes look
 * AI-slop on a developer tool.
 */
export function CategoryIcon({
  category,
  size = 32,
  className,
  flat = false,
}: CategoryIconProps): JSX.Element {
  const gid = `bridge-grad-${category}`;
  const colors = GRADIENTS[category];
  const glyph = GLYPHS[category];

  return (
    <svg
      role="img"
      aria-label={`${category} icon`}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn('shrink-0', className)}
    >
      {!flat && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={colors.from} />
            <stop offset="100%" stopColor={colors.to} />
          </linearGradient>
        </defs>
      )}
      <rect
        x="0"
        y="0"
        width="32"
        height="32"
        rx="7"
        fill={flat ? colors.from : `url(#${gid})`}
      />
      {glyph}
    </svg>
  );
}

const GRADIENTS: Record<StackCategory, { from: string; to: string }> = {
  mcp: { from: '#3B82F6', to: '#1E40AF' },
  skill: { from: '#F59E0B', to: '#B45309' },
  agent: { from: '#EC4899', to: '#9D174D' },
  plugin: { from: '#A855F7', to: '#6B21A8' },
  command: { from: '#06B6D4', to: '#0E7490' },
};

const stroke = 'rgba(255,255,255,0.95)';

/**
 * Each glyph reads at a single scale — drawn for 32x32 viewBox.
 *  - mcp:       three vertical pillars (server stack)
 *  - skill:     a star arc (pulse)
 *  - agent:     concentric ring (orbit)
 *  - plugin:    plug prongs
 *  - command:   forward slash + cursor block
 */
const GLYPHS: Record<StackCategory, JSX.Element> = {
  mcp: (
    <g stroke={stroke} strokeWidth={1.75} strokeLinecap="round" fill="none">
      <path d="M11 10 v12" />
      <path d="M16 8 v16" />
      <path d="M21 10 v12" />
      <circle cx="11" cy="10" r="0.6" fill={stroke} stroke="none" />
      <circle cx="16" cy="8" r="0.6" fill={stroke} stroke="none" />
      <circle cx="21" cy="10" r="0.6" fill={stroke} stroke="none" />
    </g>
  ),
  skill: (
    <g stroke={stroke} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M16 9 l1.6 4.2 l4.4 0.4 l-3.4 2.9 l1 4.3 l-3.6 -2.4 l-3.6 2.4 l1 -4.3 l-3.4 -2.9 l4.4 -0.4 z" />
    </g>
  ),
  agent: (
    <g stroke={stroke} strokeWidth={1.75} fill="none">
      <circle cx="16" cy="16" r="6.5" />
      <circle cx="16" cy="16" r="2.4" fill={stroke} stroke="none" />
    </g>
  ),
  plugin: (
    <g stroke={stroke} strokeWidth={1.75} strokeLinecap="round" fill="none">
      <path d="M12 9 v4" />
      <path d="M20 9 v4" />
      <path d="M10 14 h12 v3 a4 4 0 0 1 -4 4 h-4 a4 4 0 0 1 -4 -4 z" />
      <path d="M16 21 v3" />
    </g>
  ),
  command: (
    <g stroke={stroke} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M11 21 l4 -10" />
      <rect x="17" y="11" width="6" height="10" rx="1.5" />
      <path d="M19 16 h2" />
    </g>
  ),
};

export const CATEGORY_LABELS: Record<StackCategory, string> = {
  mcp: 'MCPs',
  plugin: 'Plugins',
  skill: 'Skills',
  agent: 'Agents',
  command: 'Commands',
};

export const CATEGORY_LABELS_SINGULAR: Record<StackCategory, string> = {
  mcp: 'MCP',
  plugin: 'Plugin',
  skill: 'Skill',
  agent: 'Agent',
  command: 'Command',
};

/** Display order for sidebar + filters. Matches the spec doc. */
export const CATEGORIES_ORDER: StackCategory[] = ['mcp', 'plugin', 'skill', 'agent', 'command'];
