import { createServerClient } from '../supabase/server';
import type { AstroCookies } from 'astro';

export async function getDashboardData(cookies: AstroCookies) {
  const supabase = createServerClient(cookies);
  
  // For now, return mock data since we can't verify auth on server
  // We'll move this logic to client-side
  return {
    user: { email: 'test@example.com' },
    habits: [],
    taskStats: { total: 0, completed: 0, pending: 0 },
    recentMetrics: []
  };
}
