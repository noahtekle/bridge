import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CLAUDE_PATHS } from '../paths';
import { ConfigWriter } from '../writer';
import { stableHookId } from '../scan-hooks';

import type { StackItem } from '@bridge/core';

let writer: ConfigWriter;

beforeAll(async () => {
  // Sanity check: setupFile must have pointed CLAUDE_HOME into a tmp dir.
  // Refusing to run otherwise prevents tests from ever clobbering real ~/.claude/.
  if (!process.env.BRIDGE_CLAUDE_HOME) {
    throw new Error('BRIDGE_CLAUDE_HOME not set — refusing to run writer tests');
  }
});

beforeEach(async () => {
  // Fresh tree for every test so backups + state don't leak between cases.
  await rm(CLAUDE_PATHS.home, { recursive: true, force: true });
  await rm(CLAUDE_PATHS.claudeJson, { force: true });
  await mkdir(CLAUDE_PATHS.home, { recursive: true });
  writer = new ConfigWriter();
});

afterEach(async () => {
  await rm(CLAUDE_PATHS.home, { recursive: true, force: true });
  await rm(CLAUDE_PATHS.claudeJson, { force: true });
});

// ──────────────────────────────────────────────────────────────────────────
// Plugin toggle
// ──────────────────────────────────────────────────────────────────────────

