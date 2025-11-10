/**
 * Calendar Sources API
 * Manages calendar source CRUD operations
 */

import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import type { CreateCalendarSourceRequest, UpdateCalendarSourceRequest } from 'types/calendar';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Use the authenticated server client to get calendar sources
    const { data: sources, error } = await serverAuth.supabase
      .from('calendar_sources')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch calendar sources: ${error.message}`);
    }

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
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
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

    // Use the authenticated server client to create the calendar source
    const { data: source, error } = await serverAuth.supabase
      .from('calendar_sources')
      .insert({
        user_id: user.id,
        name: sourceData.name,
        type: sourceData.type,
        url: sourceData.url,
        color: sourceData.color || '#3B82F6',
        priority: sourceData.priority || 1,
        sync_frequency: sourceData.sync_frequency || 60,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create calendar source: ${error.message}`);
    }

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
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
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

    // Use the authenticated server client to update the calendar source
    const { data: source, error } = await serverAuth.supabase
      .from('calendar_sources')
      .update(updates)
      .eq('id', sourceId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update calendar source: ${error.message}`);
    }

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
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
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

    // Delete events first using authenticated server client
    await serverAuth.supabase
      .from('calendar_events')
      .delete()
      .eq('source_id', sourceId)
      .eq('user_id', user.id);

    // Delete source using authenticated server client
    const { error } = await serverAuth.supabase
      .from('calendar_sources')
      .delete()
      .eq('id', sourceId)
      .eq('user_id', user.id);

    if (error) {
      throw new Error(`Failed to delete calendar source: ${error.message}`);
    }

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
