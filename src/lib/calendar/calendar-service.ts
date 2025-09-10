/**
 * Unified Calendar Service
 * Manages all calendar sources and provides unified interface
 */

import { supabase } from '../supabase/client';
import { icalParser } from './ical-parser';
import { googleCalendar } from './google-calendar';
import type {
  CalendarSource,
  CalendarEvent,
  CreateCalendarSourceRequest,
  UpdateCalendarSourceRequest,
  SyncResult,
  TimeSlot,
  AvailabilityQuery,
  CalendarConflict,
  CalendarStats,
  ScheduledTask,
  ScheduleTaskRequest
} from 'types/calendar';
import type { TablesInsert, TablesUpdate } from 'types/supabase';

export class CalendarService {
  /**
   * Get all calendar sources for a user
   */
  async getCalendarSources(userId: string, supabaseClient?: any): Promise<CalendarSource[]> {
    const client = supabaseClient || supabase;
    const { data, error } = await client
      .from('calendar_sources')
      .select('*')
      .eq('user_id', userId)
      .order('priority', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch calendar sources: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a new calendar source
   */
  async createCalendarSource(
    userId: string,
    sourceData: CreateCalendarSourceRequest,
    supabaseClient?: any
  ): Promise<CalendarSource> {
    const client = supabaseClient || supabase;
    const { data, error } = await client
      .from('calendar_sources')
      .insert({
        user_id: userId,
        name: sourceData.name,
        type: sourceData.type,
        url: sourceData.url,
        color: sourceData.color || '#3B82F6',
        priority: sourceData.priority || 1,
        sync_frequency: sourceData.sync_frequency || 60,
        is_active: true
      } as TablesInsert<'calendar_sources'>)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create calendar source: ${error.message}`);
    }

    return data;
  }

  /**
   * Update calendar source
   */
  async updateCalendarSource(
    sourceId: string,
    updates: UpdateCalendarSourceRequest
  ): Promise<CalendarSource> {
    const { data, error } = await supabase
      .from('calendar_sources')
      .update(updates as TablesUpdate<'calendar_sources'>)
      .eq('id', sourceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update calendar source: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete calendar source and all its events
   */
  async deleteCalendarSource(sourceId: string): Promise<void> {
    // Delete events first
    await supabase
      .from('calendar_events')
      .delete()
      .eq('source_id', sourceId);

    // Delete source
    const { error } = await supabase
      .from('calendar_sources')
      .delete()
      .eq('id', sourceId);

    if (error) {
      throw new Error(`Failed to delete calendar source: ${error.message}`);
    }
  }

  /**
   * Store Google Calendar credentials
   */
  async storeGoogleCredentials(
    sourceId: string,
    credentials: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      calendar_id?: string;
    }
  ): Promise<void> {
    const expiresAt = Date.now() + (credentials.expires_in * 1000);
    
    const { error } = await supabase
      .from('calendar_sources')
      .update({
        credentials: {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token,
          expires_at: expiresAt,
          calendar_id: credentials.calendar_id || 'primary'
        }
      } as TablesUpdate<'calendar_sources'>)
      .eq('id', sourceId);

    if (error) {
      throw new Error(`Failed to store Google credentials: ${error.message}`);
    }
  }

  /**
   * Sync all active calendar sources
   */
  async syncAllSources(userId: string): Promise<SyncResult[]> {
    const sources = await this.getCalendarSources(userId);
    const activeSources = sources.filter(source => source.is_active);

    const results = await Promise.allSettled(
      activeSources.map(source => this.syncCalendarSource(source))
    );

    return results.map((result, index) => {
      const source = activeSources[index];
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          source_id: source.id,
          success: false,
          events_added: 0,
          events_updated: 0,
          events_deleted: 0,
          errors: [result.reason?.message || 'Unknown sync error'],
          last_sync: new Date()
        };
      }
    });
  }

  /**
   * Sync a specific calendar source
   */
  async syncCalendarSource(source: CalendarSource): Promise<SyncResult> {
    const result: SyncResult = {
      source_id: source.id,
      success: false,
      events_added: 0,
      events_updated: 0,
      events_deleted: 0,
      last_sync: new Date()
    };

    try {
      let newEvents: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>[] = [];

      switch (source.type) {
        case 'ical':
          newEvents = await this.syncICalSource(source);
          break;
        case 'google':
          newEvents = await this.syncGoogleSource(source);
          break;
        case 'manual':
          // Manual sources don't need syncing
          result.success = true;
          return result;
        default:
          throw new Error(`Unsupported calendar source type: ${source.type}`);
      }

      // Get existing events for this source
      const { data: existingEvents } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('source_id', source.id);

      const existingEventMap = new Map(
        (existingEvents || []).map(event => [event.external_id || '', event])
      );

      // Process new events
      for (const newEvent of newEvents) {
        const existingEvent = existingEventMap.get(newEvent.external_id || '');

        if (existingEvent) {
          // Update existing event if changed
          if (this.hasEventChanged(existingEvent, newEvent)) {
            const updatePayload: TablesUpdate<'calendar_events'> = {
              title: newEvent.title,
              description: newEvent.description,
              start_time: newEvent.start_time.toISOString(),
              end_time: newEvent.end_time.toISOString(),
              location: newEvent.location,
              event_type: newEvent.event_type,
              flexibility: newEvent.flexibility,
              importance: newEvent.importance,
              external_id: newEvent.external_id,
              user_id: newEvent.user_id,
              source_id: newEvent.source_id,
            };
            await supabase
              .from('calendar_events')
              .update(updatePayload)
              .eq('id', existingEvent.id);
            result.events_updated++;
          }
          existingEventMap.delete(newEvent.external_id || '');
        } else {
          // Add new event
          const insertPayload: TablesInsert<'calendar_events'> = {
            user_id: newEvent.user_id,
            source_id: newEvent.source_id,
            title: newEvent.title,
            description: newEvent.description,
            start_time: newEvent.start_time.toISOString(),
            end_time: newEvent.end_time.toISOString(),
            location: newEvent.location,
            event_type: newEvent.event_type,
            flexibility: newEvent.flexibility,
            importance: newEvent.importance,
            external_id: newEvent.external_id,
          };
          await supabase
            .from('calendar_events')
            .insert(insertPayload);
          result.events_added++;
        }
      }

      // Delete events that no longer exist in source
      for (const [, eventToDelete] of existingEventMap) {
        await supabase
          .from('calendar_events')
          .delete()
          .eq('id', eventToDelete.id);
        result.events_deleted++;
      }

      // Update last sync time
      await supabase
        .from('calendar_sources')
        .update({ last_sync: result.last_sync?.toISOString() } as TablesUpdate<'calendar_sources'>)
        .eq('id', source.id);

      result.success = true;
    } catch (error) {
      result.errors = [error instanceof Error ? error.message : 'Unknown error'];
    }

    return result;
  }

  /**
   * Sync iCal source
   */
  private async syncICalSource(
    source: CalendarSource
  ): Promise<Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>[]> {
    if (!source.url) {
      throw new Error('iCal source missing URL');
    }

    const parsedData = await icalParser.parseFromUrl(source.url);
    return icalParser.convertToCalendarEvents(parsedData, source, source.user_id);
  }

  /**
   * Sync Google Calendar source
   */
  private async syncGoogleSource(
    source: CalendarSource
  ): Promise<Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>[]> {
    if (!source.credentials?.access_token) {
      throw new Error('Google Calendar source missing credentials');
    }

    let accessToken = source.credentials.access_token;

    // Check if token needs refresh
    if (source.credentials.expires_at && Date.now() >= source.credentials.expires_at) {
      if (!source.credentials.refresh_token) {
        throw new Error('Google Calendar refresh token missing');
      }

      const refreshed = await googleCalendar.refreshAccessToken(source.credentials.refresh_token);
      accessToken = refreshed.access_token;

      // Update stored credentials
      await this.storeGoogleCredentials(source.id, {
        access_token: refreshed.access_token,
        refresh_token: source.credentials.refresh_token,
        expires_in: refreshed.expires_in,
        calendar_id: source.credentials.calendar_id
      });
    }

    // Fetch events from the last 30 days to 90 days in the future
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 30);
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 90);

    const response = await googleCalendar.fetchEvents(accessToken, source.credentials.calendar_id, {
      timeMin,
      timeMax,
      maxResults: 2500
    });

    return googleCalendar.convertToCalendarEvents(response.items, source, source.user_id);
  }

  /**
   * Get unified calendar events
   */
  async getCalendarEvents(
    userId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      sourceIds?: string[];
      eventTypes?: string[];
    } = {},
    supabaseClient?: any
  ): Promise<CalendarEvent[]> {
    const client = supabaseClient || supabase;
    let query = client
      .from('calendar_events')
      .select(`
        id, user_id, source_id, external_id, title, description, start_time, end_time, location, event_type, flexibility, importance, created_at, updated_at,
        calendar_sources!inner(name, type, color, is_active)
      `)
      .eq('user_id', userId)
      .eq('calendar_sources.is_active', true);

    if (options.startDate) {
      query = query.gte('start_time', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte('start_time', options.endDate.toISOString());
    }

    if (options.sourceIds?.length) {
      query = query.in('source_id', options.sourceIds);
    }

    if (options.eventTypes?.length) {
      query = query.in('event_type', options.eventTypes);
    }

    const { data, error } = await query.order('start_time');

    if (error) {
      throw new Error(`Failed to fetch calendar events: ${error.message}`);
    }

    // The data returned from Supabase will have start_time and end_time as strings,
    // which now matches our CalendarEvent interface.
    return data as CalendarEvent[] || [];
  }

  /**
   * Find available time slots
   */
  async findAvailableSlots(
    userId: string,
    query: AvailabilityQuery,
    supabaseClient?: any
  ): Promise<TimeSlot[]> {
    const events = await this.getCalendarEvents(userId, {
      startDate: query.start,
      endDate: query.end
    }, supabaseClient);

    console.log(`🔍 Finding available slots for user ${userId}:`, {
      queryStart: query.start.toISOString(),
      queryEnd: query.end.toISOString(),
      duration: query.duration,
      eventsInRange: events.length
    });

    const slots: TimeSlot[] = [];
    let current = new Date(query.start);
    const buffer = query.buffer || 0;

    let slotCount = 0;
    let availableCount = 0;
    
    while (current < query.end && slotCount < 500) { // Increased limit to find more slots
      const slotEnd = new Date(current.getTime() + query.duration * 60000);
      
      if (slotEnd > query.end) break;

      const conflicts = events.filter(event => 
        this.timeRangesOverlap(
          current,
          slotEnd,
          new Date(event.start_time), // Convert string to Date for comparison
          new Date(event.end_time)    // Convert string to Date for comparison
        )
      );

      const isAvailable = conflicts.length === 0;
      slots.push({
        start: new Date(current),
        end: new Date(slotEnd),
        duration: query.duration,
        available: isAvailable,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      });

      slotCount++;
      if (isAvailable) availableCount++;

      // Move to next potential slot - check every 30 minutes for more flexibility
      current = new Date(current.getTime() + Math.max(30, buffer || 30) * 60000);
    }
    
    console.log(`🔍 Slot search results: ${slotCount} slots checked, ${availableCount} available`);

    return slots.filter(slot => slot.available);
  }

  /**
   * Detect calendar conflicts
   */
  async detectConflicts(userId: string, dateRange?: { start: Date; end: Date }, supabaseClient?: any): Promise<CalendarConflict[]> {
    const events = await this.getCalendarEvents(userId, {
      startDate: dateRange?.start,
      endDate: dateRange?.end,
    }, supabaseClient);
    const conflicts: CalendarConflict[] = [];

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        if (this.timeRangesOverlap(
          new Date(event1.start_time), // Convert string to Date for comparison
          new Date(event1.end_time),   // Convert string to Date for comparison
          new Date(event2.start_time), // Convert string to Date for comparison
          new Date(event2.end_time)    // Convert string to Date for comparison
        )) {
          conflicts.push({
            type: 'overlap',
            events: [event1, event2],
            severity: this.calculateConflictSeverity(event1, event2),
            suggestion: this.generateConflictSuggestion(event1, event2)
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Get calendar statistics
   */
  async getCalendarStats(userId: string): Promise<CalendarStats> {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [allEvents, todayEvents, conflicts] = await Promise.all([
      this.getCalendarEvents(userId),
      this.getCalendarEvents(userId, { startDate: today, endDate: tomorrow }),
      this.detectConflicts(userId, { start: today, end: tomorrow })
    ]);

    const eventsByType = allEvents.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sources = await this.getCalendarSources(userId);
    const eventsBySource = allEvents.reduce((acc, event) => {
      const source = sources.find(s => s.id === event.source_id);
      if (source) {
        acc[source.name] = (acc[source.name] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Calculate free time today (simplified)
    const totalMinutesInDay = 24 * 60;
    const busyMinutes = todayEvents.reduce((total, event) => {
      const duration = (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / (1000 * 60);
      return total + duration;
    }, 0);

    return {
      total_events: allEvents.length,
      events_by_type: eventsByType,
      events_by_source: eventsBySource,
      upcoming_events: todayEvents.length,
      conflicts: conflicts.length,
      free_time_today: Math.max(0, totalMinutesInDay - busyMinutes)
    };
  }

  /**
   * Helper: Check if event has changed
   */
  private hasEventChanged(
    existing: CalendarEvent,
    updated: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>
  ): boolean {
    // Compare existing string dates with updated Date objects converted to ISO strings
    return (
      existing.title !== updated.title ||
      existing.description !== updated.description ||
      existing.start_time !== updated.start_time.toISOString() ||
      existing.end_time !== updated.end_time.toISOString() ||
      existing.location !== updated.location ||
      existing.event_type !== updated.event_type ||
      existing.flexibility !== updated.flexibility ||
      existing.importance !== updated.importance
    );
  }

  /**
   * Helper: Check if time ranges overlap
   */
  private timeRangesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return start1 < end2 && start2 < end1;
  }

  /**
   * Helper: Calculate conflict severity
   */
  private calculateConflictSeverity(event1: CalendarEvent, event2: CalendarEvent): 'minor' | 'major' | 'critical' {
    const hasHighImportance = event1.importance === 'critical' || event2.importance === 'critical';
    const hasFixedEvents = event1.flexibility === 'fixed' || event2.flexibility === 'fixed';

    if (hasHighImportance && hasFixedEvents) return 'critical';
    if (hasHighImportance || hasFixedEvents) return 'major';
    return 'minor';
  }

  /**
   * Helper: Generate conflict suggestion
   */
  private generateConflictSuggestion(event1: CalendarEvent, event2: CalendarEvent): string {
    if (event1.flexibility === 'flexible' && event2.flexibility === 'fixed') {
      return `Consider rescheduling "${event1.title}" as "${event2.title}" is fixed.`;
    }
    if (event2.flexibility === 'flexible' && event1.flexibility === 'fixed') {
      return `Consider rescheduling "${event2.title}" as "${event1.title}" is fixed.`;
    }
    if (event1.importance < event2.importance) {
      return `Consider prioritizing "${event2.title}" over "${event1.title}".`;
    }
    return `These events overlap. Consider rescheduling one of them.`;
  }

  /**
   * Schedule a task into the calendar.
   * This method will find an available slot, create a calendar event, and handle conflicts.
   */
  async scheduleTask(request: ScheduleTaskRequest, supabaseClient?: any): Promise<ScheduledTask> {
    const client = supabaseClient || supabase;
    const {
      task_id,
      user_id,
      title,
      description,
      estimated_duration,
      deadline,
      energy_required,
      priority,
      flexibility,
      importance,
      preferred_start_time,
      preferred_end_time,
      source_id
    } = request;

    if (!estimated_duration || estimated_duration <= 0) {
      throw new Error('Estimated duration is required and must be positive.');
    }

    // Determine the search range for available slots
    const now = new Date();
    let actualSearchStart: Date;
    let searchEnd: Date;
    
    if (preferred_start_time) {
      // User specified a preferred time - use it if it's in the future
      const preferredTime = new Date(preferred_start_time);
      actualSearchStart = preferredTime > now ? preferredTime : new Date(now.getTime() + 30 * 60000); // 30 mins from now if preferred time is past
      
      if (preferred_end_time) {
        searchEnd = new Date(preferred_end_time);
      } else {
        // If no end time specified, search from preferred time for 1 week
        searchEnd = new Date(actualSearchStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    } else {
      // No preferred time - search from next 30 minutes for 3 weeks  
      actualSearchStart = new Date(now.getTime() + 30 * 60000);
      searchEnd = deadline ? new Date(deadline) : new Date(actualSearchStart.getTime() + 21 * 24 * 60 * 60 * 1000);
    }
    
    // Ensure searchEnd is after searchStart
    if (searchEnd <= actualSearchStart) {
      searchEnd = new Date(actualSearchStart.getTime() + 7 * 24 * 60 * 60 * 1000); // Default to 1 week from start
    }
    
    console.log('🕒 Schedule time range:', {
      now: now.toISOString(),
      actualSearchStart: actualSearchStart.toISOString(), 
      searchEnd: searchEnd.toISOString(),
      duration: estimated_duration
    });

    // Find available slots
    const availabilityQuery: AvailabilityQuery = {
      start: actualSearchStart,
      end: searchEnd,
      duration: estimated_duration,
      buffer: 0, // No buffer for now to find more slots
      preferences: {
        energyLevel: energy_required,
        taskType: 'task' // Assuming tasks are generally of type 'task'
      }
    };

    const availableSlots = await this.findAvailableSlots(user_id, availabilityQuery, client);

    console.log(`🔍 Searching for slots:`, {
      actualSearchStart: actualSearchStart.toISOString(),
      searchEnd: searchEnd.toISOString(),
      duration: estimated_duration,
      slotsFound: availableSlots.length
    });

    if (availableSlots.length === 0) {
      // Get all events in the time range to help debug
      const events = await this.getCalendarEvents(user_id, {
        startDate: actualSearchStart,
        endDate: searchEnd
      }, client);
      console.log(`📅 Events in range: ${events.length}`, events.map(e => ({
        title: e.title,
        start: e.start_time,
        end: e.end_time
      })));
      
      throw new Error('No available slots found for the given task and preferences.');
    }

    // For now, pick the first available slot.
    // Future enhancements will involve more intelligent selection based on energy patterns, etc.
    const selectedSlot = availableSlots[0];

    // Create the calendar event
    const newCalendarEvent: TablesInsert<'calendar_events'> = {
      user_id,
      source_id: source_id || (await this.getDefaultCalendarSourceId(user_id, client)), // Use a default source if not provided
      title,
      description,
      start_time: selectedSlot.start.toISOString(),
      end_time: selectedSlot.end.toISOString(),
      event_type: 'task',
      flexibility: flexibility || 'flexible',
      importance: importance || 'medium',
      external_id: task_id // Link task to calendar event
    };

    const { data, error } = await client
      .from('calendar_events')
      .insert(newCalendarEvent)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create calendar event for task: ${error.message}`);
    }

    // Check for conflicts with the newly created event (should be none if slot was truly available, but good for robustness)
    const conflicts = await this.detectConflicts(user_id, {
      start: selectedSlot.start,
      end: selectedSlot.end
    }, client);

    const scheduledTask: ScheduledTask = {
      task_id: task_id,
      calendar_event_id: data.id,
      scheduled_start_time: data.start_time, // Already ISO string from DB
      scheduled_end_time: data.end_time,     // Already ISO string from DB
      original_task_duration: estimated_duration,
      energy_match_score: undefined, // To be filled by EnergyAwareScheduler
      flexibility_used: newCalendarEvent.flexibility,
      conflict_resolved: conflicts.length === 0,
      resolution_details: conflicts.length > 0 ? 'Conflicts detected after scheduling' : undefined
    };

    return scheduledTask;
  }

  /**
   * Helper: Get a default calendar source ID for scheduling if none is provided.
   * This could be the user's primary manual calendar or the first active one found.
   * If no sources exist, creates a default manual calendar.
   */
  private async getDefaultCalendarSourceId(userId: string, supabaseClient?: any): Promise<string> {
    const sources = await this.getCalendarSources(userId, supabaseClient);
    let defaultSource = sources.find(s => s.type === 'manual' && s.is_active) || sources.find(s => s.is_active);

    if (!defaultSource) {
      console.log('🔧 No active calendar sources found, creating default manual calendar');
      // Create a default manual calendar source
      defaultSource = await this.createCalendarSource(userId, {
        name: 'My Tasks',
        type: 'manual',
        color: '#3B82F6',
        priority: 1,
        sync_frequency: 60
      }, supabaseClient);
      console.log('✅ Created default calendar source:', defaultSource.id);
    }
    
    return defaultSource.id;
  }
}

export const calendarService = new CalendarService();
