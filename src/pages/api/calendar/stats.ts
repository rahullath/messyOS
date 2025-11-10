/**
 * Calendar Statistics API
 * Provides calendar analytics and statistics
 */

import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

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

    // Get basic calendar stats using authenticated server client
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all events for the user
    const { data: allEvents, error: eventsError } = await serverAuth.supabase
      .from('calendar_events')
      .select(`
        *,
        calendar_sources!inner(name, type, color, is_active)
      `)
      .eq('user_id', user.id)
      .eq('calendar_sources.is_active', true);

    if (eventsError) {
      throw new Error(`Failed to fetch calendar events: ${eventsError.message}`);
    }

    // Get today's events
    const { data: todayEvents, error: todayError } = await serverAuth.supabase
      .from('calendar_events')
      .select(`
        *,
        calendar_sources!inner(name, type, color, is_active)
      `)
      .eq('user_id', user.id)
      .eq('calendar_sources.is_active', true)
      .gte('start_time', today.toISOString())
      .lte('start_time', tomorrow.toISOString());

    if (todayError) {
      throw new Error(`Failed to fetch today's events: ${todayError.message}`);
    }

    // Get calendar sources
    const { data: sources, error: sourcesError } = await serverAuth.supabase
      .from('calendar_sources')
      .select('*')
      .eq('user_id', user.id)
      .order('priority', { ascending: true });

    if (sourcesError) {
      throw new Error(`Failed to fetch calendar sources: ${sourcesError.message}`);
    }

    // Calculate stats
    const events = allEvents || [];
    const todayEventsData = todayEvents || [];
    const sourcesData = sources || [];

    const eventsByType = events.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsBySource = events.reduce((acc, event) => {
      const source = sourcesData.find(s => s.id === event.source_id);
      if (source) {
        acc[source.name] = (acc[source.name] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Calculate free time today (simplified)
    const totalMinutesInDay = 24 * 60;
    const busyMinutes = todayEventsData.reduce((total, event) => {
      const duration = (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / (1000 * 60);
      return total + duration;
    }, 0);

    const stats = {
      total_events: events.length,
      events_by_type: eventsByType,
      events_by_source: eventsBySource,
      upcoming_events: todayEventsData.length,
      conflicts: 0, // TODO: Implement conflict detection
      free_time_today: Math.max(0, totalMinutesInDay - busyMinutes)
    };

    return new Response(JSON.stringify({ stats }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching calendar stats:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch calendar stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};