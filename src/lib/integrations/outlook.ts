// src/lib/integrations/outlook.ts - Outlook Integration for meshOS
// University email parsing, calendar sync, and deadline detection for Masters students

import { createSupabaseClient } from '../supabase/client';

export interface OutlookProfile {
  id: string;
  email: string;
  displayName: string;
  givenName: string;
  surname: string;
  userPrincipalName: string;
  jobTitle?: string;
  officeLocation?: string;
}

export interface OutlookEmail {
  id: string;
  subject: string;
  bodyPreview: string;
  importance: 'low' | 'normal' | 'high';
  isRead: boolean;
  receivedDateTime: string;
  sentDateTime?: string;
  sender: {
    name: string;
    address: string;
  };
  categories: string[];
  hasAttachments: boolean;
  inferredClassification?: 'assignment' | 'deadline' | 'announcement' | 'personal' | 'administrative';
  extractedDeadlines: Array<{
    description: string;
    dueDate: string;
    confidence: number;
  }>;
}

export interface OutlookCalendarEvent {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
    address?: string;
  };
  organizer: {
    name: string;
    address: string;
  };
  attendees: Array<{
    name: string;
    address: string;
    status: 'none' | 'tentative' | 'accepted' | 'declined';
  }>;
  bodyPreview: string;
  importance: 'low' | 'normal' | 'high';
  isOnlineMeeting: boolean;
  onlineMeetingUrl?: string;
  categories: string[];
  classification?: 'lecture' | 'seminar' | 'meeting' | 'exam' | 'deadline' | 'social';
}

export interface UniversityInsight {
  type: 'upcoming_deadline' | 'class_schedule' | 'assignment_pattern' | 'communication_trend';
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  actionItems: string[];
  relatedEmails?: string[];
  relatedEvents?: string[];
  detectedDate?: string;
}

class OutlookIntegration {
  private supabase = createSupabaseClient();
  private graphUrl = 'https://graph.microsoft.com/v1.0';

  /**
   * Initiate Microsoft OAuth flow
   */
  async initiateOAuth(): Promise<string> {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    if (!clientId) {
      throw new Error('Microsoft OAuth not configured. Please set MICROSOFT_CLIENT_ID in environment variables.');
    }

    const scopes = [
      'User.Read',
      'Mail.Read',
      'Mail.ReadBasic',
      'Calendars.Read',
      'MailboxSettings.Read'
    ];
    
    const state = Math.random().toString(36).substring(7);
    localStorage.setItem('outlook_oauth_state', state);

    const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('redirect_uri', `${window.location.origin}/api/auth/outlook/callback`);
    authUrl.searchParams.set('response_mode', 'query');

    return authUrl.toString();
  }

