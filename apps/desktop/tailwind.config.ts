import type { Config } from 'tailwindcss';
import animatePlugin from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
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
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      fontSize: {
        xs: ['11px', { lineHeight: '16px', fontWeight: '500' }],
        sm: ['13px', { lineHeight: '18px', fontWeight: '400' }],
        base: ['14px', { lineHeight: '20px', fontWeight: '400' }],
        md: ['15px', { lineHeight: '22px', fontWeight: '500' }],
        lg: ['18px', { lineHeight: '24px', fontWeight: '600' }],
        xl: ['22px', { lineHeight: '28px', fontWeight: '600' }],
        '2xl': ['28px', { lineHeight: '32px', fontWeight: '700' }],
        '3xl': ['48px', { lineHeight: '52px', fontWeight: '700' }],
      },
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-subtle': 'rgb(var(--border-subtle) / <alpha-value>)',
        text: 'rgb(var(--text) / <alpha-value>)',
        muted: 'rgb(var(--text-muted) / <alpha-value>)',
        subtle: 'rgb(var(--text-subtle) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-hover': 'rgb(var(--accent-hover) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        error: 'rgb(var(--error) / <alpha-value>)',
        disabled: 'rgb(var(--disabled) / <alpha-value>)',
        category: {
          mcp: { from: '#3B82F6', to: '#1E40AF' },
          skill: { from: '#F59E0B', to: '#B45309' },
          agent: { from: '#EC4899', to: '#9D174D' },
          plugin: { from: '#A855F7', to: '#6B21A8' },
          command: { from: '#06B6D4', to: '#0E7490' },
        },
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      transitionDuration: {
        fast: '150ms',
        medium: '220ms',
        slow: '320ms',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0, 0, 0.2, 1)',
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-down': {
          from: { transform: 'translateY(-100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms cubic-bezier(0, 0, 0.2, 1)',
        'slide-in-right': 'slide-in-right 220ms cubic-bezier(0, 0, 0.2, 1)',
        'slide-down': 'slide-down 220ms cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },
  plugins: [animatePlugin],
};

export default config;
