import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { detect } from '../detect';
import { resolveSubPath } from '../sub-path';

let cloneRoot: string;

beforeEach(async () => {
  cloneRoot = await mkdtemp(join(tmpdir(), 'bridge-subpath-'));
});

afterEach(async () => {
  await rm(cloneRoot, { recursive: true, force: true });
});

describe('resolveSubPath — happy path', () => {
  it('returns the cloneRoot unchanged when subPath is undefined', async () => {
    const result = await resolveSubPath(cloneRoot);
    expect(result).toBe(cloneRoot);
  });

  it('returns the cloneRoot unchanged for an empty subPath', async () => {
    const result = await resolveSubPath(cloneRoot, '');
    expect(result).toBe(cloneRoot);
  });

  it('resolves a single-segment subPath into an existing directory', async () => {
    const sub = join(cloneRoot, 'plugins', 'superpowers');
    await mkdir(sub, { recursive: true });

    const result = await resolveSubPath(cloneRoot, 'plugins/superpowers');
    expect(result).toBe(sub);
  });

  it('accepts Windows-style backslashes and POSIX slashes interchangeably', async () => {
    const sub = join(cloneRoot, 'a', 'b');
    await mkdir(sub, { recursive: true });

    const posix = await resolveSubPath(cloneRoot, 'a/b');
    const win = await resolveSubPath(cloneRoot, 'a\\b');
    expect(posix).toBe(sub);
    expect(win).toBe(sub);
  });
});

describe('resolveSubPath — rejects unsafe input', () => {
  it("rejects '..' traversal that escapes the cloneRoot", async () => {
    await expect(resolveSubPath(cloneRoot, '../outside')).rejects.toThrow(/escapes/);
  });

  it("rejects nested '..' segments that try to climb out", async () => {
    await mkdir(join(cloneRoot, 'inner'), { recursive: true });
    await expect(resolveSubPath(cloneRoot, 'inner/../../escape')).rejects.toThrow(/escapes/);
  });

  it("rejects an absolute path that points outside the cloneRoot", async () => {
    const elsewhere = await mkdtemp(join(tmpdir(), 'bridge-elsewhere-'));
    try {
      await expect(resolveSubPath(cloneRoot, elsewhere)).rejects.toThrow(/escapes/);
    } finally {
      await rm(elsewhere, { recursive: true, force: true });
    }
  });
});

describe('resolveSubPath — missing or wrong type', () => {
  it("errors when the subPath doesn't exist on disk", async () => {
    await expect(resolveSubPath(cloneRoot, 'does/not/exist')).rejects.toThrow(/not found/);
  });

  it("errors when the subPath points at a file instead of a directory", async () => {
    const filePath = join(cloneRoot, 'just-a-file.md');
    await writeFile(filePath, 'hi');
    await expect(resolveSubPath(cloneRoot, 'just-a-file.md')).rejects.toThrow(/not a directory/);
  });
});

describe('detect runs cleanly against a resolved subPath', () => {
  it('detects a Skill at <cloneRoot>/<subPath>/SKILL.md', async () => {
    const sub = join(cloneRoot, 'plugins', 'superpowers');
    await mkdir(sub, { recursive: true });
    await writeFile(
      join(sub, 'SKILL.md'),
      '---\nname: superpowers\ndescription: thinking + planning\n---\n',
    );

    const root = await resolveSubPath(cloneRoot, 'plugins/superpowers');
    const result = await detect(root);

    expect(result.detectedCategory).toBe('skill');
    expect(result.name).toBe('superpowers');
    expect(result.filesToWrite[0]?.dest).toBe('~/.claude/skills/superpowers/');
  });
});
