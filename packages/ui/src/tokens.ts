/**
 * Bridge design tokens.
 *
 * Source of truth for the design system. Tailwind config in
 * apps/desktop/tailwind.config.ts mirrors these values via CSS variables, but
 * any code that needs token values directly (e.g. category gradient SVGs)
 * imports from here.
 *
 * Keep this file pure data — no functions, no React.
 */

export const colors = {
  dark: {
    bg: '#0A0A0B',
    surface: '#18181B',
    surfaceRaised: '#27272A',
    border: '#27272A',
    borderSubtle: '#1F1F23',
    text: '#FAFAFA',
    textMuted: '#A1A1AA',
    textSubtle: '#71717A',
    accent: '#3B82F6',
    accentHover: '#2563EB',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    disabled: '#3F3F46',
  },
  light: {
    bg: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceRaised: '#F4F4F5',
    border: '#E4E4E7',
    borderSubtle: '#F4F4F5',
    text: '#18181B',
    textMuted: '#52525B',
    textSubtle: '#71717A',
    accent: '#2563EB',
    accentHover: '#1D4ED8',
    success: '#16A34A',
    warning: '#D97706',
    error: '#DC2626',
    disabled: '#D4D4D8',
  },
  category: {
    mcp: { from: '#3B82F6', to: '#1E40AF' },
    skill: { from: '#F59E0B', to: '#B45309' },
    agent: { from: '#EC4899', to: '#9D174D' },
    plugin: { from: '#A855F7', to: '#6B21A8' },
    command: { from: '#06B6D4', to: '#0E7490' },
  },
} as const;

export const typography = {
  sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
  scale: {
    xs: { size: '11px', lineHeight: '16px', weight: 500 },
    sm: { size: '13px', lineHeight: '18px', weight: 400 },
    base: { size: '14px', lineHeight: '20px', weight: 400 },
    md: { size: '15px', lineHeight: '22px', weight: 500 },
    lg: { size: '18px', lineHeight: '24px', weight: 600 },
    xl: { size: '22px', lineHeight: '28px', weight: 600 },
    '2xl': { size: '28px', lineHeight: '32px', weight: 700 },
    '3xl': { size: '48px', lineHeight: '52px', weight: 700 },
  },
} as const;

export const radii = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

export const motion = {
  durations: {
    instant: '0ms',
    fast: '150ms',
    medium: '220ms',
    slow: '320ms',
  },
  easings: {
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  spring: {
    stiffness: 400,
    damping: 30,
  },
} as const;

export const layout = {
  sidebar: {
    width: 220,
    collapsedWidth: 56,
  },
  card: {
    minWidth: 280,
    maxWidth: 360,
    padding: 16,
    radius: 12,
  },
  detailPanel: {
    width: 420,
  },
} as const;

export type ColorScheme = 'dark' | 'light';
