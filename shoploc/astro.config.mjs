// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  session: false,
  integrations: [react()],
  adapter: node({
    mode: 'standalone',
  }),
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
              return 'react-vendor';
            }
            if (
              id.includes('node_modules/zod/') ||
              id.includes('node_modules/react-hook-form/') ||
              id.includes('node_modules/@hookform/')
            ) {
              return 'validation-vendor';
            }
            return undefined;
          },
        },
      },
    },
    server: {
      proxy: {
        '/v1': {
          target: process.env.DEV_BACKEND_URL || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
