// UK Student Analytics API Endpoint
// Provides spending analytics and insights

import type { APIRoute } from 'astro';
import { ukFinanceService } from '../../../lib/uk-student/uk-finance-service';
import type { AnalyticsPeriod } from '../../../types/uk-student-finance';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = url.searchParams.get('userId');
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const groupBy = url.searchParams.get('groupBy') || 'day';

    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ error: 'Start date and end date are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const period: AnalyticsPeriod = {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      groupBy: groupBy as 'day' | 'week' | 'month'
    };

    const analytics = await ukFinanceService.getSpendingAnalytics(userId, period);
    const insights = await ukFinanceService.generateSpendingInsights(userId);
    
    return new Response(JSON.stringify({ analytics, insights }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch analytics' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};