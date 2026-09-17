import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { fs: { allow: ['/Users/MehdiBoukari/Downloads/FSP VB'] } },
  test: { environment: 'jsdom', setupFiles: ['fake-indexeddb/auto'], globals: true },
});
