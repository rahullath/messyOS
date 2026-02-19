// Anchor Service Types - Calendar event classification

/**
 * Anchor - Fixed external commitment (class, appointment, train departure)
 * Hard constraint that chains are built around
 */
export interface Anchor {
  id: string;
  start: Date;
  end: Date;
  title: string;
  location?: string;
  type: AnchorType;
  must_attend: boolean;
  calendar_event_id: string;
}

/**
 * Anchor Type - Classification of calendar events
 */
export type AnchorType = 'class' | 'seminar' | 'workshop' | 'appointment' | 'other';

/**
 * Calendar Event - Raw event from calendar service
 * This is the input format from the calendar API
 */
export interface CalendarEvent {
  id: string;
  summary: string;
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
  description?: string;
  status?: string;
}

/**
 * Anchor Classification Result
 */
export interface AnchorClassification {
  type: AnchorType;
  must_attend: boolean;
  confidence: number; // 0-1, for future enhancement
}

/**
 * Anchor Service Configuration
 */
export interface AnchorServiceConfig {
  // Classification keywords for different anchor types
  classKeywords: string[];
  seminarKeywords: string[];
  workshopKeywords: string[];
  appointmentKeywords: string[];
  
  // Default must_attend behavior
  defaultMustAttend: boolean;
  requireLocationForMustAttend: boolean;
}

/**
 * Default configuration for anchor classification
 */
export const DEFAULT_ANCHOR_CONFIG: AnchorServiceConfig = {
  classKeywords: ['lecture', 'class', 'tutorial', 'lab', 'practical'],
  seminarKeywords: ['seminar', 'session'],
  workshopKeywords: ['workshop', 'training', 'bootcamp'],
  appointmentKeywords: ['appointment', 'meeting', 'consultation', 'interview'],
  defaultMustAttend: false,
  requireLocationForMustAttend: true,
};
