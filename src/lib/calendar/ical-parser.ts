/**
 * iCal Feed Parser for University Schedules and Other iCal Sources
 * Handles parsing of iCal (.ics) feeds and converting them to calendar events
 */

import type { CalendarEvent, CalendarSource } from '../../types/calendar';

interface ICalEvent {
  uid: string;
  summary: string;
  description?: string;
  dtstart: string;
  dtend: string;
  location?: string;
  rrule?: string;
  categories?: string[];
}

interface ParsedICalData {
  events: ICalEvent[];
  metadata: {
    prodid?: string;
    version?: string;
    calscale?: string;
  };
}

export class ICalParser {
  /**
   * Parse iCal feed from URL
   */
  async parseFromUrl(url: string): Promise<ParsedICalData> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MessyOS Calendar Integration/1.0',
          'Accept': 'text/calendar, text/plain, */*'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch iCal feed: ${response.status} ${response.statusText}`);
      }

      const icalData = await response.text();
      return this.parseICalString(icalData);
    } catch (error) {
      console.error('Error fetching iCal feed:', error);
      throw new Error(`Failed to parse iCal feed from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse iCal string content
   */
  parseICalString(icalData: string): ParsedICalData {
    const lines = this.unfoldLines(icalData);
    const events: ICalEvent[] = [];
    const metadata: ParsedICalData['metadata'] = {};

    let currentEvent: Partial<ICalEvent> | null = null;
    let inEvent = false;

    for (const line of lines) {
      const [property, value] = this.parseLine(line);

      if (property === 'BEGIN' && value === 'VEVENT') {
        inEvent = true;
        currentEvent = {};
        continue;
      }

      if (property === 'END' && value === 'VEVENT') {
        if (currentEvent && this.isValidEvent(currentEvent)) {
          events.push(currentEvent as ICalEvent);
        }
        inEvent = false;
        currentEvent = null;
        continue;
      }

      if (inEvent && currentEvent) {
        this.parseEventProperty(currentEvent, property, value);
      } else {
        this.parseMetadataProperty(metadata, property, value);
      }
    }

    return { events, metadata };
  }

  /**
   * Convert parsed iCal events to calendar events
   */
  convertToCalendarEvents(
    parsedData: ParsedICalData,
    source: CalendarSource,
    userId: string
  ): Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>[] {
    return parsedData.events.map(event => ({
      user_id: userId,
      source_id: source.id,
      external_id: event.uid,
      title: this.cleanText(event.summary),
      description: event.description ? this.cleanText(event.description) : undefined,
      start_time: this.parseDateTime(event.dtstart),
      end_time: this.parseDateTime(event.dtend),
      location: event.location ? this.cleanText(event.location) : undefined,
      event_type: this.inferEventType(event),
      flexibility: 'fixed' as const,
      importance: this.inferImportance(event)
    }));
  }

  /**
   * Unfold lines according to iCal specification
   */
  private unfoldLines(icalData: string): string[] {
    const lines = icalData.split(/\r?\n/);
    const unfolded: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      // Continue unfolding while next line starts with space or tab
      while (i + 1 < lines.length && /^[ \t]/.test(lines[i + 1])) {
        i++;
        line += lines[i].substring(1); // Remove the leading space/tab
      }
      
      if (line.trim()) {
        unfolded.push(line);
      }
    }

