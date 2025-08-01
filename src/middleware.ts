import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(({ url, redirect }, next) => {
  if (url.pathname === '/') {
    return redirect('/landing');
  }
  return next();
});
