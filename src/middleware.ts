import { defineMiddleware } from 'astro/middleware'

export const onRequest = defineMiddleware(async (context, next) => {
  // Skip all server-side auth checks - handle everything client-side
  console.log('🔄 Page:', context.url.pathname);
  
  // Just pass through - no redirects, no auth checks
  return next();
});