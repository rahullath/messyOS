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
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunk for large dependencies
            vendor: ['react', 'react-dom'],
            // Auth chunk for authentication-related code
            auth: ['@supabase/supabase-js', '@supabase/ssr'],
            // Utils chunk for utility libraries
            utils: ['date-fns', 'zod', 'clsx']
          }
        }
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
