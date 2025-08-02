import { defineMiddleware } from 'astro:middleware';
import { createServerAuth } from './lib/auth/simple-multi-user';

const PUBLIC_ROUTES = ['/landing', '/login', '/auth/callback', '/onboarding', '/test-auth'];
const ONBOARDING_ROUTE = '/onboarding';
const DASHBOARD_ROUTE = '/';

export const onRequest = defineMiddleware(async ({ url, cookies, redirect }, next) => {
  const serverAuth = createServerAuth(cookies);
  const user = await serverAuth.getUser();

  const { pathname } = url;

  // Allow public routes and API routes
  if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/api')) {
    return next();
  }

  // Redirect unauthenticated users to login
  if (!user) {
    return redirect('/login');
  }

  try {
    // Check if user has completed onboarding by checking for user preferences
    const preferences = await serverAuth.getUserPreferences(user.id);
    const hasCompletedOnboarding = !!preferences; // If preferences exist, onboarding is complete

    // If user hasn't completed onboarding and is not on onboarding page, redirect to onboarding
    if (!hasCompletedOnboarding && pathname !== ONBOARDING_ROUTE) {
      return redirect(ONBOARDING_ROUTE);
    }

    // If user has completed onboarding and is on onboarding page, redirect to dashboard
    if (hasCompletedOnboarding && pathname === ONBOARDING_ROUTE) {
      return redirect(DASHBOARD_ROUTE);
    }
  } catch (error) {
    console.error('Middleware error:', error);
    // If there's an error checking preferences, assume onboarding is not complete
    if (pathname !== ONBOARDING_ROUTE) {
      return redirect(ONBOARDING_ROUTE);
    }
  }

  return next();
});
