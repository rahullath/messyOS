/**
 * Calendar Events API
 * Manages calendar events and availability queries
 */

import type { APIRoute } from 'astro';
import { calendarService } from 'lib/calendar/calendar-service';
import { createServerClient } from 'lib/supabase/server';
import type { AvailabilityQuery } from 'types/calendar';

export const GET: APIRoute = async ({ request, url, cookies }) => {
  const supabase = createServerClient(cookies);
  try {
    // Get user from session
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse query parameters
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const sourceIds = url.searchParams.get('source_ids')?.split(',');
    const eventTypes = url.searchParams.get('event_types')?.split(',');

    const options: Parameters<typeof calendarService.getCalendarEvents>[1] = {};

    if (startDate) {
      options.startDate = new Date(startDate);
    }
    if (endDate) {
      options.endDate = new Date(endDate);
    }
    if (sourceIds?.length) {
      options.sourceIds = sourceIds;
    }
    if (eventTypes?.length) {
      options.eventTypes = eventTypes;
    }

    const events = await calendarService.getCalendarEvents(user.id, options);

    return new Response(JSON.stringify({ events }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch calendar events',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
