/**
 * Calendar Sync API
 * Handles synchronization of calendar sources
 */

import type { APIRoute } from 'astro';
import { calendarService } from 'lib/calendar/calendar-service';
import { supabase } from 'lib/supabase/client';

export const POST: APIRoute = async ({ request, url }) => {
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

    const sourceId = url.searchParams.get('source_id');

    if (sourceId) {
      // Sync specific source
      const sources = await calendarService.getCalendarSources(user.id);
      const source = sources.find(s => s.id === sourceId);

      if (!source) {
        return new Response(JSON.stringify({ error: 'Calendar source not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await calendarService.syncCalendarSource(source);

      return new Response(JSON.stringify({ result }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Sync all sources
      const results = await calendarService.syncAllSources(user.id);

      return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error syncing calendar sources:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to sync calendar sources',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
