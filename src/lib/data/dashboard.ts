import { createServerClient } from '../supabase/server';

export async function getDashboardData() {
  const supabase = createServerClient();
  
  // For now, return mock data since we can't verify auth on server
  // We'll move this logic to client-side
  return {
    user: { email: 'test@example.com' },
    habits: [],
    taskStats: { total: 0, completed: 0, pending: 0 },
    recentMetrics: []
  };
}
