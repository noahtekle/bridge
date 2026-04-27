import { copyFile, mkdir, readdir, readFile, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

import type { StackCategory } from '@bridge/core';

import { atomicWriteJson } from '../config/atomic';
import { backupForMutation } from '../config/backup';
import { CLAUDE_PATHS } from '../config/paths';
import { isRecord, readJsonSafe } from '../config/read-json';

export interface InstallResult {
  ok: boolean;
  /** Files that were created or merged. Used for the success screen. */
  installed: string[];
  /** Backup written before any merge into existing config files. */
  backupPath?: string;
  error?: string;
  /** When category === 'plugin', surface the install command for the user. */
  cliInstruction?: string;
}

/**
 * Copy detected items from the cloned working tree into ~/.claude/. For
 * skills/agents/commands this is a recursive file copy; for MCPs it's a
 * single key merge into ~/.claude.json. Plugins fall back to a CLI hint.
 */
export async function install(
  repoPath: string,
  category: StackCategory,
  name: string,
): Promise<InstallResult> {
  switch (category) {
    case 'plugin':
      return {
        ok: false,
        installed: [],
        cliInstruction: `claude plugin install <repo-url>`,
        error: 'Plugins must be installed via Claude Code',
      };
    case 'skill':
      return installSkill(repoPath, name);
    case 'agent':
      return installAgents(repoPath);
    case 'command':
      return installCommands(repoPath);
    case 'mcp':
      return installMcp(repoPath);
  }
}

async function installSkill(repoPath: string, name: string): Promise<InstallResult> {
  const dest = join(CLAUDE_PATHS.skillsRoot, name);
  await mkdir(dest, { recursive: true });
  const installed: string[] = [];
  await copyTree(repoPath, dest, installed, /* skipDotGit */ true);
  return { ok: true, installed };
}

async function installAgents(repoPath: string): Promise<InstallResult> {
  const srcDir = join(repoPath, 'agents');
  await mkdir(CLAUDE_PATHS.agentsRoot, { recursive: true });
  const installed = await copyMdOnly(srcDir, CLAUDE_PATHS.agentsRoot);
  return { ok: true, installed };
}

async function installCommands(repoPath: string): Promise<InstallResult> {
  const srcDir = join(repoPath, 'commands');
  await mkdir(CLAUDE_PATHS.commandsRoot, { recursive: true });
  const installed = await copyMdOnly(srcDir, CLAUDE_PATHS.commandsRoot);
  return { ok: true, installed };
}

/**
 * Find any json file in the repo containing an mcpServers field and merge
 * its entries into ~/.claude.json. Existing entries with the same name are
 * overwritten — the user is showing us they want the new version.
 */
async function installMcp(repoPath: string): Promise<InstallResult> {
  const candidates = ['mcp.json', '.mcp.json', 'claude_desktop_config.json'];
  let imported: Record<string, unknown> | null = null;

  for (const candidate of candidates) {
    const path = join(repoPath, candidate);
    try {
      const raw = await readFile(path, 'utf8');
      const data = JSON.parse(raw) as unknown;
      if (isRecord(data) && isRecord(data.mcpServers)) {
        imported = data.mcpServers;
        break;
      }
    } catch {
      /* skip */
    }
  }

  if (!imported || Object.keys(imported).length === 0) {
    return { ok: false, installed: [], error: 'No mcpServers entries found in repo' };
  }

  const backupPath = await backupForMutation(CLAUDE_PATHS.claudeJson);
  const current = (await readJsonSafe(CLAUDE_PATHS.claudeJson)) ?? {};
  if (!isRecord(current)) {
    return { ok: false, installed: [], error: '.claude.json is malformed' };
  }
  const mcps = isRecord(current.mcpServers) ? { ...current.mcpServers } : {};
  for (const [k, v] of Object.entries(imported)) {
    mcps[k] = v;
  }
  current.mcpServers = mcps;
  await atomicWriteJson(CLAUDE_PATHS.claudeJson, current);

  return {
    ok: true,
    installed: Object.keys(imported).map((k) => `mcpServers.${k}`),
    backupPath,
  };
}

/** Recursively copy src into dest, preserving subdirectory layout. */
async function copyTree(
  src: string,
  dest: string,
  installed: string[],
  skipDotGit: boolean,
): Promise<void> {
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (skipDotGit && entry.name === '.git') continue;
    if (entry.name === '.gitignore' || entry.name === '.gitattributes') continue;
    const srcChild = join(src, entry.name);
    const destChild = join(dest, entry.name);
    if (entry.isDirectory()) {
      await mkdir(destChild, { recursive: true });
      await copyTree(srcChild, destChild, installed, false);
    } else if (entry.isFile()) {
      await copyFile(srcChild, destChild);
      installed.push(destChild);
    }
  }
}

async function copyMdOnly(srcDir: string, destDir: string): Promise<string[]> {
  const entries = await readdir(srcDir).catch(() => [] as string[]);
  const installed: string[] = [];
  for (const entry of entries) {
    if (extname(entry) !== '.md') continue;
    const srcPath = join(srcDir, entry);
    const s = await stat(srcPath).catch(() => null);
    if (!s?.isFile()) continue;
    const destPath = join(destDir, basename(entry));
    await copyFile(srcPath, destPath);
    installed.push(destPath);
  }
  return installed;
}
