/**
 * Anchor Service
 * Parses calendar events and classifies them as anchors
 * 
 * An anchor is a fixed external commitment (class, appointment, train departure)
 * that serves as a hard constraint around which chains are built.
 */

import { calendarService } from '../calendar/calendar-service';
import type { CalendarEvent } from '../../types/calendar';
import type { Anchor, AnchorType, AnchorServiceConfig } from './types';
import { DEFAULT_ANCHOR_CONFIG } from './types';

export class AnchorService {
  private config: AnchorServiceConfig;

  constructor(config: Partial<AnchorServiceConfig> = {}) {
    this.config = { ...DEFAULT_ANCHOR_CONFIG, ...config };
  }

  /**
   * Get all anchors for a specific date
   * 
   * @param date - The date to get anchors for
   * @param userId - The user ID
   * @param supabaseClient - Optional Supabase client for testing
   * @returns Array of anchors for the date
   * 
   * Requirements: 1.1 - Pull today's calendar events
   */
  async getAnchorsForDate(
    date: Date,
    userId: string,
    supabaseClient?: any
  ): Promise<Anchor[]> {
    try {
      // Set date range for the entire day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Fetch calendar events for the day
      const events = await calendarService.getCalendarEvents(
        userId,
        {
          startDate: startOfDay,
          endDate: endOfDay,
        },
        supabaseClient
      );

      // Convert calendar events to anchors
      const anchors = events.map(event => this.convertEventToAnchor(event));

      // Sort by start time
      anchors.sort((a, b) => a.start.getTime() - b.start.getTime());

      return anchors;
    } catch (error) {
      // Calendar Service Error Handling
      // Requirements: Design - Error Handling - Calendar Service Failures
      console.error('[Anchor Service] Calendar API error - returning empty anchors array:', error);
      console.error('[Anchor Service] Error details:', {
        userId,
        date: date.toISOString(),
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      
      // Return empty array on error (graceful degradation)
      // This allows the system to continue with a basic plan
      // UI will display: "No calendar access. Showing basic plan."
      return [];
    }
  }

  /**
   * Convert a calendar event to an anchor
   * 
   * @param event - Calendar event to convert
   * @returns Anchor object
   * 
   * Requirements: 1.2 - Classify each as an anchor
   * Requirements: 1.3 - Extract start time, location, type
   */
  private convertEventToAnchor(event: CalendarEvent): Anchor {
    const type = this.classifyAnchorType(event);
    const must_attend = this.determineMustAttend(event);

    return {
      id: `anchor-${event.id}`,
      start: new Date(event.start_time),
      end: new Date(event.end_time),
      title: event.title,
      location: event.location,
      type,
      must_attend,
      calendar_event_id: event.id,
    };
  }

  /**
   * Classify the type of anchor based on event title and metadata
   * 
   * @param event - Calendar event to classify
   * @returns Anchor type classification
   * 
   * Requirements: 1.4 - Classify anchor type (lecture/tutorial/seminar/workshop)
   * Requirements: 18.5 - Log anchor classification
   */
  classifyAnchorType(event: CalendarEvent): AnchorType {
    const title = event.title.toLowerCase();
    const description = (event.description || '').toLowerCase();
    const combinedText = `${title} ${description}`;

    let type: AnchorType;

    // Check for workshop keywords first (more specific than seminar)
    if (this.containsAnyKeyword(combinedText, this.config.workshopKeywords)) {
      type = 'workshop';
    }
    // Check for class/lecture keywords
    else if (this.containsAnyKeyword(combinedText, this.config.classKeywords)) {
      type = 'class';
    }
    // Check for seminar keywords
    else if (this.containsAnyKeyword(combinedText, this.config.seminarKeywords)) {
      type = 'seminar';
    }
    // Check for appointment keywords
    else if (this.containsAnyKeyword(combinedText, this.config.appointmentKeywords)) {
      type = 'appointment';
    }
    // Default to 'other' if no keywords match
    else {
      type = 'other';
    }

    // Debug logging for anchor classification
    // Requirements: 18.5
    console.log('[Anchor Service] Classified anchor:', {
      eventId: event.id,
      title: event.title,
      type,
      location: event.location || 'none',
      start: new Date(event.start_time).toLocaleString(),
      end: new Date(event.end_time).toLocaleString(),
    });

    return type;
  }

  /**
   * Determine if an anchor must be attended
   * 
   * @param event - Calendar event to evaluate
   * @returns True if must attend, false otherwise
   * 
   * Requirements: 1.5 - Location exists → must_attend = true
   */
  private determineMustAttend(event: CalendarEvent): boolean {
    if (!this.config.requireLocationForMustAttend) {
      return this.config.defaultMustAttend;
    }

    // If location exists and is not empty, must attend
    return !!(event.location && event.location.trim().length > 0);
  }

  /**
   * Helper: Check if text contains any of the keywords
   * 
   * @param text - Text to search in
   * @param keywords - Keywords to search for
   * @returns True if any keyword is found
   */
  private containsAnyKeyword(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword.toLowerCase()));
  }

  /**
   * Get anchors that must be attended (have location)
   * 
   * @param anchors - Array of anchors to filter
   * @returns Array of must-attend anchors
   */
  getMustAttendAnchors(anchors: Anchor[]): Anchor[] {
    return anchors.filter(anchor => anchor.must_attend);
  }

  /**
   * Get anchors by type
   * 
   * @param anchors - Array of anchors to filter
   * @param type - Anchor type to filter by
   * @returns Array of anchors of the specified type
   */
  getAnchorsByType(anchors: Anchor[], type: AnchorType): Anchor[] {
    return anchors.filter(anchor => anchor.type === type);
  }

  /**
   * Get next anchor after a given time
   * 
   * @param anchors - Array of anchors to search
   * @param currentTime - Current time to compare against
   * @returns Next anchor or undefined if none found
   */
  getNextAnchor(anchors: Anchor[], currentTime: Date): Anchor | undefined {
    return anchors.find(anchor => anchor.start > currentTime);
  }

  /**
   * Check if a time falls within any anchor
   * 
   * @param anchors - Array of anchors to check
   * @param time - Time to check
   * @returns True if time falls within an anchor
   */
  isTimeInAnchor(anchors: Anchor[], time: Date): boolean {
    return anchors.some(
      anchor => time >= anchor.start && time <= anchor.end
    );
  }
}

// Export singleton instance
export const anchorService = new AnchorService();
