import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@forge/core': path.resolve(__dirname, './packages/core/src'),
      '@forge/collaboration': path.resolve(__dirname, './packages/collaboration/src'),
      '@forge/ui': path.resolve(__dirname, './packages/ui/src'),
    },
  },
});

