import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import matter from 'gray-matter';

import type { StackItem } from '@bridge/core';

import { CLAUDE_PATHS, DISABLED_DIR } from './paths';
import { stableId } from './hash';

/**
 * Scan ~/.claude/skills/ for user-added skills, plus
 * ~/.claude/skills/.disabled/ for skills the user has toggled off via Bridge.
 *
 * Plugin-bundled skills live under plugins/cache/<marketplace>/<plugin>/skills/
 * and are scanned separately by scanPluginSkills (still in this file for now —
 * splitting into more files isn't worth it yet).
 */
export async function scanSkills(): Promise<StackItem[]> {
  const items: StackItem[] = [];
  items.push(...(await scanSkillTree(CLAUDE_PATHS.skillsRoot, 'active', 'user')));
  items.push(
    ...(await scanSkillTree(join(CLAUDE_PATHS.skillsRoot, DISABLED_DIR), 'disabled', 'user')),
  );
  items.push(...(await scanPluginBundledSkills()));
  return items;
}

async function scanSkillTree(
  root: string,
  status: 'active' | 'disabled',
  source: 'user' | 'plugin',
): Promise<StackItem[]> {
  const entries = await safeReaddir(root);
  const items: StackItem[] = [];

  for (const entry of entries) {
    if (entry.startsWith('.')) continue; // skip .disabled when scanning user skills
    const skillDir = join(root, entry);
    const stats = await safeStat(skillDir);
    if (!stats?.isDirectory()) continue;

    const skillFile = join(skillDir, 'SKILL.md');
    const parsed = await readFrontmatter(skillFile);
    const name = parsed?.name ?? entry;
    const description = parsed?.description ?? '';

    items.push({
      id: stableId('skill', source, name),
      category: 'skill',
      name,
      description,
      source,
      status,
      needsRestart: false,
      filePath: skillDir,
      configPath: { file: skillDir },
      metadata: {
        version: parsed?.version,
        hasSkillMd: parsed !== null,
      },
    });
  }
  return items;
}

/**
 * Walk plugin caches: plugins/cache/<marketplace>/<plugin>/<version>/skills/
 * Each SKILL.md found becomes a plugin-bundled Skill StackItem (read-only;
 * toggled by enabling/disabling the parent plugin).
 */
async function scanPluginBundledSkills(): Promise<StackItem[]> {
  const items: StackItem[] = [];
  const marketplaces = await safeReaddir(CLAUDE_PATHS.pluginCache);

  for (const marketplace of marketplaces) {
    const marketplaceDir = join(CLAUDE_PATHS.pluginCache, marketplace);
    const plugins = await safeReaddir(marketplaceDir);

    for (const plugin of plugins) {
      const pluginDir = join(marketplaceDir, plugin);
      const versions = await safeReaddir(pluginDir);

      for (const version of versions) {
        const skillsDir = join(pluginDir, version, 'skills');
        const skills = await safeReaddir(skillsDir);

        for (const skill of skills) {
          const skillDir = join(skillsDir, skill);
          const stats = await safeStat(skillDir);
          if (!stats?.isDirectory()) continue;

          const parsed = await readFrontmatter(join(skillDir, 'SKILL.md'));
          if (!parsed) continue; // skip non-skill folders

          const sourceRef = `${plugin}@${marketplace}`;
          items.push({
            id: stableId('skill', sourceRef, parsed.name ?? skill),
            category: 'skill',
            name: parsed.name ?? skill,
            description: parsed.description ?? '',
            source: marketplace === 'claude-plugins-official' ? 'official' : 'plugin',
            sourceRef,
            status: 'active', // toggled via parent plugin
            needsRestart: false,
            filePath: skillDir,
            configPath: { file: skillDir },
            metadata: {
              version: parsed.version,
              parentPlugin: sourceRef,
              isPluginBundled: true,
            },
          });
        }
      }
    }
  }
  return items;
}

interface SkillFrontmatter {
  name?: string;
  description?: string;
  version?: string;
}

async function readFrontmatter(path: string): Promise<SkillFrontmatter | null> {
  try {
    const content = await readFile(path, 'utf8');
    const { data } = matter(content);
    return {
      name: typeof data.name === 'string' ? data.name : undefined,
      description: typeof data.description === 'string' ? data.description.trim() : undefined,
      version: typeof data.version === 'string' ? data.version : undefined,
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
