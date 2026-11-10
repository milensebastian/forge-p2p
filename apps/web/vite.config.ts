import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@forge/core': path.resolve(__dirname, '../../packages/core/src'),
      '@forge/collaboration': path.resolve(__dirname, '../../packages/collaboration/src'),
      '@forge/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'esnext',
  },
});

