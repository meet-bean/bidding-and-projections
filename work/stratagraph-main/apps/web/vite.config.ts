import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { nitro } from 'nitro/vite';
import path from 'node:path';

const base = process.env.GITHUB_PAGES ? '/bidding-and-projections/' : '/';

export default defineConfig({
  base,
  plugins: [
    tanstackStart({
      srcDirectory: './src',
      router: {
        routesDirectory: './routes',
        generatedRouteTree: './routeTree.gen.ts',
      },
    }),
    nitro({ preset: 'node-server' }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
      '@': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
