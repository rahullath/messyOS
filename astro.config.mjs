import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';
import { onRequest } from './src/middleware'; // Import the middleware

export default defineConfig({
  integrations: [
    react(),
    tailwind({
      applyBaseStyles: false, // We'll handle our own base styles
    }),
  ],
  output: 'server',
  adapter: vercel(),
  // Add the middleware to the Astro configuration
  // This ensures that onRequest is called for every request
  // before page rendering.
  // See: https://docs.astro.build/en/guides/middleware/
  scopedStyleStrategy: 'where', // Or 'attribute'
});
