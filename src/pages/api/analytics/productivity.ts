import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { TimeTrackingService } from '../../../lib/task-management/time-tracking-service';

// GET /api/analytics/productivity - Get productivity analytics
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const dateFrom = url.searchParams.get('date_from') || undefined;
    const dateTo = url.searchParams.get('date_to') || undefined;
    const reportType = url.searchParams.get('report_type') as 'daily' | 'weekly' | 'monthly' || 'weekly';

    // Get productivity patterns
    const dateRange = dateFrom && dateTo ? { from: dateFrom, to: dateTo } : undefined;
    const productivityData = await TimeTrackingService.analyzeProductivityPatterns(user.id, dateRange);

    // Get time reports
    const timeReport = await TimeTrackingService.generateTimeReports(user.id, reportType);

    const response = {
      productivity: productivityData,
      report: timeReport,
      generatedAt: new Date().toISOString()
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/analytics/productivity:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};