    return unfolded;
  }

  /**
   * Parse a single iCal line into property and value
   */
  private parseLine(line: string): [string, string] {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      return [line, ''];
    }

    const property = line.substring(0, colonIndex).toUpperCase();
    const value = line.substring(colonIndex + 1);

    // Handle parameters (e.g., DTSTART;TZID=America/New_York:20230101T120000)
    const semicolonIndex = property.indexOf(';');
    const cleanProperty = semicolonIndex !== -1 ? property.substring(0, semicolonIndex) : property;

    return [cleanProperty, value];
  }

  /**
   * Parse event-specific properties
   */
  private parseEventProperty(event: Partial<ICalEvent>, property: string, value: string): void {
    switch (property) {
      case 'UID':
        event.uid = value;
        break;
      case 'SUMMARY':
        event.summary = value;
        break;
      case 'DESCRIPTION':
        event.description = value;
        break;
      case 'DTSTART':
        event.dtstart = value;
        break;
      case 'DTEND':
        event.dtend = value;
        break;
      case 'LOCATION':
        event.location = value;
        break;
      case 'RRULE':
        event.rrule = value;
        break;
      case 'CATEGORIES':
        event.categories = value.split(',').map(cat => cat.trim());
        break;
    }
  }

  /**
   * Parse metadata properties
   */
  private parseMetadataProperty(metadata: ParsedICalData['metadata'], property: string, value: string): void {
    switch (property) {
      case 'PRODID':
        metadata.prodid = value;
        break;
      case 'VERSION':
        metadata.version = value;
        break;
      case 'CALSCALE':
        metadata.calscale = value;
        break;
    }
  }

  /**
   * Validate that an event has required properties
   */
  private isValidEvent(event: Partial<ICalEvent>): event is ICalEvent {
    return !!(event.uid && event.summary && event.dtstart && event.dtend);
  }

  /**
   * Parse iCal datetime format
   */
  private parseDateTime(dateTimeStr: string): string {
    // Handle different iCal datetime formats
    // Format: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
    const cleanStr = dateTimeStr.replace(/[TZ]/g, '');
    
    if (cleanStr.length >= 8) {
      const year = parseInt(cleanStr.substring(0, 4));
      const month = parseInt(cleanStr.substring(4, 6)) - 1; // Month is 0-indexed
      const day = parseInt(cleanStr.substring(6, 8));
      
      let hour = 0, minute = 0, second = 0;
      
      if (cleanStr.length >= 14) {
        hour = parseInt(cleanStr.substring(8, 10));
        minute = parseInt(cleanStr.substring(10, 12));
        second = parseInt(cleanStr.substring(12, 14));
      }
      
      // Construct a Date object and return its ISO string
      return new Date(year, month, day, hour, minute, second).toISOString();
    }
    
    // Fallback to Date parsing and return ISO string
    return new Date(dateTimeStr).toISOString();
  }

  /**
   * Clean text content (remove escape sequences, etc.)
   */
  private cleanText(text: string): string {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\')
      .trim();
  }

  /**
   * Infer event type from iCal event data
   */
  private inferEventType(event: ICalEvent): 'class' | 'meeting' | 'personal' | 'workout' | 'task' | 'break' | 'meal' {
    const summary = event.summary.toLowerCase();
    const categories = event.categories?.map(cat => cat.toLowerCase()) || [];
    
    // Check categories first
    if (categories.some(cat => ['class', 'course', 'lecture', 'lab'].includes(cat))) {
      return 'class';
    }
    if (categories.some(cat => ['meeting', 'conference', 'call'].includes(cat))) {
      return 'meeting';
    }
    if (categories.some(cat => ['workout', 'gym', 'exercise', 'fitness'].includes(cat))) {
      return 'workout';
    }
    
    // Check summary text
    if (/\b(class|course|lecture|lab|seminar|tutorial)\b/i.test(summary)) {
      return 'class';
    }
    if (/\b(meeting|conference|call|interview)\b/i.test(summary)) {
      return 'meeting';
    }
    if (/\b(workout|gym|exercise|fitness|run|yoga)\b/i.test(summary)) {
      return 'workout';
    }
    if (/\b(lunch|dinner|breakfast|meal|eat)\b/i.test(summary)) {
      return 'meal';
    }
    if (/\b(break|rest|pause)\b/i.test(summary)) {
      return 'break';
    }
    
    return 'personal';
  }

  /**
   * Infer importance level from event data
   */
  private inferImportance(event: ICalEvent): 'low' | 'medium' | 'high' | 'critical' {
    const summary = event.summary.toLowerCase();
    
    if (/\b(exam|test|final|midterm|interview|presentation|deadline)\b/i.test(summary)) {
      return 'critical';
    }
    if (/\b(class|course|lecture|meeting|appointment)\b/i.test(summary)) {
      return 'high';
    }
    if (/\b(workout|gym|exercise|meal)\b/i.test(summary)) {
      return 'medium';
    }
    
    return 'medium';
  }
}

export const icalParser = new ICalParser();
