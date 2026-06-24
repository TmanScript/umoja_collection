import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Environment variables are read via import.meta.env (see env.ts). Vite exposes
// any variable prefixed with VITE_ to the client automatically, so no manual
// `define` block is needed.
export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  base: '/umoja_collection/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