describe('togglePlugin', () => {
  it('flips enabledPlugins[name] from true → false', async () => {
    await writeJson(CLAUDE_PATHS.settingsJson, {
      enabledPlugins: { 'firecrawl@firecrawl': true },
    });

    const item = pluginItem('firecrawl@firecrawl');
    const result = await writer.togglePlugin(item, false);

    expect(result.ok).toBe(true);
    expect(result.needsRestart).toBe(true);
    const updated = await readJson(CLAUDE_PATHS.settingsJson);
    expect(updated.enabledPlugins['firecrawl@firecrawl']).toBe(false);
  });

  it('flips enabledPlugins[name] from false → true', async () => {
    await writeJson(CLAUDE_PATHS.settingsJson, {
      enabledPlugins: { 'claude-mem@thedotmack': false },
    });

    const item = pluginItem('claude-mem@thedotmack');
    const result = await writer.togglePlugin(item, true);

    expect(result.ok).toBe(true);
    const updated = await readJson(CLAUDE_PATHS.settingsJson);
    expect(updated.enabledPlugins['claude-mem@thedotmack']).toBe(true);
  });

  it('writes a backup before mutating', async () => {
    await writeJson(CLAUDE_PATHS.settingsJson, {
      enabledPlugins: { 'firecrawl@firecrawl': true },
    });

    const item = pluginItem('firecrawl@firecrawl');
    const result = await writer.togglePlugin(item, false);

    expect(result.backupPath).toBeDefined();
    expect(existsSync(result.backupPath!)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// MCP toggle
// ──────────────────────────────────────────────────────────────────────────

describe('toggleMcp', () => {
  it('removes the entry when toggled off', async () => {
    await writeJson(CLAUDE_PATHS.claudeJson, {
      mcpServers: {
        magic: { command: 'cmd', args: ['/c', 'npx'] },
        firecrawl: { command: 'firecrawl-mcp' },
      },
    });

    const item = mcpItem('magic');
    const result = await writer.toggleMcp(item, false);

    expect(result.ok).toBe(true);
    const updated = await readJson(CLAUDE_PATHS.claudeJson);
    expect(updated.mcpServers.magic).toBeUndefined();
    expect(updated.mcpServers.firecrawl).toBeDefined();
  });

  it('restores the entry from the most recent backup when toggled back on', async () => {
    const original = { command: 'cmd', args: ['/c', 'npx', '-y', '@21st-dev/magic@latest'] };
    await writeJson(CLAUDE_PATHS.claudeJson, {
      mcpServers: { magic: original },
    });

    const item = mcpItem('magic');
    await writer.toggleMcp(item, false);
    const result = await writer.toggleMcp(item, true);

    expect(result.ok).toBe(true);
    const restored = await readJson(CLAUDE_PATHS.claudeJson);
    expect(restored.mcpServers.magic).toEqual(original);
  });

  it('fails cleanly when no backup contains the named MCP', async () => {
    await writeJson(CLAUDE_PATHS.claudeJson, { mcpServers: {} });

    const item = mcpItem('never-existed');
    const result = await writer.toggleMcp(item, true);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('No backup');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// File-based toggle (skill / agent / command share the same code path)
// ──────────────────────────────────────────────────────────────────────────

describe('toggleFileItem', () => {
  it('moves a skill folder into .disabled/ when toggled off', async () => {
    const skillDir = join(CLAUDE_PATHS.skillsRoot, 'autoplan');
    await mkdir(skillDir, { recursive: true });
    await writeFile(
      join(skillDir, 'SKILL.md'),
      '---\nname: autoplan\ndescription: auto review\n---\n',
    );

    const item = skillItem('autoplan', skillDir);
    const result = await writer.toggleFileItem(item, false);

    expect(result.ok).toBe(true);
    expect(existsSync(skillDir)).toBe(false);
    expect(existsSync(join(CLAUDE_PATHS.skillsRoot, '.disabled', 'autoplan', 'SKILL.md'))).toBe(
      true,
    );
  });

  it('moves a skill folder back out of .disabled/ when toggled on', async () => {
    const disabledDir = join(CLAUDE_PATHS.skillsRoot, '.disabled', 'autoplan');
    await mkdir(disabledDir, { recursive: true });
    await writeFile(join(disabledDir, 'SKILL.md'), 'frontmatter');

    const item = skillItem('autoplan', disabledDir, 'disabled');
    const result = await writer.toggleFileItem(item, true);

    expect(result.ok).toBe(true);
    expect(existsSync(disabledDir)).toBe(false);
    expect(existsSync(join(CLAUDE_PATHS.skillsRoot, 'autoplan', 'SKILL.md'))).toBe(true);
  });

  it('moves an agent .md into agents/.disabled/', async () => {
    await mkdir(CLAUDE_PATHS.agentsRoot, { recursive: true });
    const agentFile = join(CLAUDE_PATHS.agentsRoot, 'reviewer.md');
    await writeFile(agentFile, '---\nname: reviewer\n---\n');

    const item: StackItem = {
      id: 'a1',
      category: 'agent',
      name: 'reviewer',
      description: '',
      source: 'user',
      status: 'active',
      needsRestart: false,
      filePath: agentFile,
      configPath: { file: agentFile },
      metadata: {},
    };
    const result = await writer.toggleFileItem(item, false);

    expect(result.ok).toBe(true);
    expect(existsSync(agentFile)).toBe(false);
    expect(existsSync(join(CLAUDE_PATHS.agentsRoot, '.disabled', 'reviewer.md'))).toBe(true);
  });

  it('is a no-op when item is already in the requested state', async () => {
    const skillDir = join(CLAUDE_PATHS.skillsRoot, 'idempotent');
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), '---\nname: idempotent\n---\n');

    const item = skillItem('idempotent', skillDir);
    const result = await writer.toggleFileItem(item, true); // already active

    expect(result.ok).toBe(true);
    expect(existsSync(skillDir)).toBe(true); // untouched
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Delete
// ──────────────────────────────────────────────────────────────────────────

describe('deleteItem', () => {
  it('refuses to delete a plugin (managed by Claude Code)', async () => {
    const item = pluginItem('firecrawl@firecrawl');
    const result = await writer.deleteItem(item);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Claude Code');
  });

  it('removes an MCP entry from claude.json + writes a backup', async () => {
    await writeJson(CLAUDE_PATHS.claudeJson, {
      mcpServers: { magic: { command: 'cmd' } },
    });

    const item = mcpItem('magic');
    const result = await writer.deleteItem(item);

    expect(result.ok).toBe(true);
    expect(result.backupPath).toBeDefined();
    const updated = await readJson(CLAUDE_PATHS.claudeJson);
    expect(updated.mcpServers.magic).toBeUndefined();
  });

  it('removes a skill folder from disk + keeps a backup', async () => {
    const skillDir = join(CLAUDE_PATHS.skillsRoot, 'doomed');
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), 'content');

    const item = skillItem('doomed', skillDir);
    const result = await writer.deleteItem(item);

    expect(result.ok).toBe(true);
    expect(existsSync(skillDir)).toBe(false);
    expect(result.backupPath).toBeDefined();
    expect(existsSync(result.backupPath!)).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Update description
// ──────────────────────────────────────────────────────────────────────────

describe('updateDescription', () => {
  it("rewrites the SKILL.md frontmatter's description field", async () => {
    const skillDir = join(CLAUDE_PATHS.skillsRoot, 'editable');
    await mkdir(skillDir, { recursive: true });
    const skillFile = join(skillDir, 'SKILL.md');
    await writeFile(skillFile, '---\nname: editable\ndescription: old text\n---\n\nBody.\n');

    const item = skillItem('editable', skillDir);
    const result = await writer.updateDescription(item, 'new shiny text');

    expect(result.ok).toBe(true);
    const next = await readFile(skillFile, 'utf8');
    expect(next).toContain('description: new shiny text');
    expect(next).not.toContain('description: old text');
    expect(next).toContain('Body.');
  });

  it('refuses for MCPs (deferred to W3)', async () => {
    const item = mcpItem('magic');
    const result = await writer.updateDescription(item, 'whatever');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Week 3');
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Hooks
// ──────────────────────────────────────────────────────────────────────────

describe('removeHookFromClaude', () => {
  it('removes a hook entry and captures it for restore', async () => {
    await writeJson(CLAUDE_PATHS.settingsJson, {
      hooks: {
        PreToolUse: [
          { matcher: 'Bash', hooks: [{ type: 'command', command: 'log it' }] },
        ],
      },
    });

    const item = hookItem('PreToolUse', 'Bash', 'log it');
    const result = await writer.removeHookFromClaude(item);

    expect(result.ok).toBe(true);
    expect(result.captured).toEqual({
      eventType: 'PreToolUse',
      matcher: 'Bash',
      command: 'log it',
      type: 'command',
      passthrough: undefined,
    });
    const updated = await readJson(CLAUDE_PATHS.settingsJson);
    expect((updated as { hooks?: Record<string, unknown> }).hooks).toBeUndefined();
  });

  it("preserves sibling hooks when removing one of many", async () => {
    await writeJson(CLAUDE_PATHS.settingsJson, {
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [
              { type: 'command', command: 'log a' },
              { type: 'command', command: 'log b' },
            ],
          },
        ],
      },
    });

    const itemA = hookItem('PreToolUse', 'Bash', 'log a');
    await writer.removeHookFromClaude(itemA);

    const remaining = (await readJson(CLAUDE_PATHS.settingsJson)) as {
      hooks: { PreToolUse: Array<{ hooks: Array<{ command: string }> }> };
    };
    expect(remaining.hooks.PreToolUse[0]!.hooks).toHaveLength(1);
    expect(remaining.hooks.PreToolUse[0]!.hooks[0]!.command).toBe('log b');
  });

  it('preserves passthrough fields on the captured entry', async () => {
    await writeJson(CLAUDE_PATHS.settingsJson, {
      hooks: {
        PreToolUse: [
          {
            matcher: 'Edit',
            hooks: [
              {
                type: 'command',
                command: 'do thing',
                timeout: 5000,
                customMeta: { tag: 'foo' },
              },
            ],
          },
        ],
      },
    });

    const item = hookItem('PreToolUse', 'Edit', 'do thing');
    const result = await writer.removeHookFromClaude(item);

    expect(result.captured?.passthrough).toEqual({
      timeout: 5000,
      customMeta: { tag: 'foo' },
    });
  });

  it('fails cleanly when the hook is no longer in settings.json', async () => {
    await writeJson(CLAUDE_PATHS.settingsJson, { hooks: {} });

    const item = hookItem('PreToolUse', 'Bash', 'gone');
    const result = await writer.removeHookFromClaude(item);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('not found');
  });
});

describe('restoreHookToClaude', () => {
  it('adds a hook entry to a fresh event type', async () => {
    await writeJson(CLAUDE_PATHS.settingsJson, {});

    const result = await writer.restoreHookToClaude({
      eventType: 'Stop',
      matcher: undefined,
      command: 'chime',
      type: 'command',
    });

    expect(result.ok).toBe(true);
    const updated = (await readJson(CLAUDE_PATHS.settingsJson)) as {
      hooks: { Stop: Array<{ matcher?: string; hooks: Array<{ command: string }> }> };
    };
    expect(updated.hooks.Stop).toHaveLength(1);
    expect(updated.hooks.Stop[0]!.matcher).toBeUndefined();
    expect(updated.hooks.Stop[0]!.hooks[0]!.command).toBe('chime');
  });

  it('merges into an existing matcher group instead of duplicating', async () => {
    await writeJson(CLAUDE_PATHS.settingsJson, {
      hooks: {
        PreToolUse: [
          { matcher: 'Bash', hooks: [{ type: 'command', command: 'log a' }] },
        ],
      },
    });

    await writer.restoreHookToClaude({
      eventType: 'PreToolUse',
      matcher: 'Bash',
      command: 'log b',
      type: 'command',
    });

    const updated = (await readJson(CLAUDE_PATHS.settingsJson)) as {
      hooks: { PreToolUse: Array<{ matcher?: string; hooks: Array<{ command: string }> }> };
    };
    expect(updated.hooks.PreToolUse).toHaveLength(1); // single group, not two
    expect(updated.hooks.PreToolUse[0]!.hooks).toHaveLength(2);
    expect(updated.hooks.PreToolUse[0]!.hooks.map((h) => h.command)).toEqual(['log a', 'log b']);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Concurrency / queue
// ──────────────────────────────────────────────────────────────────────────

describe('serialized queue', () => {
  it('processes overlapping mutations one-at-a-time without tearing the file', async () => {
    await writeJson(CLAUDE_PATHS.settingsJson, {
      enabledPlugins: { 'a': true, 'b': true, 'c': true, 'd': true },
    });

    const items = ['a', 'b', 'c', 'd'].map((n) => pluginItem(n));
    const results = await Promise.all(items.map((it) => writer.togglePlugin(it, false)));

    expect(results.every((r) => r.ok)).toBe(true);
    const final = await readJson(CLAUDE_PATHS.settingsJson);
    expect(final.enabledPlugins).toEqual({ a: false, b: false, c: false, d: false });
  });

  it('does not let one failed mutation stall the queue', async () => {
    await writeJson(CLAUDE_PATHS.claudeJson, { mcpServers: {} });

    const failing = await writer.toggleMcp(mcpItem('does-not-exist'), true);
    expect(failing.ok).toBe(false);

    // After the failure, a subsequent mutation should still succeed.
    await writeJson(CLAUDE_PATHS.settingsJson, { enabledPlugins: { x: true } });
    const ok = await writer.togglePlugin(pluginItem('x'), false);
    expect(ok.ok).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), 'utf8');
}

async function readJson(path: string): Promise<{ enabledPlugins: Record<string, boolean>; mcpServers: Record<string, unknown> }> {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

// noinspection JSUnusedLocalSymbols
void stat; // satisfies the import for future helpers

function pluginItem(fullName: string): StackItem {
  const [shortName, marketplace] = splitName(fullName);
  return {
    id: `p:${fullName}`,
    category: 'plugin',
    name: shortName,
    description: '',
    source: marketplace === 'claude-plugins-official' ? 'official' : 'plugin',
    sourceRef: fullName,
    status: 'active',
    needsRestart: false,
    configPath: { file: CLAUDE_PATHS.settingsJson, jsonPath: `enabledPlugins["${fullName}"]` },
    metadata: {},
  };
}

function splitName(fullName: string): [string, string | undefined] {
  const at = fullName.lastIndexOf('@');
  if (at === -1) return [fullName, undefined];
  return [fullName.slice(0, at), fullName.slice(at + 1)];
}

function mcpItem(name: string): StackItem {
  return {
    id: `m:${name}`,
    category: 'mcp',
    name,
    description: '',
    source: 'user',
    status: 'active',
    needsRestart: false,
    configPath: { file: CLAUDE_PATHS.claudeJson, jsonPath: `mcpServers.${name}` },
    metadata: {},
  };
}

function hookItem(
  eventType: string,
  matcher: string | undefined,
  command: string,
): StackItem {
  return {
    id: stableHookId(eventType, matcher, command),
    category: 'hook',
    name: matcher ? `${matcher} · ${eventType}` : eventType,
    description: '',
    source: 'user',
    status: 'active',
    needsRestart: false,
    configPath: { file: CLAUDE_PATHS.settingsJson, jsonPath: `hooks.${eventType}` },
    metadata: { eventType, matcher, command, type: 'command' },
  };
}

function skillItem(
  name: string,
  filePath: string,
  status: StackItem['status'] = 'active',
): StackItem {
  return {
    id: `s:${name}`,
    category: 'skill',
    name,
    description: '',
    source: 'user',
    status,
    needsRestart: false,
    filePath,
    configPath: { file: filePath },
    metadata: {},
  };
}
