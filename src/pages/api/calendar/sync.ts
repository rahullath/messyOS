/**
 * Calendar Sync API
 * Handles synchronization of calendar sources
 */

import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import { icalParser } from '../../../lib/calendar/ical-parser';

export const POST: APIRoute = async ({ url, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sourceId = url.searchParams.get('source_id');

    if (sourceId) {
      // Get specific source using authenticated client
      const { data: sources, error: sourcesError } = await serverAuth.supabase
        .from('calendar_sources')
        .select('*')
        .eq('user_id', user.id)
        .eq('id', sourceId);

      if (sourcesError) {
        throw new Error(`Failed to fetch calendar source: ${sourcesError.message}`);
      }

      if (!sources || sources.length === 0) {
        return new Response(JSON.stringify({ error: 'Calendar source not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get the calendar source details
      const source = sources[0];
      
      let eventsAdded = 0;
      let eventsUpdated = 0;
      let eventsDeleted = 0;

      if (source.type === 'ical' && source.url) {
        // Parse iCal feed
        const parsedData = await icalParser.parseFromUrl(source.url);
        const newEvents = icalParser.convertToCalendarEvents(parsedData, source, user.id);

        // Get existing events for this source
        const { data: existingEvents } = await serverAuth.supabase
          .from('calendar_events')
          .select('*')
          .eq('source_id', sourceId)
          .eq('user_id', user.id);

        const existingEventMap = new Map(
          (existingEvents || []).map(event => [event.external_id, event])
        );

        // Process new events
        for (const newEvent of newEvents) {
          const existingEvent = existingEventMap.get(newEvent.external_id || '');

          if (existingEvent) {
            // Check if event has changed
            const hasChanged = 
              existingEvent.title !== newEvent.title ||
              existingEvent.description !== newEvent.description ||
              new Date(existingEvent.start_time).getTime() !== newEvent.start_time.getTime() ||
              new Date(existingEvent.end_time).getTime() !== newEvent.end_time.getTime() ||
              existingEvent.location !== newEvent.location;

            if (hasChanged) {
              await serverAuth.supabase
                .from('calendar_events')
                .update(newEvent)
                .eq('id', existingEvent.id);
              eventsUpdated++;
            }
            existingEventMap.delete(newEvent.external_id || '');
          } else {
            // Add new event
            await serverAuth.supabase
              .from('calendar_events')
              .insert(newEvent);
            eventsAdded++;
          }
        }

        // Delete events that no longer exist in source
        for (const [, eventToDelete] of existingEventMap) {
          await serverAuth.supabase
            .from('calendar_events')
            .delete()
            .eq('id', eventToDelete.id);
          eventsDeleted++;
        }
      }

      // Update last sync time
      await serverAuth.supabase
        .from('calendar_sources')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', sourceId);

      const result = {
        source_id: sourceId,
        success: true,
        events_added: eventsAdded,
        events_updated: eventsUpdated,
        events_deleted: eventsDeleted,
        last_sync: new Date()
      };

      return new Response(JSON.stringify({ result }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Get all sources using authenticated client
      const { data: sources, error: sourcesError } = await serverAuth.supabase
        .from('calendar_sources')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (sourcesError) {
        throw new Error(`Failed to fetch calendar sources: ${sourcesError.message}`);
      }

      // Sync each active source
      const results = [];
      
      for (const source of sources || []) {
        let eventsAdded = 0;
        let eventsUpdated = 0;
        let eventsDeleted = 0;
        let success = true;
        let error = null;

        try {
          if (source.type === 'ical' && source.url) {
            // Parse iCal feed
            const parsedData = await icalParser.parseFromUrl(source.url);
            const newEvents = icalParser.convertToCalendarEvents(parsedData, source, user.id);

            // Get existing events for this source
            const { data: existingEvents } = await serverAuth.supabase
              .from('calendar_events')
              .select('*')
              .eq('source_id', source.id)
              .eq('user_id', user.id);

            const existingEventMap = new Map(
              (existingEvents || []).map(event => [event.external_id, event])
            );

            // Process new events
            for (const newEvent of newEvents) {
              const existingEvent = existingEventMap.get(newEvent.external_id || '');

              if (existingEvent) {
                // Check if event has changed
                const hasChanged = 
                  existingEvent.title !== newEvent.title ||
                  existingEvent.description !== newEvent.description ||
                  new Date(existingEvent.start_time).getTime() !== newEvent.start_time.getTime() ||
                  new Date(existingEvent.end_time).getTime() !== newEvent.end_time.getTime() ||
                  existingEvent.location !== newEvent.location;

                if (hasChanged) {
                  await serverAuth.supabase
                    .from('calendar_events')
                    .update(newEvent)
                    .eq('id', existingEvent.id);
                  eventsUpdated++;
                }
                existingEventMap.delete(newEvent.external_id || '');
              } else {
                // Add new event
                await serverAuth.supabase
                  .from('calendar_events')
                  .insert(newEvent);
                eventsAdded++;
              }
            }

            // Delete events that no longer exist in source
            for (const [, eventToDelete] of existingEventMap) {
              await serverAuth.supabase
                .from('calendar_events')
                .delete()
                .eq('id', eventToDelete.id);
              eventsDeleted++;
            }

            // Update last sync time
            await serverAuth.supabase
              .from('calendar_sources')
              .update({ last_sync: new Date().toISOString() })
              .eq('id', source.id);
          }
        } catch (syncError) {
          success = false;
          error = syncError instanceof Error ? syncError.message : 'Unknown sync error';
        }

        results.push({
          source_id: source.id,
          success,
          events_added: eventsAdded,
          events_updated: eventsUpdated,
          events_deleted: eventsDeleted,
          last_sync: new Date(),
          error
        });
      }

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
