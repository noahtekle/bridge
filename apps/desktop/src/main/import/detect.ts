import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';

import matter from 'gray-matter';

import type { ImportPreview, StackCategory } from '@bridge/core';

export type DetectionResult = Omit<ImportPreview, 'previewId'>;

/**
 * Filename-signal detection. No LLM, no network — just structural rules:
 *
 *   /SKILL.md                       → Skill
 *   /plugin.json                    → Plugin (we route the user to Claude Code's installer)
 *   /*.json with mcpServers field   → MCP server config
 *   /agents/*.md  (or /agent.md)    → Agent
 *   /commands/*.md (or /command.md) → Slash command
 *
 * When more than one signal matches the user picks via override dropdown.
 */
export async function detect(repoPath: string): Promise<DetectionResult> {
  const candidates = new Set<StackCategory>();
  let primaryName = basename(repoPath);
  let description: string | undefined;
  let readmeSnippet: string | undefined;

  const filesToWrite: { source: string; dest: string }[] = [];

  // ── Skill at root ─────────────────────────────────────────────────────
  const skillMd = join(repoPath, 'SKILL.md');
  if (await isFile(skillMd)) {
    candidates.add('skill');
    const fm = await readFrontmatter(skillMd);
    if (fm?.name) primaryName = fm.name;
    if (fm?.description) description = fm.description;
  }

  // ── Plugin at root ────────────────────────────────────────────────────
  const pluginJson = join(repoPath, 'plugin.json');
  if (await isFile(pluginJson)) {
    candidates.add('plugin');
    try {
      const data = JSON.parse(await readFile(pluginJson, 'utf8')) as Record<string, unknown>;
      if (typeof data.name === 'string') primaryName = data.name;
      if (typeof data.description === 'string') description = data.description;
    } catch {
      /* leave defaults */
    }
  }

  // ── MCP config at root ────────────────────────────────────────────────
  for (const candidate of ['mcp.json', '.mcp.json', 'claude_desktop_config.json']) {
    const path = join(repoPath, candidate);
    if (await isFile(path)) {
      try {
        const data = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
        if (data.mcpServers && typeof data.mcpServers === 'object') {
          candidates.add('mcp');
          break;
        }
      } catch {
        /* skip */
      }
    }
  }

  // ── Agent / command directories ───────────────────────────────────────
  if (await hasMdInDir(join(repoPath, 'agents'))) candidates.add('agent');
  if (await hasMdInDir(join(repoPath, 'commands'))) candidates.add('command');

  // ── README snippet for the preview screen ─────────────────────────────
  for (const name of ['README.md', 'readme.md', 'README']) {
    const readmePath = join(repoPath, name);
    if (await isFile(readmePath)) {
      const text = await readFile(readmePath, 'utf8');
      // First non-frontmatter, non-empty 6 lines.
      const stripped = text.replace(/^---[\s\S]*?---\n+/m, '').trim();
      readmeSnippet = stripped.split('\n').slice(0, 6).join('\n');
      break;
    }
  }

  // Decide primary detection.
  let detected: StackCategory | 'ambiguous' | 'unknown';
  if (candidates.size === 0) {
    detected = 'unknown';
  } else if (candidates.size === 1) {
    detected = [...candidates][0]!;
  } else {
    detected = 'ambiguous';
  }

  // Compute install plan for the primary detection. The renderer can recompute
  // when the user overrides via the dropdown.
  const candidateList = [...candidates];
  const primaryDetect: StackCategory | undefined =
    detected === 'ambiguous'
      ? candidateList[0]
      : detected === 'unknown'
        ? undefined
        : detected;
  if (primaryDetect) {
    filesToWrite.push(...computeInstallPlan(repoPath, primaryDetect, primaryName));
  }

  return {
    detectedCategory: detected,
    candidates: candidateList,
    name: primaryName,
    description,
    readmeSnippet,
    filesToWrite,
  };
}

/**
 * Per-category install plan. Deliberately simple — V1 ships installs for the
 * 4 file-based categories. MCP merges into ~/.claude.json and is handled
 * separately (no file copy).
 */
export function computeInstallPlan(
  repoPath: string,
  category: StackCategory,
  name: string,
): { source: string; dest: string }[] {
  switch (category) {
    case 'skill':
      // The whole repo IS the skill folder.
      return [{ source: repoPath, dest: `~/.claude/skills/${name}/` }];
    case 'agent':
      // /agents/*.md → ~/.claude/agents/*.md (preserve filenames).
      return [{ source: join(repoPath, 'agents'), dest: '~/.claude/agents/' }];
    case 'command':
      return [{ source: join(repoPath, 'commands'), dest: '~/.claude/commands/' }];
    case 'mcp':
      // No file copy — install path merges into claude.json.
      return [{ source: repoPath, dest: '~/.claude.json[mcpServers]' }];
    case 'plugin':
      return []; // Routed to Claude Code's installer; we don't write files.
  }
}

async function isFile(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile();
  } catch {
    return false;
  }
}

async function hasMdInDir(path: string): Promise<boolean> {
  try {
    const entries = await readdir(path);
    return entries.some((e) => e.endsWith('.md'));
  } catch {
    return false;
  }
}

interface SkillFrontmatter {
  name?: string;
  description?: string;
}

async function readFrontmatter(path: string): Promise<SkillFrontmatter | null> {
  try {
    const content = await readFile(path, 'utf8');
    const { data } = matter(content);
    return {
      name: typeof data.name === 'string' ? data.name : undefined,
      description: typeof data.description === 'string' ? data.description.trim() : undefined,
    };
  } catch {
    return null;
  }
}
