import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

/**
 * Canonical paths for the user's Claude Code config tree.
 *
 * Tests can override the home root via `BRIDGE_CLAUDE_HOME`. When set, the
 * paths below resolve under that directory instead of `~/.claude/`. This is
 * the only way real production code reads from a non-default location, and
 * we expose it for tests only — there's no UI surface for it.
 */
function resolveClaudeHome(): string {
  const override = process.env.BRIDGE_CLAUDE_HOME;
  if (override && override.length > 0) return override;
  return join(homedir(), '.claude');
}

export const CLAUDE_HOME = resolveClaudeHome();

/**
 * The override case relocates `.claude.json` next to the test root so a single
 * tmp dir contains everything. In production it lives at `~/.claude.json`.
 */
const claudeJsonPath = process.env.BRIDGE_CLAUDE_HOME
  ? join(dirname(CLAUDE_HOME), '.claude.json')
  : join(homedir(), '.claude.json');

export const CLAUDE_PATHS = {
  home: CLAUDE_HOME,
  claudeJson: claudeJsonPath,
  settingsJson: join(CLAUDE_HOME, 'settings.json'),
  pluginsRoot: join(CLAUDE_HOME, 'plugins'),
  installedPluginsJson: join(CLAUDE_HOME, 'plugins', 'installed_plugins.json'),
  pluginCache: join(CLAUDE_HOME, 'plugins', 'cache'),
  skillsRoot: join(CLAUDE_HOME, 'skills'),
  agentsRoot: join(CLAUDE_HOME, 'agents'),
  commandsRoot: join(CLAUDE_HOME, 'commands'),
  backupsRoot: join(CLAUDE_HOME, 'backups'),
} as const;

/** Subfolder name used for "toggled off" file-based items. */
export const DISABLED_DIR = '.disabled';

/**
 * The 6 paths chokidar watches. A change to any of these triggers a rescan.
 * Symbolic-link-aware traversal happens at scan time, so we only need to
 * watch the user-controlled top-level files/dirs here.
 */
export const WATCH_PATHS = [
  CLAUDE_PATHS.claudeJson,
  CLAUDE_PATHS.settingsJson,
  CLAUDE_PATHS.installedPluginsJson,
  CLAUDE_PATHS.skillsRoot,
  CLAUDE_PATHS.agentsRoot,
  CLAUDE_PATHS.commandsRoot,
] as const;
