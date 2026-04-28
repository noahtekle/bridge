import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, join, sep } from 'node:path';

import matter from 'gray-matter';
import { readFile } from 'node:fs/promises';

import type { DisabledHookEntry, StackItem, MutationResult } from '@bridge/core';

import { atomicWriteJson, atomicWriteText } from './atomic';
import { backupForMutation } from './backup';
import { CLAUDE_PATHS, DISABLED_DIR } from './paths';
import { isRecord, readJsonSafe } from './read-json';
import { stableHookId } from './scan-hooks';

/**
 * All mutating operations funnel through this class. Two reasons:
 *  1. Single serialization point — only one mutation runs at a time, so we
 *     never tear ~/.claude.json by interleaving two writes.
 *  2. Single backup-first guarantee — every public method enforces it,
 *     so we can never ship a code path that mutates without snapshotting
 *     first.
 */
export class ConfigWriter {
  private queue: Promise<unknown> = Promise.resolve();

  togglePlugin(item: StackItem, enabled: boolean): Promise<MutationResult> {
    return this.enqueue(async () => this.runTogglePlugin(item, enabled));
  }

  toggleMcp(item: StackItem, enabled: boolean): Promise<MutationResult> {
    return this.enqueue(async () => this.runToggleMcp(item, enabled));
  }

  toggleFileItem(item: StackItem, enabled: boolean): Promise<MutationResult> {
    return this.enqueue(async () => this.runToggleFileItem(item, enabled));
  }

  /**
   * Hook toggles work via two coordinated edits — settings.json gets the
   * entry removed/restored, and Bridge's own state file remembers the
   * disabled content. Caller (main/index.ts) persists the sidecar so this
   * class stays free of <userData> coupling.
   */
  removeHookFromClaude(item: StackItem): Promise<MutationResult & { captured?: DisabledHookEntry }> {
    return this.enqueue(async () => this.runRemoveHook(item));
  }

  restoreHookToClaude(entry: DisabledHookEntry): Promise<MutationResult> {
    return this.enqueue(async () => this.runAddHook(entry));
  }

  deleteHookFromClaude(item: StackItem): Promise<MutationResult> {
    return this.enqueue(async () => this.runRemoveHook(item).then(({ ok, backupPath, error }) => ({ ok, backupPath, needsRestart: false, error })));
  }

  deleteItem(item: StackItem): Promise<MutationResult> {
    return this.enqueue(async () => this.runDelete(item));
  }

  updateDescription(item: StackItem, description: string): Promise<MutationResult> {
    return this.enqueue(async () => this.runUpdateDescription(item, description));
  }

  // ──────────────────────────────────────────────────────────────────────
  // Implementations
  // ──────────────────────────────────────────────────────────────────────

  private async runTogglePlugin(item: StackItem, enabled: boolean): Promise<MutationResult> {
    const sourceRef = item.sourceRef;
    if (!sourceRef) return error('Plugin has no sourceRef');

    const backupPath = await backupForMutation(CLAUDE_PATHS.settingsJson);
    const settings = (await readJsonSafe(CLAUDE_PATHS.settingsJson)) ?? {};
    if (!isRecord(settings)) return error('settings.json is malformed');

    const enabledMap = isRecord(settings.enabledPlugins) ? { ...settings.enabledPlugins } : {};
    enabledMap[sourceRef] = enabled;
    settings.enabledPlugins = enabledMap;

    await atomicWriteJson(CLAUDE_PATHS.settingsJson, settings);
    return { ok: true, backupPath, needsRestart: true };
  }

  private async runToggleMcp(item: StackItem, enabled: boolean): Promise<MutationResult> {
    const backupPath = await backupForMutation(CLAUDE_PATHS.claudeJson);
    const data = (await readJsonSafe(CLAUDE_PATHS.claudeJson)) ?? {};
    if (!isRecord(data)) return error('.claude.json is malformed');

    const mcps = isRecord(data.mcpServers) ? { ...data.mcpServers } : {};

    if (enabled) {
      // Restore from the most recent backup that contained this MCP.
      const restored = await readMcpFromBackup(item.name);
      if (!restored) {
        return error(`No backup found for MCP "${item.name}"`);
      }
      mcps[item.name] = restored;
    } else {
      // Removing — backup was already snapshotted above, so we can safely drop.
      delete mcps[item.name];
    }

    data.mcpServers = mcps;
    await atomicWriteJson(CLAUDE_PATHS.claudeJson, data);
    return { ok: true, backupPath, needsRestart: true };
  }

