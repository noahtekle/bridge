import { AnimatePresence, motion } from 'framer-motion';
import { Monitor, Moon, Shield, Sun, X } from 'lucide-react';
import { useEffect } from 'react';

import type { ThemeSource } from '@bridge/core';

import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/store/settings';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  onShowPrivacy: () => void;
}

export function SettingsPanel({ open, onClose, onShowPrivacy }: SettingsPanelProps): JSX.Element {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && <Body onClose={onClose} onShowPrivacy={onShowPrivacy} />}
    </AnimatePresence>
  );
}

function Body({
  onClose,
  onShowPrivacy,
}: {
  onClose: () => void;
  onShowPrivacy: () => void;
}): JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 px-6 py-10"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/50"
        role="dialog"
        aria-label="Settings"
      >
        <header className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <h2 className="text-md font-semibold text-text">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-muted transition-colors duration-fast hover:bg-surface-raised hover:text-text"
            aria-label="Close settings"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <Section title="Appearance">
            <Row label="Theme">
              <ThemePicker
                value={settings.themeSource}
                onChange={(v) => {
                  void update({ themeSource: v });
                  window.bridge.setThemeSource(v);
                }}
              />
            </Row>
          </Section>

          <Section title="Backups">
            <Row
              label="Retain backups"
              hint="Bridge keeps whichever set is more permissive."
            >
              <div className="flex items-center gap-3 text-sm">
                <NumberInput
                  value={settings.backupRetentionCount}
                  min={1}
                  max={500}
                  onChange={(n) => void update({ backupRetentionCount: n })}
                />
                <span className="text-subtle">snapshots, or last</span>
                <NumberInput
                  value={settings.backupRetentionDays}
                  min={1}
                  max={365}
                  onChange={(n) => void update({ backupRetentionDays: n })}
                />
                <span className="text-subtle">days</span>
              </div>
            </Row>
          </Section>

          <Section title="Scanning">
            <Row
              label="Scan when window regains focus"
              hint="Off if you'd rather rely on file watching only."
            >
              <Toggle
                checked={settings.scanOnFocus}
                onChange={(v) => void update({ scanOnFocus: v })}
              />
            </Row>
          </Section>

          <Section title="Privacy">
            <button
              type="button"
              onClick={onShowPrivacy}
              className="flex w-full cursor-pointer items-center justify-between rounded-md border border-border bg-bg px-3 py-2.5 text-sm text-muted transition-colors duration-fast hover:bg-surface-raised hover:text-text"
            >
              <span className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" strokeWidth={1.75} />
                What Bridge reads and writes
              </span>
              <span className="text-xs text-subtle">View →</span>
            </button>
          </Section>
        </div>

        <footer className="border-t border-border-subtle px-5 py-3 text-xs text-subtle">
          Settings save automatically. Bridge never phones home.
        </footer>
      </motion.div>
    </motion.div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="space-y-2.5">
      <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex-1 min-w-[180px]">
        <div className="text-sm text-text">{label}</div>
        {hint && <div className="text-xs text-subtle">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeSource;
  onChange: (v: ThemeSource) => void;
}): JSX.Element {
  return (
    <div className="flex gap-1 rounded-md border border-border bg-bg p-0.5">
      <PickerButton active={value === 'system'} onClick={() => onChange('system')} icon={<Monitor className="h-3.5 w-3.5" strokeWidth={1.75} />}>
        System
      </PickerButton>
      <PickerButton active={value === 'light'} onClick={() => onChange('light')} icon={<Sun className="h-3.5 w-3.5" strokeWidth={1.75} />}>
        Light
      </PickerButton>
      <PickerButton active={value === 'dark'} onClick={() => onChange('dark')} icon={<Moon className="h-3.5 w-3.5" strokeWidth={1.75} />}>
        Dark
      </PickerButton>
    </div>
  );
}

function PickerButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors duration-fast',
        active ? 'bg-surface-raised text-text' : 'text-muted hover:text-text',
      )}
      aria-pressed={active}
    >
      {icon}
      {children}
    </button>
  );
}

function NumberInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}): JSX.Element {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10);
        if (Number.isFinite(n) && n >= min && n <= max) onChange(n);
      }}
      className="w-20 rounded-md border border-border bg-bg px-2 py-1 text-center text-sm text-text outline-none focus:border-accent/60"
    />
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex h-[18px] w-8 cursor-pointer items-center rounded-full p-[2px] transition-colors duration-fast',
        checked ? 'justify-end bg-success' : 'justify-start bg-disabled',
      )}
    >
      <span
        className={cn(
          'h-[14px] w-[14px] rounded-full',
          checked ? 'bg-white' : 'bg-subtle',
        )}
      />
    </button>
  );
}
