import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Boxes, Moon, Sun, Monitor, ShieldCheck } from 'lucide-react';

import type { AppInfo, ThemeSource } from '@bridge/core';

import { cn } from './lib/utils';
import { useThemeStore } from './store/theme';

/**
 * Day 0 splash. Confirms the scaffold boots end-to-end:
 *  - main process is alive (returns AppInfo)
 *  - preload bridge is exposed and typed
 *  - renderer has no Node access (sanity check)
 *  - theme tokens render in dark + light
 *  - framer-motion + lucide are installed and wired
 *
 * Replaced in Week 1 by the real shell (sidebar + card grid + reveal screen).
 */
export default function App(): JSX.Element {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [hasNodeAccess, setHasNodeAccess] = useState<boolean | null>(null);
  const themeSource = useThemeStore((s) => s.themeSource);
  const setSource = useThemeStore((s) => s.setSource);
  const isDark = useThemeStore((s) => s.shouldUseDarkColors);

  useEffect(() => {
    void window.bridge.getAppInfo().then(setAppInfo);
    // Should always be false. If true, the security lockdown is broken.
    setHasNodeAccess(typeof (globalThis as { process?: unknown }).process !== 'undefined');
  }, []);

  return (
    <div className="flex h-full w-full items-center justify-center bg-bg p-12 text-text">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0, 0, 0.2, 1] }}
        className="w-full max-w-2xl space-y-8"
      >
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#1E40AF]">
              <Boxes className="h-5 w-5 text-white" strokeWidth={1.75} />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Bridge</h1>
              <p className="text-sm text-muted">The OS for Claude Code</p>
            </div>
          </div>
          <p className="text-sm text-muted">
            Day 0 scaffold. Real shell ships in Week 1. This screen verifies the runtime is wired
            correctly before we start building the dashboard.
          </p>
        </header>

        <section className="rounded-xl border border-border bg-surface p-6 space-y-4">
          <h2 className="text-md font-medium">Runtime check</h2>

          <Row label="App name" value={appInfo?.name ?? '…'} />
          <Row label="Version" value={appInfo ? `v${appInfo.version}` : '…'} />
          <Row label="Platform" value={appInfo?.platform ?? '…'} />
          <Row label="Mode" value={appInfo ? (appInfo.isDev ? 'development' : 'production') : '…'} />

          <div className="border-t border-border-subtle pt-4">
            <Row
              label={
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  Renderer node access
                </span>
              }
              value={
                hasNodeAccess === null ? (
                  '…'
                ) : hasNodeAccess ? (
                  <span className="text-error">UNSAFE — security broken</span>
                ) : (
                  <span className="text-success">none (locked)</span>
                )
              }
              monospace
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-6 space-y-4">
          <h2 className="text-md font-medium">Theme</h2>
          <p className="text-sm text-muted">
            Currently rendering in <strong>{isDark ? 'dark' : 'light'}</strong> mode.
          </p>
          <div className="flex gap-2">
            <ThemeButton
              source="system"
              current={themeSource}
              onClick={() => setSource('system')}
              icon={<Monitor className="h-3.5 w-3.5" />}
              label="System"
            />
            <ThemeButton
              source="light"
              current={themeSource}
              onClick={() => setSource('light')}
              icon={<Sun className="h-3.5 w-3.5" />}
              label="Light"
            />
            <ThemeButton
              source="dark"
              current={themeSource}
              onClick={() => setSource('dark')}
              icon={<Moon className="h-3.5 w-3.5" />}
              label="Dark"
            />
          </div>
        </section>

        <footer className="text-xs text-subtle">
          Bridge reads your config locally and never phones home.
        </footer>
      </motion.div>
    </div>
  );
}

function Row({
  label,
  value,
  monospace = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  monospace?: boolean;
}): JSX.Element {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={cn(monospace ? 'font-mono text-xs' : '', 'text-text')}>{value}</span>
    </div>
  );
}

function ThemeButton({
  source,
  current,
  onClick,
  icon,
  label,
}: {
  source: ThemeSource;
  current: ThemeSource;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}): JSX.Element {
  const active = source === current;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors duration-fast ease-out',
        active
          ? 'border-accent/50 bg-accent/10 text-accent'
          : 'border-border bg-surface-raised text-muted hover:bg-surface-raised hover:text-text',
      )}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  );
}
