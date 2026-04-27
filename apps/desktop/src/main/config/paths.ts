import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Canonical paths for the user's Claude Code config tree.
 * Resolved once at import time so all scan functions share the same root.
 */
export const CLAUDE_HOME = join(homedir(), '.claude');

export const CLAUDE_PATHS = {
  home: CLAUDE_HOME,
  claudeJson: join(homedir(), '.claude.json'),
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
