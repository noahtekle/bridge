import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

import matter from 'gray-matter';

import type { StackCategory, StackItem } from '@bridge/core';

import { CLAUDE_PATHS, DISABLED_DIR } from './paths';
import { stableId } from './hash';

/**
 * Agents and slash commands share a layout: a flat folder of *.md files,
 * each file an item. Same shape, different category — handled together.
 *
 * Plugin-bundled agents/commands could exist (in plugins/cache/.../agents/)
 * but are out of scope for Week 1. Adds in a follow-up if users have them.
 */

export async function scanAgents(): Promise<StackItem[]> {
  return scanMdTree(CLAUDE_PATHS.agentsRoot, 'agent');
}

export async function scanCommands(): Promise<StackItem[]> {
  return scanMdTree(CLAUDE_PATHS.commandsRoot, 'command');
}

async function scanMdTree(root: string, category: StackCategory): Promise<StackItem[]> {
  const items: StackItem[] = [];
  items.push(...(await scanMdInDir(root, category, 'active')));
  items.push(...(await scanMdInDir(join(root, DISABLED_DIR), category, 'disabled')));
  return items;
}

async function scanMdInDir(
  dir: string,
  category: StackCategory,
  status: 'active' | 'disabled',
): Promise<StackItem[]> {
  const entries = await safeReaddir(dir);
  const items: StackItem[] = [];

  for (const entry of entries) {
    if (entry.startsWith('.')) continue;
    if (extname(entry) !== '.md') continue;

    const filePath = join(dir, entry);
    const stats = await safeStat(filePath);
    if (!stats?.isFile()) continue;

    const parsed = await readFrontmatter(filePath);
    const baseName = basename(entry, '.md');
    const name = parsed?.name ?? baseName;
    const description = parsed?.description ?? '';

    items.push({
      id: stableId(category, 'user', name),
      category,
      name: category === 'command' && !name.startsWith('/') ? `/${name}` : name,
      description,
      source: 'user',
      status,
      needsRestart: false,
      filePath,
      configPath: { file: filePath },
      metadata: {
        color: parsed?.color,
        model: parsed?.model,
        memory: parsed?.memory,
      },
    });
  }
  return items;
}

interface MdFrontmatter {
  name?: string;
  description?: string;
  color?: string;
  model?: string;
  memory?: string;
}

async function readFrontmatter(path: string): Promise<MdFrontmatter | null> {
  try {
    const content = await readFile(path, 'utf8');
    const { data } = matter(content);
    return {
      name: typeof data.name === 'string' ? data.name : undefined,
      description: typeof data.description === 'string' ? data.description.trim() : undefined,
      color: typeof data.color === 'string' ? data.color : undefined,
      model: typeof data.model === 'string' ? data.model : undefined,
      memory: typeof data.memory === 'string' ? data.memory : undefined,
    };
  } catch {
    return null;
  }
}

async function safeReaddir(path: string): Promise<string[]> {
  try {
    return await readdir(path);
  } catch {
    return [];
  }
}

async function safeStat(path: string): Promise<Awaited<ReturnType<typeof stat>> | null> {
  try {
    return await stat(path);
  } catch {
    return null;
  }
}
