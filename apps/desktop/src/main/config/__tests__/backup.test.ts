import { mkdir, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CLAUDE_PATHS } from '../paths';
import { backupForMutation, rotateBackups } from '../backup';

beforeAll(() => {
  if (!process.env.BRIDGE_CLAUDE_HOME) {
    throw new Error('BRIDGE_CLAUDE_HOME not set — refusing to run backup tests');
  }
});

beforeEach(async () => {
  await rm(CLAUDE_PATHS.home, { recursive: true, force: true });
  await mkdir(CLAUDE_PATHS.home, { recursive: true });
});

afterEach(async () => {
  await rm(CLAUDE_PATHS.home, { recursive: true, force: true });
});

describe('backupForMutation', () => {
  it('snapshots a single file under a fresh ISO timestamp folder', async () => {
    await mkdir(CLAUDE_PATHS.skillsRoot, { recursive: true });
    const file = join(CLAUDE_PATHS.skillsRoot, 'something.md');
    await writeFile(file, 'original content');

    const backupDir = await backupForMutation(file);

    expect(existsSync(backupDir)).toBe(true);
    expect(backupDir.startsWith(CLAUDE_PATHS.backupsRoot)).toBe(true);
    // ISO timestamp folder name format
    expect(backupDir.match(/\d{4}-\d{2}-\d{2}T/)).not.toBeNull();
  });

  it('recursively snapshots a directory', async () => {
    const skillDir = join(CLAUDE_PATHS.skillsRoot, 'tree');
    await mkdir(join(skillDir, 'sub'), { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), 'top');
    await writeFile(join(skillDir, 'sub', 'asset.txt'), 'nested');

    const backupDir = await backupForMutation(skillDir);

    // The mirrored layout means we can find the nested file under the backup.
    const found = await findFileNamed(backupDir, 'asset.txt');
    expect(found).not.toBeNull();
  });

  it('does not throw when source is missing (treats as nothing-to-backup)', async () => {
    const ghost = join(CLAUDE_PATHS.skillsRoot, 'ghost');
    await expect(backupForMutation(ghost)).resolves.toBeDefined();
  });
});

describe('rotateBackups', () => {
  it('keeps the most recent N backups when count is the binding limit', async () => {
    await createDatedBackups([0, 1, 2, 3, 4, 5, 6]); // 0 = today, 6 = a week ago

    await rotateBackups({ retainCount: 3, retainDays: 0 });

    const remaining = await listBackupDirs();
    expect(remaining.length).toBe(3);
    // Most recent three (today, yesterday, 2 days ago)
    expect(remaining.length).toBeLessThanOrEqual(3);
  });

  it('keeps anything within the retention window even past the count', async () => {
    await createDatedBackups([0, 1, 2, 3, 4]); // 5 days span

    await rotateBackups({ retainCount: 1, retainDays: 5 });

    const remaining = await listBackupDirs();
    // All five are inside 5 days → all kept despite count=1
    expect(remaining.length).toBe(5);
  });

  it('drops backups older than both windows', async () => {
    await createDatedBackups([0, 5, 40, 60]); // last two are >30 days old

    await rotateBackups({ retainCount: 2, retainDays: 30 });

    const remaining = await listBackupDirs();
    // Today + 5d ago kept; 40d + 60d dropped.
    expect(remaining.length).toBe(2);
  });
});

async function findFileNamed(root: string, name: string): Promise<string | null> {
  const { readdir } = await import('node:fs/promises');
  async function walk(dir: string): Promise<string | null> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const child = join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = await walk(child);
        if (found) return found;
      } else if (entry.name === name) {
        return child;
      }
    }
    return null;
  }
  return walk(root);
}

async function createDatedBackups(daysAgoList: number[]): Promise<void> {
  await mkdir(CLAUDE_PATHS.backupsRoot, { recursive: true });
  for (const daysAgo of daysAgoList) {
    const dir = join(CLAUDE_PATHS.backupsRoot, `bk-${daysAgo}d`);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'marker'), 'x');
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    await utimes(dir, date, date);
  }
}

async function listBackupDirs(): Promise<string[]> {
  const { readdir } = await import('node:fs/promises');
  try {
    const entries = await readdir(CLAUDE_PATHS.backupsRoot);
    const result: string[] = [];
    for (const e of entries) {
      const full = join(CLAUDE_PATHS.backupsRoot, e);
      const st = await stat(full);
      if (st.isDirectory()) result.push(full);
    }
    return result;
  } catch {
    return [];
  }
}
