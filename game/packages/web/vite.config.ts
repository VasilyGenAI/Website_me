import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // The offline test page keeps readable names so error reports point at real code.
  build: mode === 'offline' ? { minify: false } : {},
  server: {
    port: 5173,
    proxy: { '/ws': { target: 'ws://localhost:8787', ws: true } },
  },
}));
