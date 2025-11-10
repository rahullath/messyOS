/**
 * Calendar Conflicts Detection API
 * Detects and reports calendar conflicts
 */

import type { APIRoute } from 'astro';
import { calendarService } from '../../../lib/calendar/calendar-service';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse optional date range
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    
    let dateRange: { start: Date; end: Date } | undefined;
    if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    const conflicts = await calendarService.detectConflicts(user.id, dateRange);

    return new Response(JSON.stringify({ conflicts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error detecting calendar conflicts:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to detect calendar conflicts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};