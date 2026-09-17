import { defineConfig } from 'vitest/config';
import { searchForWorkspaceRoot } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { fs: { allow: [searchForWorkspaceRoot(process.cwd()), fs.realpathSync(path.resolve(__dirname, 'node_modules'))] } },
  test: { environment: 'jsdom', setupFiles: ['fake-indexeddb/auto'], globals: true },
});
