import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

// Workspace packages must be bundled into the main/preload outputs because
// they ship as TypeScript source (no compiled .js). externalizeDepsPlugin's
// default behavior is to externalize everything in dependencies/peerDependencies,
// which would cause Electron to require('@bridge/core/src/index.ts') at runtime.
const WORKSPACE_DEPS = ['@bridge/core', '@bridge/ui'];

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: WORKSPACE_DEPS })],
    resolve: {
      alias: {
        '@bridge/core': resolve(__dirname, '../../packages/core/src'),
      },
    },
    build: {
      rollupOptions: {
        external: ['better-sqlite3', 'keytar'],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: WORKSPACE_DEPS })],
    resolve: {
      alias: {
        '@bridge/core': resolve(__dirname, '../../packages/core/src'),
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer/src'),
        '@bridge/core': resolve(__dirname, '../../packages/core/src'),
        '@bridge/ui': resolve(__dirname, '../../packages/ui/src'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
        },
      },
    },
    server: {
      port: 5173,
    },
  },
});
