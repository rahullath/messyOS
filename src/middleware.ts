import { defineMiddleware } from 'astro:middleware';
import { createServerAuth } from './lib/auth/simple-multi-user';

const PUBLIC_ROUTES = ['/landing', '/login', '/auth/callback'];
const ONBOARDING_ROUTE = '/onboarding';
const DASHBOARD_ROUTE = '/life-dashboard';

export const onRequest = defineMiddleware(async ({ url, cookies, redirect }, next) => {
  const serverAuth = createServerAuth(cookies);
  const user = await serverAuth.getUser();

  const { pathname } = url;

  if (PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/api')) {
    // If user is logged in and on a public page, redirect to dashboard
    if (user && pathname !== '/auth/callback') {
      return redirect(DASHBOARD_ROUTE);
    }
    return next();
  }

  if (!user) {
    return redirect('/login');
  }

  // Check onboarding status
  const preferences = await serverAuth.getUserPreferences(user.id);
  const hasCompletedOnboarding = preferences?.onboarding_complete;

  if (!hasCompletedOnboarding && pathname !== ONBOARDING_ROUTE) {
    return redirect(ONBOARDING_ROUTE);
  }

  if (hasCompletedOnboarding && pathname === ONBOARDING_ROUTE) {
    return redirect(DASHBOARD_ROUTE);
  }
  
  if (pathname === '/') {
    return redirect(DASHBOARD_ROUTE);
  }

  return next();
});
