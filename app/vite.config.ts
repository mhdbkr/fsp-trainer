import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Local-only app. `base: './'` keeps asset paths relative so a future Tauri
// packaging (or a plain file:// open of the build) resolves correctly.
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
