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

    const eventId = url.searchParams.get('id');
    if (!eventId) {
      return new Response(JSON.stringify({ error: 'Event ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const eventData = await request.json();
    
    // Verify the event belongs to the user
    const { data: existingEvent, error: eventError } = await serverAuth.supabase
      .from('calendar_events')
      .select('id, user_id')
      .eq('id', eventId)
      .eq('user_id', user.id)
      .single();

    if (eventError || !existingEvent) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If source_id is being changed, verify it belongs to the user
    if (eventData.source_id) {
      const { data: source, error: sourceError } = await serverAuth.supabase
        .from('calendar_sources')
        .select('id')
        .eq('id', eventData.source_id)
        .eq('user_id', user.id)
        .single();

      if (sourceError || !source) {
        return new Response(JSON.stringify({ error: 'Invalid calendar source' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Update the event
    const { data: event, error } = await serverAuth.supabase
      .from('calendar_events')
      .update({
        title: eventData.title,
        description: eventData.description,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        location: eventData.location,
        event_type: eventData.event_type,
        flexibility: eventData.flexibility,
        importance: eventData.importance,
        source_id: eventData.source_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select(`
        *,
        calendar_sources!inner(name, type, color)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update calendar event: ${error.message}`);
    }

    return new Response(JSON.stringify({ 
      event,
      message: 'Calendar event updated successfully' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update calendar event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ url, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const eventId = url.searchParams.get('id');
    if (!eventId) {
      return new Response(JSON.stringify({ error: 'Event ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify the event belongs to the user and delete it
    const { data: deletedEvent, error } = await serverAuth.supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id)
      .select('id, title')
      .single();

    if (error) {
      throw new Error(`Failed to delete calendar event: ${error.message}`);
    }

    return new Response(JSON.stringify({ 
      message: `Event "${deletedEvent.title}" deleted successfully` 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to delete calendar event',
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

    const eventData = await request.json();
    
    // Validate required fields
    if (!eventData.title || !eventData.start_time || !eventData.end_time || !eventData.source_id) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: title, start_time, end_time, source_id' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify the source belongs to the user
    const { data: source, error: sourceError } = await serverAuth.supabase
      .from('calendar_sources')
      .select('id')
      .eq('id', eventData.source_id)
      .eq('user_id', user.id)
      .single();

    if (sourceError || !source) {
      return new Response(JSON.stringify({ 
        error: 'Invalid calendar source' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create the event
    const { data: event, error } = await serverAuth.supabase
      .from('calendar_events')
      .insert({
        user_id: user.id,
        source_id: eventData.source_id,
        title: eventData.title,
        description: eventData.description || null,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        location: eventData.location || null,
        event_type: eventData.event_type || 'personal',
        flexibility: eventData.flexibility || 'moveable',
        importance: eventData.importance || 'medium'
      })
      .select(`
        *,
        calendar_sources!inner(name, type, color)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }

    return new Response(JSON.stringify({ 
      event,
      message: 'Calendar event created successfully' 
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create calendar event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
