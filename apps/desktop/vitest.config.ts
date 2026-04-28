import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@bridge/core': resolve(__dirname, '../../packages/core/src'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/main/**/__tests__/**/*.test.ts'],
    pool: 'forks', // separate process per file so BRIDGE_CLAUDE_HOME env stays isolated
    isolate: true,
  },
});
