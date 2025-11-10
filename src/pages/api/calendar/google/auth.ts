/**
 * Google Calendar OAuth Initiation API
 * Generates OAuth URLs for Google Calendar integration
 */

import type { APIRoute } from 'astro';
import { googleCalendar } from 'lib/calendar/google-calendar';
import { createServerClient } from 'lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies }) => {
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

    const { sourceId } = await request.json();

    if (!sourceId) {
      return new Response(JSON.stringify({ 
        error: 'Source ID is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create state parameter with user and source info
    const state = encodeURIComponent(JSON.stringify({
      userId: user.id,
      sourceId: sourceId
    }));

    const authUrl = googleCalendar.getAuthUrl(state);

    return new Response(JSON.stringify({ authUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error generating Google Calendar auth URL:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate authorization URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
