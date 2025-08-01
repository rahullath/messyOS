import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false, // We'll handle our own base styles
    }),
  ],
  output: 'server',
  adapter: vercel(),
  // Middleware is now automatically detected from src/middleware.ts
  // See: https://docs.astro.build/en/guides/middleware/
  scopedStyleStrategy: 'where', // Or 'attribute'
});
