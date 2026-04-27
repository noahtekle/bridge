import type { StackItem } from '@bridge/core';

import { CLAUDE_PATHS } from './paths';
import { stableId } from './hash';
import { isRecord, readJsonSafe } from './read-json';

/**
 * Plugins live in two files:
 *   - settings.json `enabledPlugins`: { "name@marketplace": boolean }
 *   - installed_plugins.json: install metadata (version, install path, sha)
 *
 * We outer-join: a plugin shown in settings.enabledPlugins but missing from
 * installed_plugins is rendered with status:'error', and vice versa with a
 * note explaining the inconsistency.
 */
export async function scanPlugins(): Promise<StackItem[]> {
  const [settings, installedRaw] = await Promise.all([
    readJsonSafe(CLAUDE_PATHS.settingsJson),
    readJsonSafe(CLAUDE_PATHS.installedPluginsJson),
  ]);

  const enabledMap = pickEnabledPluginsMap(settings);
  const installedMap = pickInstalledPluginsMap(installedRaw);

  const allKeys = new Set<string>([...Object.keys(enabledMap), ...Object.keys(installedMap)]);

  const items: StackItem[] = [];
  for (const fullName of allKeys) {
    const enabledFlag = enabledMap[fullName];
    const installInfo = installedMap[fullName];

    const enabledKnown = typeof enabledFlag === 'boolean';
    const installedKnown = installInfo !== undefined;

    let status: StackItem['status'];
    if (!enabledKnown || !installedKnown) {
      // Inconsistency between settings and installed manifest. Surface it.
      status = 'error';
    } else {
      status = enabledFlag ? 'active' : 'disabled';
    }

    const [shortName, marketplace] = splitPluginRef(fullName);

    items.push({
      id: stableId('plugin', marketplace ?? 'user', shortName),
      category: 'plugin',
      name: shortName,
      description: describePlugin(marketplace),
      source: marketplace === 'claude-plugins-official' ? 'official' : 'plugin',
      sourceRef: fullName,
      status,
      needsRestart: false,
      filePath: installInfo?.installPath,
      configPath: {
        file: CLAUDE_PATHS.settingsJson,
        jsonPath: `enabledPlugins["${fullName}"]`,
      },
      metadata: {
        marketplace,
        version: installInfo?.version,
        installedAt: installInfo?.installedAt,
        gitCommitSha: installInfo?.gitCommitSha,
      },
    });
  }
  return items;
}

interface InstalledPluginInfo {
  scope?: string;
  installPath?: string;
  version?: string;
  installedAt?: string;
  gitCommitSha?: string;
}

function pickEnabledPluginsMap(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) return {};
  const map = value.enabledPlugins;
  if (!isRecord(map)) return {};
  return map;
}

function pickInstalledPluginsMap(value: unknown): Record<string, InstalledPluginInfo> {
  if (!isRecord(value)) return {};
  const plugins = value.plugins;
  if (!isRecord(plugins)) return {};

  const result: Record<string, InstalledPluginInfo> = {};
  for (const [key, entry] of Object.entries(plugins)) {
    // installed_plugins.json stores an array of historical installs; the most
    // recent entry is the live one.
    const latest = pickLatestInstall(entry);
    if (latest) result[key] = latest;
  }
  return result;
}

function pickLatestInstall(entry: unknown): InstalledPluginInfo | undefined {
  if (!Array.isArray(entry) || entry.length === 0) return undefined;
  const last = entry[entry.length - 1];
  if (!isRecord(last)) return undefined;
  return {
    scope: typeof last.scope === 'string' ? last.scope : undefined,
    installPath: typeof last.installPath === 'string' ? last.installPath : undefined,
    version: typeof last.version === 'string' ? last.version : undefined,
    installedAt: typeof last.installedAt === 'string' ? last.installedAt : undefined,
    gitCommitSha: typeof last.gitCommitSha === 'string' ? last.gitCommitSha : undefined,
  };
}

function splitPluginRef(fullName: string): [string, string | undefined] {
  const at = fullName.lastIndexOf('@');
  if (at === -1) return [fullName, undefined];
  return [fullName.slice(0, at), fullName.slice(at + 1)];
}

function describePlugin(marketplace: string | undefined): string {
  if (marketplace) return `${marketplace} plugin`;
  return 'Plugin';
}
