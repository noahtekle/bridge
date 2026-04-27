import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { app } from 'electron';

import { DEFAULT_SETTINGS, type BridgeSettings } from '@bridge/core';

import { atomicWriteJson } from './config/atomic';

/**
 * App-level user settings persisted to <userData>/bridge-settings.json.
 *
 * Distinct from ~/.claude/settings.json which is Claude Code's territory.
 * Bridge owns its own preferences file under Electron's userData dir so
 * uninstalling Bridge cleans up after itself and so we don't pollute the
 * user's Claude config.
 */
let cached: BridgeSettings | null = null;

function settingsPath(): string {
  return join(app.getPath('userData'), 'bridge-settings.json');
}

export async function loadSettings(): Promise<BridgeSettings> {
  if (cached) return cached;
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<BridgeSettings>;
    // Always merge defaults so new fields appear automatically with sensible defaults
    // when an older settings file is loaded.
    cached = { ...DEFAULT_SETTINGS, ...parsed };
    return cached;
  } catch {
    cached = { ...DEFAULT_SETTINGS };
    return cached;
  }
}

export async function updateSettings(partial: Partial<BridgeSettings>): Promise<BridgeSettings> {
  const current = await loadSettings();
  const next: BridgeSettings = { ...current, ...partial };
  cached = next;
  const target = settingsPath();
  await mkdir(dirname(target), { recursive: true });
  await atomicWriteJson(target, next);
  return next;
}
