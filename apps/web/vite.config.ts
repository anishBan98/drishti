import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8787' },
  },
  // The sandbox engine runs in a module Web Worker (docs/05 §14).
  worker: { format: 'es' },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
