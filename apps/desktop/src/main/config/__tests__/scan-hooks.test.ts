import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CLAUDE_PATHS } from '../paths';
import { scanHooks, stableHookId } from '../scan-hooks';

beforeAll(() => {
  if (!process.env.BRIDGE_CLAUDE_HOME) {
    throw new Error('BRIDGE_CLAUDE_HOME not set — refusing to run hook tests');
  }
});

beforeEach(async () => {
  await rm(CLAUDE_PATHS.home, { recursive: true, force: true });
  await mkdir(CLAUDE_PATHS.home, { recursive: true });
});

afterEach(async () => {
  await rm(CLAUDE_PATHS.home, { recursive: true, force: true });
});

const emptyState = { hookDescriptions: {}, disabledHooks: {} };

describe('scanHooks — settings.json hooks tree', () => {
  it('returns one StackItem per command entry across event types and matchers', async () => {
    await writeSettings({
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [{ type: 'command', command: 'echo about to bash' }],
          },
        ],
        Stop: [
          { hooks: [{ type: 'command', command: 'play sound' }] },
        ],
      },
    });

    const items = await scanHooks(emptyState);
    expect(items).toHaveLength(2);

    const bash = items.find((it) => it.metadata.matcher === 'Bash');
    expect(bash).toBeDefined();
    expect(bash!.metadata.eventType).toBe('PreToolUse');
    expect(bash!.metadata.command).toBe('echo about to bash');
    expect(bash!.name).toBe('Bash · PreToolUse');
    expect(bash!.status).toBe('active');

    const stop = items.find((it) => it.metadata.eventType === 'Stop');
    expect(stop).toBeDefined();
    expect(stop!.metadata.matcher).toBeUndefined();
    expect(stop!.name.startsWith('Stop · ')).toBe(true);
  });

  it('uses user-supplied descriptions from sidecar state', async () => {
    await writeSettings({
      hooks: {
        Stop: [{ hooks: [{ type: 'command', command: 'play sound' }] }],
      },
    });

    const id = stableHookId('Stop', undefined, 'play sound');
    const items = await scanHooks({
      hookDescriptions: { [id]: 'Plays a chime when Claude stops.' },
      disabledHooks: {},
    });

    expect(items[0]!.description).toBe('Plays a chime when Claude stops.');
  });

  it('still surfaces disabled hooks from the sidecar (with status="disabled")', async () => {
    // settings.json has no hooks, but the sidecar remembers a disabled one.
    await writeSettings({});

    const id = stableHookId('PreToolUse', 'Bash', 'log it');
    const items = await scanHooks({
      hookDescriptions: {},
      disabledHooks: {
        [id]: { eventType: 'PreToolUse', matcher: 'Bash', command: 'log it', type: 'command' },
      },
    });

    expect(items).toHaveLength(1);
    expect(items[0]!.status).toBe('disabled');
    expect(items[0]!.metadata.command).toBe('log it');
  });

  it('skips malformed entries instead of throwing', async () => {
    await writeSettings({
      hooks: {
        PreToolUse: [
          'not-an-object',
          { hooks: 'not-an-array' },
          {
            matcher: 'Bash',
            hooks: [
              null,
              { type: 'command' /* missing command */ },
              { type: 'command', command: 'good' },
            ],
          },
        ],
      },
    });

    const items = await scanHooks(emptyState);
    expect(items).toHaveLength(1);
    expect(items[0]!.metadata.command).toBe('good');
  });

  it('returns an empty list when settings.json is missing', async () => {
    const items = await scanHooks(emptyState);
    expect(items).toEqual([]);
  });
});

describe('stableHookId', () => {
  it('returns the same id for the same triple', () => {
    expect(stableHookId('PreToolUse', 'Bash', 'echo')).toBe(
      stableHookId('PreToolUse', 'Bash', 'echo'),
    );
  });

  it('differentiates between matcher set and matcher unset', () => {
    expect(stableHookId('Stop', undefined, 'cmd')).not.toBe(
      stableHookId('Stop', '', 'cmd'),
    );
  });
});

async function writeSettings(value: unknown): Promise<void> {
  await mkdir(dirname(CLAUDE_PATHS.settingsJson), { recursive: true });
  await writeFile(CLAUDE_PATHS.settingsJson, JSON.stringify(value, null, 2), 'utf8');
}
