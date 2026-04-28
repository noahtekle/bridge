import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, join, sep } from 'node:path';

import matter from 'gray-matter';
import { readFile } from 'node:fs/promises';

import type { StackItem, MutationResult } from '@bridge/core';

import { atomicWriteJson, atomicWriteText } from './atomic';
import { backupForMutation } from './backup';
import { CLAUDE_PATHS, DISABLED_DIR } from './paths';
import { isRecord, readJsonSafe } from './read-json';

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
