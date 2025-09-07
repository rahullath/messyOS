/**
 * Unified Calendar Service
 * Manages all calendar sources and provides unified interface
 */

import { supabase } from 'lib/supabase/client';
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
  CalendarStats
} from 'types/calendar';

export class CalendarService {
  /**
   * Get all calendar sources for a user
   */
  async getCalendarSources(userId: string): Promise<CalendarSource[]> {
    const { data, error } = await supabase
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
    sourceData: CreateCalendarSourceRequest
  ): Promise<CalendarSource> {
    const { data, error } = await supabase
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
      })
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
      .update(updates)
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
      })
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
        (existingEvents || []).map(event => [event.external_id, event])
      );

      // Process new events
      for (const newEvent of newEvents) {
        const existingEvent = existingEventMap.get(newEvent.external_id || '');

        if (existingEvent) {
          // Update existing event if changed
          if (this.hasEventChanged(existingEvent, newEvent)) {
            await supabase
              .from('calendar_events')
              .update(newEvent)
              .eq('id', existingEvent.id);
            result.events_updated++;
          }
          existingEventMap.delete(newEvent.external_id || '');
        } else {
          // Add new event
          await supabase
            .from('calendar_events')
            .insert(newEvent);
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
        .update({ last_sync: result.last_sync })
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
    } = {}
  ): Promise<CalendarEvent[]> {
    let query = supabase
      .from('calendar_events')
      .select(`
        *,
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

    return data || [];
  }

  /**
   * Find available time slots
   */
  async findAvailableSlots(
    userId: string,
    query: AvailabilityQuery
  ): Promise<TimeSlot[]> {
    const events = await this.getCalendarEvents(userId, {
      startDate: query.start,
      endDate: query.end
    });

    const slots: TimeSlot[] = [];
    const current = new Date(query.start);
    const buffer = query.buffer || 0;

    while (current < query.end) {
      const slotEnd = new Date(current.getTime() + query.duration * 60000);
      
      if (slotEnd > query.end) break;

      const conflicts = events.filter(event => 
        this.timeRangesOverlap(
          current,
          slotEnd,
          new Date(event.start_time),
          new Date(event.end_time)
        )
      );

      slots.push({
        start: new Date(current),
        end: new Date(slotEnd),
        duration: query.duration,
        available: conflicts.length === 0,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      });

      // Move to next potential slot (considering buffer)
      current.setMinutes(current.getMinutes() + Math.max(15, buffer));
    }

    return slots.filter(slot => slot.available);
  }

  /**
   * Detect calendar conflicts
   */
  async detectConflicts(userId: string, dateRange?: { start: Date; end: Date }): Promise<CalendarConflict[]> {
    const events = await this.getCalendarEvents(userId, dateRange);
    const conflicts: CalendarConflict[] = [];

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];

        if (this.timeRangesOverlap(
          new Date(event1.start_time),
          new Date(event1.end_time),
          new Date(event2.start_time),
          new Date(event2.end_time)
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
    return (
      existing.title !== updated.title ||
      existing.description !== updated.description ||
      existing.start_time.getTime() !== updated.start_time.getTime() ||
      existing.end_time.getTime() !== updated.end_time.getTime() ||
      existing.location !== updated.location ||
      existing.event_type !== updated.event_type
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
}

export const calendarService = new CalendarService();
