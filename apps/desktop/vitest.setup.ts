import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Each vitest test file runs in its own forked process, so each gets its
 * own BRIDGE_CLAUDE_HOME pointed at a fresh tmp directory. Tests therefore
 * never collide and never touch the developer's real ~/.claude/.
 */
const root = mkdtempSync(join(tmpdir(), 'bridge-test-'));
process.env.BRIDGE_CLAUDE_HOME = join(root, '.claude');