  private async runToggleFileItem(item: StackItem, enabled: boolean): Promise<MutationResult> {
    if (!item.filePath) return error('Item has no filePath');

    const filePath = item.filePath;
    const dir = dirname(filePath);
    const file = basename(filePath);

    const fromDir = enabled ? join(dir, DISABLED_DIR === basename(dir) ? '..' : '..', DISABLED_DIR) : dir;
    // Actual semantics: if currently in a `.disabled` folder, we want to
    // move it back into the parent. If currently active, we move it into
    // a `.disabled` sibling. Compute that explicitly to avoid the `..` trick:
    const inDisabled = isInDisabled(filePath);
    const targetDir = enabled
      ? (inDisabled ? dirname(dir) : dir) // moving back to active = parent of `.disabled`
      : (inDisabled ? dir : join(dir, DISABLED_DIR)); // moving to disabled = sibling

    if ((enabled && !inDisabled) || (!enabled && inDisabled)) {
      // Already in the requested state — no-op.
      return { ok: true, needsRestart: false };
    }

    const dest = join(targetDir, file);

    // Backup the source before moving (in case the move fails partway through
    // a directory copy on Windows due to file locking).
    const backupPath = await backupForMutation(filePath);
    await mkdir(targetDir, { recursive: true });
    await rename(filePath, dest);

    return { ok: true, backupPath, needsRestart: false };
  }

  private async runDelete(item: StackItem): Promise<MutationResult> {
    if (item.category === 'plugin') {
      return error('Plugins are managed via Claude Code — uninstall there.');
    }

    if (item.category === 'mcp') {
      const backupPath = await backupForMutation(CLAUDE_PATHS.claudeJson);
      const data = (await readJsonSafe(CLAUDE_PATHS.claudeJson)) ?? {};
      if (!isRecord(data)) return error('.claude.json is malformed');
      const mcps = isRecord(data.mcpServers) ? { ...data.mcpServers } : {};
      delete mcps[item.name];
      data.mcpServers = mcps;
      await atomicWriteJson(CLAUDE_PATHS.claudeJson, data);
      return { ok: true, backupPath, needsRestart: true };
    }

    // File-based: delete the file/folder, but keep a backup so the user can
    // restore. Backups already get rotated, so this doesn't grow unbounded.
    if (!item.filePath) return error('Item has no filePath');
    const backupPath = await backupForMutation(item.filePath);
    await rm(item.filePath, { recursive: true, force: true });
    return { ok: true, backupPath, needsRestart: false };
  }

