import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

export default defineConfig({
  integrations: [
    react(),
    tailwind(),
  ],
  output: 'server',
  adapter: vercel(),
  // Middleware is now automatically detected from src/middleware.ts
  // See: https://docs.astro.build/en/guides/middleware/
  scopedStyleStrategy: 'where', // Or 'attribute'
  vite: {
    define: {
      global: 'globalThis',
    },
    resolve: {
      alias: {
        buffer: 'buffer',
      },
    },
    optimizeDeps: {
      include: ['buffer', '@privy-io/react-auth'],
    },
    server: {
      fs: {
        strict: false
      }
    }
  },
  // PWA configuration
  site: 'https://messos.vercel.app', // Replace with your actual domain
  base: '/',
  trailingSlash: 'ignore',
  build: {
    assets: '_astro',
    inlineStylesheets: 'auto'
  }
});
