/**
 * Calendar Availability API
 * Finds available time slots and detects conflicts
 */

import type { APIRoute } from 'astro';
import { calendarService } from 'lib/calendar/calendar-service';
import { supabase } from 'lib/supabase/client';
import type { AvailabilityQuery } from 'types/calendar';

export const POST: APIRoute = async ({ request }) => {
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

    const query: AvailabilityQuery = await request.json();

    // Validate required fields
    if (!query.start || !query.end || !query.duration) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: start, end, and duration are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Convert string dates to Date objects
    query.start = new Date(query.start);
    query.end = new Date(query.end);

    const availableSlots = await calendarService.findAvailableSlots(user.id, query);

    return new Response(JSON.stringify({ availableSlots }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error finding available slots:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to find available slots',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ request, url }) => {
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

    // Check for conflicts
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
    console.error('Error detecting conflicts:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to detect conflicts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
