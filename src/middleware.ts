import { defineMiddleware } from 'astro:middleware';
import { createServerAuth } from './lib/auth/simple-multi-user';

const PUBLIC_ROUTES = [
  '/', '/landing', '/login', '/auth/callback', '/auth/exchange', 
  '/onboarding', '/reset-password', '/auth-status'
];

export const onRequest = defineMiddleware(async ({ url, cookies, redirect }, next) => {
  const { pathname } = url;

  console.log(`🌐 Request: ${pathname}`);

  // Always allow non-root public routes and API routes
  if ((PUBLIC_ROUTES.includes(pathname) && pathname !== '/') || pathname.startsWith('/api/')) {
    console.log(`✅ Public route allowed: ${pathname}`);
    return next();
  }

  const serverAuth = createServerAuth(cookies);
  const user = await serverAuth.getUser();

  // Handle root path specifically
  if (pathname === '/') {
    if (!user) {
      // Unauthenticated user on landing page - allow access
      console.log(`🏠 Unauthenticated user on landing page`);
      return next();
    } else {
      // Authenticated user on landing page - redirect to dashboard
      console.log(`🔄 Authenticated user on landing, redirecting to dashboard`);
      return redirect('/dashboard');
    }
  }

  // Redirect unauthenticated users to login for protected routes
  if (!user) {
    console.log(`🚫 No user found, redirecting to login from ${pathname}`);
    return redirect('/login');
  }

  console.log(`👤 User found: ${user.email || user.id}`);

  // Check onboarding status for authenticated users
  try {
    const preferences = await serverAuth.getUserPreferences(user.id);
    const hasCompletedOnboarding = !!preferences;

    console.log(`📋 Onboarding complete: ${hasCompletedOnboarding}`);

    // Force onboarding if not completed
    if (!hasCompletedOnboarding && pathname !== '/onboarding') {
      console.log(`📝 Redirecting to onboarding from ${pathname}`);
      return redirect('/onboarding');
    }

    // If onboarding is complete and user is on onboarding page, redirect to dashboard
    if (hasCompletedOnboarding && pathname === '/onboarding') {
      console.log(`🏠 Redirecting to dashboard from onboarding`);
      return redirect('/dashboard');
    }

  } catch (error) {
    console.error('⚠️ Middleware error:', error);
    // On error, allow access but log the issue
  }

  console.log(`✅ Access granted to ${pathname}`);
  return next();
});