import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { detect } from '../detect';

let repo: string;

beforeEach(async () => {
  repo = await mkdtemp(join(tmpdir(), 'bridge-detect-'));
});

afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
});

describe('detect — single signal', () => {
  it('detects a Skill from SKILL.md at root', async () => {
    await writeFile(
      join(repo, 'SKILL.md'),
      '---\nname: cool-skill\ndescription: does the thing\n---\n\nBody.',
    );

    const result = await detect(repo);
    expect(result.detectedCategory).toBe('skill');
    expect(result.candidates).toEqual(['skill']);
    expect(result.name).toBe('cool-skill');
    expect(result.description).toBe('does the thing');
  });

  it('detects a Plugin from plugin.json', async () => {
    await writeFile(
      join(repo, 'plugin.json'),
      JSON.stringify({ name: 'my-plugin', description: 'a plugin' }),
    );

    const result = await detect(repo);
    expect(result.detectedCategory).toBe('plugin');
    expect(result.name).toBe('my-plugin');
    expect(result.description).toBe('a plugin');
  });

  it('detects an MCP from mcp.json with mcpServers field', async () => {
    await writeFile(
      join(repo, 'mcp.json'),
      JSON.stringify({ mcpServers: { firecrawl: { command: 'firecrawl-mcp' } } }),
    );

    const result = await detect(repo);
    expect(result.detectedCategory).toBe('mcp');
  });

  it('detects an MCP from .mcp.json (alternate name)', async () => {
    await writeFile(
      join(repo, '.mcp.json'),
      JSON.stringify({ mcpServers: { x: {} } }),
    );

    const result = await detect(repo);
    expect(result.detectedCategory).toBe('mcp');
  });

  it('detects an Agent from agents/*.md', async () => {
    await mkdir(join(repo, 'agents'));
    await writeFile(join(repo, 'agents', 'reviewer.md'), '---\nname: reviewer\n---\n');

    const result = await detect(repo);
    expect(result.detectedCategory).toBe('agent');
  });

  it('detects a Slash command from commands/*.md', async () => {
    await mkdir(join(repo, 'commands'));
    await writeFile(join(repo, 'commands', 'ship.md'), '---\nname: ship\n---\n');

    const result = await detect(repo);
    expect(result.detectedCategory).toBe('command');
  });
});

describe('detect — ambiguous + unknown', () => {
  it('reports ambiguous when multiple signals match', async () => {
    await writeFile(join(repo, 'SKILL.md'), '---\nname: dual\n---\n');
    await mkdir(join(repo, 'agents'));
    await writeFile(join(repo, 'agents', 'reviewer.md'), '---\nname: reviewer\n---\n');

    const result = await detect(repo);
    expect(result.detectedCategory).toBe('ambiguous');
    expect(result.candidates).toContain('skill');
    expect(result.candidates).toContain('agent');
  });

  it('reports unknown when no signals match', async () => {
    await writeFile(join(repo, 'README.md'), '# A normal repo\n');
    await writeFile(join(repo, 'index.js'), 'console.log("hi")');

    const result = await detect(repo);
    expect(result.detectedCategory).toBe('unknown');
    expect(result.candidates).toEqual([]);
    expect(result.filesToWrite).toEqual([]);
  });

  it('ignores json files without mcpServers', async () => {
    await writeFile(join(repo, 'package.json'), JSON.stringify({ name: 'something' }));

    const result = await detect(repo);
    expect(result.detectedCategory).toBe('unknown');
  });
});

describe('detect — README snippet', () => {
  it('extracts the first 6 non-frontmatter lines for the preview', async () => {
    await writeFile(join(repo, 'SKILL.md'), '---\nname: x\n---\n');
    await writeFile(
      join(repo, 'README.md'),
      '---\ntitle: ignored\n---\n\nLine 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8',
    );

    const result = await detect(repo);
    expect(result.readmeSnippet).toContain('Line 1');
    expect(result.readmeSnippet).toContain('Line 6');
    expect(result.readmeSnippet).not.toContain('Line 7');
    expect(result.readmeSnippet).not.toContain('title: ignored');
  });
});

describe('detect — install plan', () => {
  it('plans a Skill install at ~/.claude/skills/<name>/', async () => {
    await writeFile(join(repo, 'SKILL.md'), '---\nname: planner\n---\n');

    const result = await detect(repo);
    expect(result.filesToWrite).toEqual([
      { source: repo, dest: '~/.claude/skills/planner/' },
    ]);
  });

  it('plans an Agent install with the agents/ source dir', async () => {
    await mkdir(join(repo, 'agents'));
    await writeFile(join(repo, 'agents', 'a.md'), '---\nname: a\n---\n');

    const result = await detect(repo);
    expect(result.filesToWrite).toEqual([
      { source: join(repo, 'agents'), dest: '~/.claude/agents/' },
    ]);
  });
});
