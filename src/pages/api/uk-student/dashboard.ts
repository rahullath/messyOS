// UK Student Dashboard API Endpoint
import type { APIRoute } from 'astro';
import { dashboardService } from '../../../lib/uk-student/dashboard-service';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = url.searchParams.get('userId');
    const dateParam = url.searchParams.get('date');

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const date = dateParam ? new Date(dateParam) : new Date();

    // Get dashboard data
    const data = await dashboardService.getDashboardData(userId, date);

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'private, max-age=300' // 5 min cache
        }
      }
    );
  } catch (error) {
    console.error('Dashboard API error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to load dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
