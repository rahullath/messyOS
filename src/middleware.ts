import { defineMiddleware } from 'astro:middleware';
import { createServerAuth } from './lib/auth/simple-multi-user';

const PUBLIC_ROUTES = [
  '/landing', '/login', '/auth/callback', '/auth/exchange', 
  '/test-auth', '/onboarding', '/debug-session'
];

export const onRequest = defineMiddleware(async ({ url, cookies, redirect }, next) => {
  const { pathname } = url;

  console.log(`🌐 Request: ${pathname}`);

  // Always allow public routes and API routes
  if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/api/')) {
    console.log(`✅ Public route allowed: ${pathname}`);
    return next();
  }

  const serverAuth = createServerAuth(cookies);
  const user = await serverAuth.getUser();

  // Redirect unauthenticated users to login
  if (!user) {
    console.log(`🚫 No user found, redirecting to login from ${pathname}`);
    return redirect('/login');
  }

  console.log(`👤 User found: ${user.email}`);

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
      return redirect('/');
    }

  } catch (error) {
    console.error('⚠️ Middleware error:', error);
    // On error, allow access but log the issue
  }

  console.log(`✅ Access granted to ${pathname}`);
  return next();
});