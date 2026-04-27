import type { StackItem } from '@bridge/core';

import { CLAUDE_PATHS } from './paths';
import { stableId } from './hash';
import { isRecord, readJsonSafe } from './read-json';

/**
 * Scan ~/.claude.json for `mcpServers` and emit one StackItem per server.
 * MCPs that are present in the file are "active". To toggle one off, the
 * Bridge ConfigWriter (Week 2) removes its entry and stashes a backup so we
 * can restore it.
 */
export async function scanMcps(): Promise<StackItem[]> {
  const data = await readJsonSafe(CLAUDE_PATHS.claudeJson);
  if (!isRecord(data) || !isRecord(data.mcpServers)) return [];

  const items: StackItem[] = [];
  for (const [name, raw] of Object.entries(data.mcpServers)) {
    if (!isRecord(raw)) continue;

    const command = typeof raw.command === 'string' ? raw.command : undefined;
    const transport = typeof raw.type === 'string' ? raw.type : 'stdio';
    const description = describeMcp(command, transport);

    items.push({
      id: stableId('mcp', 'user', name),
      category: 'mcp',
      name,
      description,
      source: 'user',
      sourceRef: command,
      status: 'active',
      needsRestart: false,
      configPath: {
        file: CLAUDE_PATHS.claudeJson,
        jsonPath: `mcpServers.${name}`,
      },
      metadata: {
        transport,
        command,
        args: Array.isArray(raw.args) ? raw.args : undefined,
      },
    });
  }
  return items;
}

/**
 * Best-effort human description from the MCP entry alone. The real description
 * lives in the MCP server's own README; we surface "Add description" in the
 * detail panel later if a user wants to override.
 */
function describeMcp(command: string | undefined, transport: string): string {
  if (transport === 'http' || transport === 'sse') {
    return `${transport.toUpperCase()} MCP server`;
  }
  if (command) return `MCP server (${command})`;
  return 'MCP server';
}
