/**
 * Google Calendar API Integration
 * Handles OAuth flow and bidirectional sync with Google Calendar
 */

import type { CalendarEvent, CalendarSource } from '../../types/calendar';

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  status?: string;
  eventType?: string;
}

interface GoogleCalendarListResponse {
  items: GoogleCalendarEvent[];
  nextPageToken?: string;
}

export class GoogleCalendarIntegration {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly scopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events'
  ];

  constructor() {
    this.clientId = import.meta.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = import.meta.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = import.meta.env.GOOGLE_REDIRECT_URI || `${import.meta.env.SITE}/api/calendar/google/callback`;
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      ...(state && { state })
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    return response.json();
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
    token_type: string;
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh access token: ${error}`);
    }

    return response.json();
  }

  /**
   * Fetch events from Google Calendar
   */
  async fetchEvents(
    accessToken: string,
    calendarId: string = 'primary',
    options: {
      timeMin?: Date;
      timeMax?: Date;
      maxResults?: number;
      pageToken?: string;
    } = {}
  ): Promise<GoogleCalendarListResponse> {
    const params = new URLSearchParams({
      calendarId,
      singleEvents: 'true',
      orderBy: 'startTime',
      ...(options.timeMin && { timeMin: options.timeMin.toISOString() }),
      ...(options.timeMax && { timeMax: options.timeMax.toISOString() }),
      ...(options.maxResults && { maxResults: options.maxResults.toString() }),
      ...(options.pageToken && { pageToken: options.pageToken })
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch Google Calendar events: ${error}`);
    }

    return response.json();
  }

  /**
   * Create event in Google Calendar
   */
  async createEvent(
    accessToken: string,
    calendarId: string = 'primary',
    event: Partial<GoogleCalendarEvent>
  ): Promise<GoogleCalendarEvent> {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Google Calendar event: ${error}`);
    }

    return response.json();
  }

  /**
   * Update event in Google Calendar
   */
  async updateEvent(
    accessToken: string,
    calendarId: string = 'primary',
    eventId: string,
    event: Partial<GoogleCalendarEvent>
  ): Promise<GoogleCalendarEvent> {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update Google Calendar event: ${error}`);
    }

    return response.json();
  }

  /**
   * Delete event from Google Calendar
   */
  async deleteEvent(
    accessToken: string,
    calendarId: string = 'primary',
    eventId: string
  ): Promise<void> {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete Google Calendar event: ${error}`);
    }
  }

  /**
   * Convert Google Calendar events to our calendar events format
   */
  convertToCalendarEvents(
    googleEvents: GoogleCalendarEvent[],
    source: CalendarSource,
    userId: string
  ): Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>[] {
    return googleEvents
      .filter(event => event.status !== 'cancelled')
      .map(event => ({
        user_id: userId,
        source_id: source.id,
        external_id: event.id,
        title: event.summary || 'Untitled Event',
        description: event.description,
        start_time: this.parseGoogleDateTime(event.start),
        end_time: this.parseGoogleDateTime(event.end),
        location: event.location,
        event_type: this.inferEventType(event),
        flexibility: 'fixed' as const,
        importance: this.inferImportance(event)
      }));
  }

  /**
   * Convert our calendar event to Google Calendar format
   */
  convertFromCalendarEvent(event: CalendarEvent): Partial<GoogleCalendarEvent> {
    return {
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.start_time.toISOString(),
      },
      end: {
        dateTime: event.end_time.toISOString(),
      },
      location: event.location,
    };
  }

  /**
   * Parse Google Calendar datetime format
   */
  private parseGoogleDateTime(dateTime: GoogleCalendarEvent['start'] | GoogleCalendarEvent['end']): Date {
    if (dateTime.dateTime) {
      return new Date(dateTime.dateTime);
    } else if (dateTime.date) {
      return new Date(dateTime.date);
    }
    throw new Error('Invalid Google Calendar datetime format');
  }

  /**
   * Infer event type from Google Calendar event
   */
  private inferEventType(event: GoogleCalendarEvent): 'class' | 'meeting' | 'personal' | 'workout' | 'task' | 'break' | 'meal' {
    const summary = (event.summary || '').toLowerCase();
    
    if (/\b(class|course|lecture|lab|seminar|tutorial)\b/i.test(summary)) {
      return 'class';
    }
    if (/\b(meeting|conference|call|interview|standup|sync)\b/i.test(summary)) {
      return 'meeting';
    }
    if (/\b(workout|gym|exercise|fitness|run|yoga|training)\b/i.test(summary)) {
      return 'workout';
    }
    if (/\b(lunch|dinner|breakfast|meal|eat|food)\b/i.test(summary)) {
      return 'meal';
    }
    if (/\b(break|rest|pause|coffee)\b/i.test(summary)) {
      return 'break';
    }
    if (/\b(task|todo|work|project)\b/i.test(summary)) {
      return 'task';
    }
    
    return 'personal';
  }

  /**
   * Infer importance level from Google Calendar event
   */
  private inferImportance(event: GoogleCalendarEvent): 'low' | 'medium' | 'high' | 'critical' {
    const summary = (event.summary || '').toLowerCase();
    
    if (/\b(urgent|critical|emergency|exam|test|final|midterm|interview|presentation|deadline)\b/i.test(summary)) {
      return 'critical';
    }
    if (/\b(important|meeting|class|course|lecture|appointment|doctor)\b/i.test(summary)) {
      return 'high';
    }
    if (/\b(workout|gym|exercise|meal|social|personal)\b/i.test(summary)) {
      return 'medium';
    }
    
    return 'medium';
  }

  /**
   * Validate credentials format
   */
  validateCredentials(credentials: any): boolean {
    return !!(
      credentials &&
      typeof credentials === 'object' &&
      credentials.access_token &&
      credentials.refresh_token
    );
  }
}

export const googleCalendar = new GoogleCalendarIntegration();