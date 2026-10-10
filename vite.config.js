import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Frontend lives in /client, builds to /dist. In dev, /api is proxied to the Express server.
export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true, chunkSizeWarningLimit: 1500 },
  server: { port: 5173, proxy: { '/api': 'http://localhost:5000' } },
});
