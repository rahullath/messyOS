import { defineMiddleware } from 'astro/middleware'

export const onRequest = defineMiddleware(async (context, next) => {
  // TEMPORARILY DISABLE ALL AUTH CHECKS
  console.log('🔍 Middleware hit:', context.url.pathname);
  
  // Just pass through everything for now
  return next();
});