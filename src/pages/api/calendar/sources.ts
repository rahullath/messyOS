/**
 * Calendar Sources API
 * Manages calendar source CRUD operations
 */

import type { APIRoute } from 'astro';
import { calendarService } from 'lib/calendar/calendar-service';
import { createServerClient } from 'lib/supabase/server';
import type { CreateCalendarSourceRequest, UpdateCalendarSourceRequest } from 'types/calendar';

export const GET: APIRoute = async ({ request, cookies }) => {
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

    const sources = await calendarService.getCalendarSources(user.id);

    return new Response(JSON.stringify({ sources }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching calendar sources:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch calendar sources',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

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

    const sourceData: CreateCalendarSourceRequest = await request.json();

    // Validate required fields
    if (!sourceData.name || !sourceData.type) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: name and type are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate iCal URL if type is ical
    if (sourceData.type === 'ical' && !sourceData.url) {
      return new Response(JSON.stringify({ 
        error: 'URL is required for iCal sources' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const source = await calendarService.createCalendarSource(user.id, sourceData);

    return new Response(JSON.stringify({ source }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating calendar source:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create calendar source',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request, url, cookies }) => {
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

    const sourceId = url.searchParams.get('id');
    if (!sourceId) {
      return new Response(JSON.stringify({ error: 'Source ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updates: UpdateCalendarSourceRequest = await request.json();
    const source = await calendarService.updateCalendarSource(sourceId, updates);

    return new Response(JSON.stringify({ source }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating calendar source:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update calendar source',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ request, url, cookies }) => {
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

    const sourceId = url.searchParams.get('id');
    if (!sourceId) {
      return new Response(JSON.stringify({ error: 'Source ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await calendarService.deleteCalendarSource(sourceId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting calendar source:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete calendar source',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
