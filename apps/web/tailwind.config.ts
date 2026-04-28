import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{astro,html,ts,tsx,js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      // Mirror Bridge desktop tokens — dark-only on the marketing site for now.
      colors: {
        bg: '#0A0A0B',
        surface: '#18181B',
        'surface-raised': '#27272A',
        border: '#27272A',
        'border-subtle': '#1F1F23',
        text: '#FAFAFA',
        muted: '#A1A1AA',
        subtle: '#71717A',
        accent: '#3B82F6',
        'accent-hover': '#2563EB',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        category: {
          mcp: { from: '#3B82F6', to: '#1E40AF' },
          skill: { from: '#F59E0B', to: '#B45309' },
          agent: { from: '#EC4899', to: '#9D174D' },
          plugin: { from: '#A855F7', to: '#6B21A8' },
          command: { from: '#06B6D4', to: '#0E7490' },
          hook: { from: '#10B981', to: '#047857' },
        },
      },
      fontSize: {
        xs: ['11px', { lineHeight: '16px', fontWeight: '500' }],
        sm: ['13px', { lineHeight: '18px', fontWeight: '400' }],
        base: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        md: ['15px', { lineHeight: '22px', fontWeight: '500' }],
        lg: ['18px', { lineHeight: '26px', fontWeight: '500' }],
        xl: ['22px', { lineHeight: '28px', fontWeight: '600' }],
        '2xl': ['28px', { lineHeight: '34px', fontWeight: '600' }],
        '3xl': ['36px', { lineHeight: '42px', fontWeight: '700' }],
        '4xl': ['48px', { lineHeight: '54px', fontWeight: '700' }],
        '5xl': ['64px', { lineHeight: '70px', fontWeight: '700' }],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'count-up-1': { from: { content: '"0"' }, to: { content: '"1"' } },
      },
      animation: {
        'fade-up': 'fade-up 600ms cubic-bezier(0, 0, 0.2, 1) both',
      },
    },
  },
};

export default config;
