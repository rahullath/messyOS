/**
 * Calendar Events API
 * Manages calendar events and availability queries
 */

import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const GET: APIRoute = async ({ request, url, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse query parameters
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const sourceIds = url.searchParams.get('source_ids')?.split(',');
    const eventTypes = url.searchParams.get('event_types')?.split(',');

    // Build query using authenticated server client
    let query = serverAuth.supabase
      .from('calendar_events')
      .select(`
        *,
        calendar_sources!inner(name, type, color, is_active)
      `)
      .eq('user_id', user.id)
      .eq('calendar_sources.is_active', true);

    if (startDate) {
      query = query.gte('start_time', new Date(startDate).toISOString());
    }
    if (endDate) {
      query = query.lte('start_time', new Date(endDate).toISOString());
    }
    if (sourceIds?.length) {
      query = query.in('source_id', sourceIds);
    }
    if (eventTypes?.length) {
      query = query.in('event_type', eventTypes);
    }

    const { data: events, error } = await query.order('start_time');

    if (error) {
      throw new Error(`Failed to fetch calendar events: ${error.message}`);
    }

    return new Response(JSON.stringify({ events: events || [] }), {
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