  private async runUpdateDescription(item: StackItem, description: string): Promise<MutationResult> {
    if (item.category === 'hook') {
      // Hooks have no native description field; the IPC handler in
      // main/index.ts writes the description into bridge-settings.json
      // sidecar, then triggers a rescan. This branch shouldn't normally be
      // reached — the routing layer catches it first — but we keep it as a
      // defensive fallback so callers get a clear error.
      return error('Hook descriptions are stored in Bridge state, not settings.json');
    }
    if (item.category === 'mcp' || item.category === 'plugin') {
      return error('Inline description editing for MCPs/Plugins lands in Week 3.');
    }
    if (!item.filePath) return error('Item has no filePath');

    const targetFile = item.category === 'skill' ? join(item.filePath, 'SKILL.md') : item.filePath;
    const stats = await stat(targetFile).catch(() => null);
    if (!stats?.isFile()) return error('Source file not found');

    const backupPath = await backupForMutation(targetFile);
    const original = await readFile(targetFile, 'utf8');
    const parsed = matter(original);
    parsed.data.description = description;
    const next = matter.stringify(parsed.content, parsed.data);
    await atomicWriteText(targetFile, next);
    return { ok: true, backupPath, needsRestart: false };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Hooks
  // ──────────────────────────────────────────────────────────────────────

  private async runRemoveHook(
    item: StackItem,
  ): Promise<MutationResult & { captured?: DisabledHookEntry }> {
    if (item.category !== 'hook') return error('Not a hook');

    const meta = item.metadata as {
      eventType?: string;
      matcher?: string;
      command?: string;
      type?: string;
    };
    if (!meta.eventType || !meta.command) return error('Hook is missing event type or command');

    const backupPath = await backupForMutation(CLAUDE_PATHS.settingsJson);
    const settings = (await readJsonSafe(CLAUDE_PATHS.settingsJson)) ?? {};
    if (!isRecord(settings)) return error('settings.json is malformed');

    const hooks = isRecord(settings.hooks) ? { ...settings.hooks } : {};
    const eventList = Array.isArray(hooks[meta.eventType]) ? [...(hooks[meta.eventType] as unknown[])] : [];

    let captured: DisabledHookEntry | undefined;
    const updated: unknown[] = [];

    for (const group of eventList) {
      if (!isRecord(group)) {
        updated.push(group);
        continue;
      }
      const matcher = typeof group.matcher === 'string' ? group.matcher : undefined;
      const list = Array.isArray(group.hooks) ? [...group.hooks] : [];
      const filtered: unknown[] = [];
      for (const entry of list) {
        if (
          isRecord(entry) &&
          typeof entry.command === 'string' &&
          stableHookId(meta.eventType, matcher, entry.command) === item.id
        ) {
          captured = {
            eventType: meta.eventType,
            matcher,
            command: entry.command,
            type: typeof entry.type === 'string' ? entry.type : 'command',
            passthrough: extractPassthrough(entry),
          };
          continue; // drop this entry from the list
        }
        filtered.push(entry);
      }
      if (filtered.length > 0) {
        updated.push({ ...group, hooks: filtered });
      }
      // If a group becomes empty after the removal, drop it entirely.
    }

    if (!captured) {
      return error('Hook not found in settings.json (already removed?)');
    }

    if (updated.length > 0) {
      hooks[meta.eventType] = updated;
    } else {
      delete hooks[meta.eventType];
    }

    // Drop the `hooks` parent if it's now empty — keeps settings.json tidy
    // and matches what users would write by hand.
    if (Object.keys(hooks).length === 0) {
      delete settings.hooks;
    } else {
      settings.hooks = hooks;
    }

    await atomicWriteJson(CLAUDE_PATHS.settingsJson, settings);
    return { ok: true, backupPath, needsRestart: true, captured };
  }

  private async runAddHook(entry: DisabledHookEntry): Promise<MutationResult> {
    const backupPath = await backupForMutation(CLAUDE_PATHS.settingsJson);
    const settings = (await readJsonSafe(CLAUDE_PATHS.settingsJson)) ?? {};
    if (!isRecord(settings)) return error('settings.json is malformed');

    const hooks = isRecord(settings.hooks) ? { ...settings.hooks } : {};
    const eventList = Array.isArray(hooks[entry.eventType]) ? [...(hooks[entry.eventType] as unknown[])] : [];

    // Find an existing group with the same matcher to merge into; otherwise create one.
    const newHookEntry: Record<string, unknown> = {
      type: entry.type ?? 'command',
      command: entry.command,
      ...(entry.passthrough ?? {}),
    };

    let merged = false;
    const updated = eventList.map((group) => {
      if (merged || !isRecord(group)) return group;
      const matcher = typeof group.matcher === 'string' ? group.matcher : undefined;
      if (matcher === entry.matcher) {
        const list = Array.isArray(group.hooks) ? [...group.hooks, newHookEntry] : [newHookEntry];
        merged = true;
        return { ...group, hooks: list };
      }
      return group;
    });

    if (!merged) {
      const newGroup: Record<string, unknown> = { hooks: [newHookEntry] };
      if (entry.matcher !== undefined) newGroup.matcher = entry.matcher;
      updated.push(newGroup);
    }

    hooks[entry.eventType] = updated;
    settings.hooks = hooks;

    await atomicWriteJson(CLAUDE_PATHS.settingsJson, settings);
    return { ok: true, backupPath, needsRestart: true };
  }

  // ──────────────────────────────────────────────────────────────────────
  // Queue
  // ──────────────────────────────────────────────────────────────────────

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn, fn);
    // Swallow rejections in the chain so one failure doesn't poison subsequent mutations.
    this.queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }
}

function error(message: string): MutationResult {
  return { ok: false, needsRestart: false, error: message };
}

function isInDisabled(filePath: string): boolean {
  // Walk up the path and look for a `.disabled` segment.
  return filePath.split(sep).includes(DISABLED_DIR);
}

/**
 * Preserve unknown fields from a hook entry so we can round-trip on
 * disable/re-enable without losing user customization (e.g. timeout, etc.
 * — anything Claude Code may add later).
 */
function extractPassthrough(entry: Record<string, unknown>): Record<string, unknown> | undefined {
  const known = new Set(['type', 'command']);
  const extras: Record<string, unknown> = {};
  let any = false;
  for (const [k, v] of Object.entries(entry)) {
    if (!known.has(k)) {
      extras[k] = v;
      any = true;
    }
  }
  return any ? extras : undefined;
}

/**
 * Find the most recent backup that contained `mcpServers["${name}"]` and
 * return its raw entry. Used to restore an MCP that was toggled off.
 *
 * Reads in reverse-chronological order over the backup folders. Stops at
 * the first match.
 */
async function readMcpFromBackup(name: string): Promise<unknown> {
  const { readdir } = await import('node:fs/promises');
  const dirs = await readdir(CLAUDE_PATHS.backupsRoot).catch(() => [] as string[]);
  dirs.sort().reverse();

  for (const dir of dirs) {
    const candidatePath = mirrorBackupPath(join(CLAUDE_PATHS.backupsRoot, dir), CLAUDE_PATHS.claudeJson);
    const data = await readJsonSafe(candidatePath);
    if (isRecord(data) && isRecord(data.mcpServers) && name in data.mcpServers) {
      return data.mcpServers[name];
    }
  }
  return null;
}

/** Mirror function from backup.ts — kept private here to avoid a circular import. */
function mirrorBackupPath(backupDir: string, srcPath: string): string {
  const cleaned = srcPath.replace(/^[a-zA-Z]:/, '').replace(/^[/\\]+/, '');
  return join(backupDir, ...cleaned.split(/[\\/]+/));
}