  /**
   * Handle OAuth callback and exchange code for token
   */
  async handleOAuthCallback(code: string, state: string): Promise<{ success: boolean; error?: string }> {
    try {
      const storedState = localStorage.getItem('outlook_oauth_state');
      if (state !== storedState) {
        return { success: false, error: 'Invalid OAuth state' };
      }

      const response = await fetch('/api/auth/outlook/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await response.json();
      
      if (data.success) {
        await this.syncUserProfile(data.access_token);
        localStorage.removeItem('outlook_oauth_state');
        return { success: true };
      }

      return { success: false, error: data.error || 'OAuth exchange failed' };
    } catch (error) {
      console.error('Outlook OAuth callback error:', error);
      return { success: false, error: 'Failed to complete Outlook authentication' };
    }
  }

  /**
   * Sync user's Outlook profile
   */
  async syncUserProfile(accessToken: string): Promise<OutlookProfile | null> {
    try {
      const response = await fetch(`${this.graphUrl}/me`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch Outlook profile');
      }

      const profile = await response.json();

      // Store profile in database
      const { error } = await this.supabase
        .from('outlook_profiles')
        .upsert({
          user_id: (await this.supabase.auth.getUser()).data.user?.id,
          outlook_id: profile.id,
          email: profile.mail || profile.userPrincipalName,
          display_name: profile.displayName,
          given_name: profile.givenName,
          surname: profile.surname,
          user_principal_name: profile.userPrincipalName,
          job_title: profile.jobTitle,
          office_location: profile.officeLocation,
          access_token: accessToken, // Store encrypted in production
          last_synced: new Date().toISOString()
        });

      if (error) throw error;

      // Start background sync of emails and calendar
      this.syncRecentEmails(accessToken);
      this.syncUpcomingEvents(accessToken);

      return {
        id: profile.id,
        email: profile.mail || profile.userPrincipalName,
        displayName: profile.displayName,
        givenName: profile.givenName,
        surname: profile.surname,
        userPrincipalName: profile.userPrincipalName,
        jobTitle: profile.jobTitle,
        officeLocation: profile.officeLocation
      };
    } catch (error) {
      console.error('Error syncing Outlook profile:', error);
      return null;
    }
  }

  /**
   * Sync recent emails with university-specific parsing
   */
  async syncRecentEmails(accessToken: string, days: number = 30): Promise<OutlookEmail[]> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const response = await fetch(
        `${this.graphUrl}/me/messages?$top=100&$filter=receivedDateTime ge ${since.toISOString()}&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,importance,isRead,receivedDateTime,sentDateTime,sender,categories,hasAttachments,body`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch emails');
      }

      const data = await response.json();
      const emails: OutlookEmail[] = [];

      for (const email of data.value) {
        // Process and classify email
        const processedEmail = await this.processEmail(email);
        
        // Store in database
        await this.supabase
          .from('outlook_emails')
          .upsert({
            user_id: (await this.supabase.auth.getUser()).data.user?.id,
            outlook_email_id: email.id,
            subject: email.subject,
            body_preview: email.bodyPreview,
            importance: email.importance,
            is_read: email.isRead,
            received_date_time: email.receivedDateTime,
            sent_date_time: email.sentDateTime,
            sender_name: email.sender.emailAddress.name,
            sender_address: email.sender.emailAddress.address,
            categories: email.categories || [],
            has_attachments: email.hasAttachments,
            inferred_classification: processedEmail.inferredClassification,
            extracted_deadlines: processedEmail.extractedDeadlines,
            last_synced: new Date().toISOString()
          });

        emails.push(processedEmail);
      }

      return emails;
    } catch (error) {
      console.error('Error syncing emails:', error);
      return [];
    }
  }

  /**
   * Process and classify email content for university context
   */
  private async processEmail(email: any): Promise<OutlookEmail> {
    const subject = email.subject.toLowerCase();
    const content = email.bodyPreview.toLowerCase();
    const senderAddress = email.sender.emailAddress.address.toLowerCase();

    // Classify email type
    let inferredClassification: OutlookEmail['inferredClassification'];
    
    if (this.isUniversityDomain(senderAddress) || this.isAcademicContent(subject, content)) {
      if (this.isAssignmentRelated(subject, content)) {
        inferredClassification = 'assignment';
      } else if (this.isDeadlineRelated(subject, content)) {
        inferredClassification = 'deadline';
      } else if (this.isAnnouncement(subject, content)) {
        inferredClassification = 'announcement';
      } else {
        inferredClassification = 'administrative';
      }
    } else {
      inferredClassification = 'personal';
    }

    // Extract deadlines
    const extractedDeadlines = this.extractDeadlines(email.subject, email.bodyPreview);

    return {
      id: email.id,
      subject: email.subject,
      bodyPreview: email.bodyPreview,
      importance: email.importance,
      isRead: email.isRead,
      receivedDateTime: email.receivedDateTime,
      sentDateTime: email.sentDateTime,
      sender: {
        name: email.sender.emailAddress.name,
        address: email.sender.emailAddress.address
      },
      categories: email.categories || [],
      hasAttachments: email.hasAttachments,
      inferredClassification,
      extractedDeadlines
    };
  }

  /**
   * Check if sender is from university domain
   */
  private isUniversityDomain(email: string): boolean {
    const universityDomains = [
      '.ac.uk',
      '.edu',
      'university',
      'college',
      'school',
      'academic'
    ];
    return universityDomains.some(domain => email.includes(domain));
  }

  /**
   * Check if content is academic-related
   */
  private isAcademicContent(subject: string, content: string): boolean {
    const academicKeywords = [
      'assignment', 'essay', 'dissertation', 'thesis', 'coursework',
      'module', 'lecture', 'seminar', 'tutorial', 'deadline',
      'submission', 'marks', 'grades', 'feedback', 'exam',
      'assessment', 'project', 'study', 'research', 'paper',
      'professor', 'lecturer', 'supervisor', 'course', 'unit'
    ];
    
    const text = `${subject} ${content}`;
    return academicKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check if content is assignment-related
   */
  private isAssignmentRelated(subject: string, content: string): boolean {
    const assignmentKeywords = [
      'assignment', 'essay', 'coursework', 'project', 'homework',
      'submit', 'submission', 'deliverable', 'task', 'report'
    ];
    
    const text = `${subject} ${content}`;
    return assignmentKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check if content is deadline-related
   */
  private isDeadlineRelated(subject: string, content: string): boolean {
    const deadlineKeywords = [
      'deadline', 'due', 'submit by', 'expires', 'final date',
      'last day', 'before', 'urgent', 'reminder'
    ];
    
    const text = `${subject} ${content}`;
    return deadlineKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Check if content is announcement
   */
  private isAnnouncement(subject: string, content: string): boolean {
    const announcementKeywords = [
      'announcement', 'notice', 'update', 'information',
      'important', 'reminder', 'alert', 'notification'
    ];
    
    const text = `${subject} ${content}`;
    return announcementKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Extract deadlines from email content using pattern matching
   */
  private extractDeadlines(subject: string, content: string): Array<{
    description: string;
    dueDate: string;
    confidence: number;
  }> {
    const deadlines: Array<{ description: string; dueDate: string; confidence: number }> = [];
    const text = `${subject} ${content}`;

    // Deadline patterns
    const patterns = [
      // "due on [date]"
      /due\s+(?:on\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+\w+(?:\s+\d{4})?)/gi,
      // "deadline: [date]"
      /deadline:?\s*(\d{1,2}(?:st|nd|rd|th)?\s+\w+(?:\s+\d{4})?)/gi,
      // "submit by [date]"
      /submit\s+by\s+(\d{1,2}(?:st|nd|rd|th)?\s+\w+(?:\s+\d{4})?)/gi,
      // "before [date]"
      /before\s+(\d{1,2}(?:st|nd|rd|th)?\s+\w+(?:\s+\d{4})?)/gi,
      // ISO date patterns
      /(\d{4}-\d{2}-\d{2})/g,
      // UK date patterns
      /(\d{1,2}\/\d{1,2}\/\d{4})/g
    ];

    patterns.forEach((pattern, index) => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const dateMatch = match.match(/(\d{1,2}(?:st|nd|rd|th)?\s+\w+(?:\s+\d{4})?|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/);
          if (dateMatch) {
            const dateStr = dateMatch[1];
            const parsedDate = this.parseFlexibleDate(dateStr);
            
            if (parsedDate) {
              deadlines.push({
                description: match.trim(),
                dueDate: parsedDate.toISOString(),
                confidence: index < 3 ? 0.9 : 0.7 // Higher confidence for explicit patterns
              });
            }
          }
        });
      }
    });

    return deadlines;
  }

  /**
   * Parse flexible date formats
   */
  private parseFlexibleDate(dateStr: string): Date | null {
    try {
      // Try different date parsing approaches
      const formats = [
        // ISO format
        /^\d{4}-\d{2}-\d{2}$/,
        // UK format
        /^\d{1,2}\/\d{1,2}\/\d{4}$/,
        // Natural language with year
        /^\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4}$/i,
        // Natural language without year (assume current year)
        /^\d{1,2}(?:st|nd|rd|th)?\s+\w+$/i
      ];

      for (const format of formats) {
        if (format.test(dateStr)) {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Sync upcoming calendar events
   */
  async syncUpcomingEvents(accessToken: string, days: number = 60): Promise<OutlookCalendarEvent[]> {
    try {
      const startTime = new Date().toISOString();
      const endTime = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      const response = await fetch(
        `${this.graphUrl}/me/events?$filter=start/dateTime ge '${startTime}' and start/dateTime le '${endTime}'&$orderby=start/dateTime&$select=id,subject,start,end,location,organizer,attendees,bodyPreview,importance,isOnlineMeeting,onlineMeeting,categories`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }

      const data = await response.json();
      const events: OutlookCalendarEvent[] = [];

      for (const event of data.value) {
        const processedEvent = this.processCalendarEvent(event);
        
        // Store in database
        await this.supabase
          .from('outlook_calendar_events')
          .upsert({
            user_id: (await this.supabase.auth.getUser()).data.user?.id,
            outlook_event_id: event.id,
            subject: event.subject,
            start_date_time: event.start.dateTime,
            start_time_zone: event.start.timeZone,
            end_date_time: event.end.dateTime,
            end_time_zone: event.end.timeZone,
            location_name: event.location?.displayName,
            location_address: event.location?.address?.street,
            organizer_name: event.organizer.emailAddress.name,
            organizer_address: event.organizer.emailAddress.address,
            attendees: event.attendees?.map((a: any) => ({
              name: a.emailAddress.name,
              address: a.emailAddress.address,
              status: a.status.response
            })) || [],
            body_preview: event.bodyPreview,
            importance: event.importance,
            is_online_meeting: event.isOnlineMeeting,
            online_meeting_url: event.onlineMeeting?.joinUrl,
            categories: event.categories || [],
            classification: processedEvent.classification,
            last_synced: new Date().toISOString()
          });

        events.push(processedEvent);
      }

      return events;
    } catch (error) {
      console.error('Error syncing calendar events:', error);
      return [];
    }
  }

  /**
   * Process and classify calendar events
   */
  private processCalendarEvent(event: any): OutlookCalendarEvent {
    const subject = event.subject.toLowerCase();
    const organizer = event.organizer.emailAddress.address.toLowerCase();

    // Classify event type
    let classification: OutlookCalendarEvent['classification'];
    
    if (this.isUniversityDomain(organizer) || this.isAcademicContent(subject, event.bodyPreview || '')) {
      if (subject.includes('lecture') || subject.includes('class')) {
        classification = 'lecture';
      } else if (subject.includes('seminar') || subject.includes('workshop')) {
        classification = 'seminar';
      } else if (subject.includes('exam') || subject.includes('test')) {
        classification = 'exam';
      } else if (subject.includes('deadline') || subject.includes('submission')) {
        classification = 'deadline';
      } else {
        classification = 'meeting';
      }
    } else {
      classification = 'social';
    }

    return {
      id: event.id,
      subject: event.subject,
      start: event.start,
      end: event.end,
      location: event.location,
      organizer: {
        name: event.organizer.emailAddress.name,
        address: event.organizer.emailAddress.address
      },
      attendees: event.attendees?.map((a: any) => ({
        name: a.emailAddress.name,
        address: a.emailAddress.address,
        status: a.status.response
      })) || [],
      bodyPreview: event.bodyPreview,
      importance: event.importance,
      isOnlineMeeting: event.isOnlineMeeting,
      onlineMeetingUrl: event.onlineMeeting?.joinUrl,
      categories: event.categories || [],
      classification
    };
  }

  /**
   * Generate university-specific insights
   */
  async generateUniversityInsights(userId: string): Promise<UniversityInsight[]> {
    try {
      const insights: UniversityInsight[] = [];

      // Get recent emails and events
      const { data: emails } = await this.supabase
        .from('outlook_emails')
        .select('*')
        .eq('user_id', userId)
        .gte('received_date_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const { data: events } = await this.supabase
        .from('outlook_calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_date_time', new Date().toISOString());

      if (!emails && !events) return insights;

      // Analyze upcoming deadlines
      const upcomingDeadlines = emails?.filter(e => 
        e.inferred_classification === 'deadline' || 
        e.extracted_deadlines?.length > 0
      ) || [];

      if (upcomingDeadlines.length > 0) {
        const urgentDeadlines = upcomingDeadlines.filter(e => {
          const deadlines = e.extracted_deadlines || [];
          return deadlines.some(d => {
            const dueDate = new Date(d.dueDate);
            const daysUntil = (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            return daysUntil <= 7;
          });
        });

        if (urgentDeadlines.length > 0) {
          insights.push({
            type: 'upcoming_deadline',
            title: `${urgentDeadlines.length} urgent deadline${urgentDeadlines.length > 1 ? 's' : ''} approaching`,
            description: `You have assignments due within the next week. Consider prioritizing these tasks.`,
            urgency: 'high',
            actionItems: [
              'Review deadline requirements',
              'Create a completion timeline',
              'Set up focused work sessions',
              'Prepare submission materials'
            ],
            relatedEmails: urgentDeadlines.map(e => e.outlook_email_id).slice(0, 3)
          });
        }
      }

      // Analyze class schedule patterns
      const lectures = events?.filter(e => e.classification === 'lecture') || [];
      if (lectures.length > 0) {
        const todayLectures = lectures.filter(e => {
          const eventDate = new Date(e.start_date_time);
          const today = new Date();
          return eventDate.toDateString() === today.toDateString();
        });

        if (todayLectures.length > 0) {
          insights.push({
            type: 'class_schedule',
            title: `${todayLectures.length} lecture${todayLectures.length > 1 ? 's' : ''} today`,
            description: 'Prepare for today\'s lectures by reviewing materials and previous notes.',
            urgency: 'medium',
            actionItems: [
              'Review lecture materials',
              'Prepare questions for discussion',
              'Check required readings',
              'Ensure you have necessary supplies'
            ],
            relatedEvents: todayLectures.map(e => e.outlook_event_id)
          });
        }
      }

      // Analyze assignment patterns
      const assignmentEmails = emails?.filter(e => e.inferred_classification === 'assignment') || [];
      if (assignmentEmails.length > 3) {
        insights.push({
          type: 'assignment_pattern',
          title: 'High assignment activity detected',
          description: `You've received ${assignmentEmails.length} assignment-related emails recently. Consider organizing your workload.`,
          urgency: 'medium',
          actionItems: [
            'Create an assignment tracker',
            'Prioritize by due dates',
            'Break large assignments into smaller tasks',
            'Schedule regular work sessions'
          ],
          relatedEmails: assignmentEmails.map(e => e.outlook_email_id).slice(0, 5)
        });
      }

      // Communication trend analysis
      const universityEmails = emails?.filter(e => 
        e.inferred_classification !== 'personal'
      ) || [];

      if (universityEmails.length > 10) {
        const unreadCount = universityEmails.filter(e => !e.is_read).length;
        if (unreadCount > 5) {
          insights.push({
            type: 'communication_trend',
            title: `${unreadCount} unread university emails`,
            description: 'You have several unread academic emails that may contain important information.',
            urgency: 'medium',
            actionItems: [
              'Review unread emails for deadlines',
              'Mark important emails for follow-up',
              'Archive non-essential emails',
              'Set up email filters for better organization'
            ]
          });
        }
      }

      return insights.sort((a, b) => {
        const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      });
    } catch (error) {
      console.error('Error generating university insights:', error);
      return [];
    }
  }

  /**
   * Get integration status
   */
  async getIntegrationStatus(userId: string): Promise<{
    connected: boolean;
    profile?: OutlookProfile;
    lastSync?: string;
    emailCount?: number;
    eventCount?: number;
  }> {
    try {
      const { data: profile } = await this.supabase
        .from('outlook_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!profile) {
        return { connected: false };
      }

      const { count: emailCount } = await this.supabase
        .from('outlook_emails')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      const { count: eventCount } = await this.supabase
        .from('outlook_calendar_events')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      return {
        connected: true,
        profile: {
          id: profile.outlook_id,
          email: profile.email,
          displayName: profile.display_name,
          givenName: profile.given_name,
          surname: profile.surname,
          userPrincipalName: profile.user_principal_name,
          jobTitle: profile.job_title,
          officeLocation: profile.office_location
        },
        lastSync: profile.last_synced,
        emailCount: emailCount || 0,
        eventCount: eventCount || 0
      };
    } catch (error) {
      console.error('Error getting integration status:', error);
      return { connected: false };
    }
  }

  /**
   * Trigger full sync
   */
  async triggerFullSync(userId: string): Promise<boolean> {
    try {
      const { data: profile } = await this.supabase
        .from('outlook_profiles')
        .select('access_token')
        .eq('user_id', userId)
        .single();

      if (!profile?.access_token) {
        return false;
      }

      await Promise.all([
        this.syncRecentEmails(profile.access_token, 60),
        this.syncUpcomingEvents(profile.access_token, 90)
      ]);

      return true;
    } catch (error) {
      console.error('Error triggering full sync:', error);
      return false;
    }
  }
}

// Export singleton instance
export const outlookIntegration = new OutlookIntegration();

// Helper functions
export const connectOutlook = () => outlookIntegration.initiateOAuth();
export const getUniversityInsights = (userId: string) => 
  outlookIntegration.generateUniversityInsights(userId);
export const getOutlookStatus = (userId: string) => 
  outlookIntegration.getIntegrationStatus(userId);

export default outlookIntegration;