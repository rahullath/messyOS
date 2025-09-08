/**
 * Calendar Integration Types
 * Type definitions for multi-calendar integration system
 */

export interface CalendarSource {
  id: string;
  user_id: string;
  name: string;
  type: 'google' | 'ical' | 'outlook' | 'manual';
  url?: string; // For iCal feeds
  credentials?: {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    calendar_id?: string;
    [key: string]: any;
  };
  sync_frequency: number; // minutes
  color: string;
  priority: number;
  is_active: boolean;
  last_sync?: Date;
  created_at: Date;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  source_id: string;
  external_id?: string; // ID from source system
  title: string;
  description?: string;
  start_time: string; // ISO string
  end_time: string; // ISO string
  location?: string;
  event_type: 'class' | 'meeting' | 'personal' | 'workout' | 'task' | 'break' | 'meal';
  flexibility: 'fixed' | 'moveable' | 'flexible';
  importance: 'low' | 'medium' | 'high' | 'critical';
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

export interface CalendarConflict {
  type: 'overlap' | 'double_booking' | 'travel_time';
  events: CalendarEvent[];
  severity: 'minor' | 'major' | 'critical';
  suggestion?: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  duration: number; // minutes
  available: boolean;
  conflicts?: CalendarEvent[];
}

export interface ScheduledTask {
  task_id: string;
  calendar_event_id: string;
  scheduled_start_time: string; // ISO string
  scheduled_end_time: string; // ISO string
  original_task_duration: number; // minutes
  energy_match_score?: number; // 0-100
  flexibility_used?: 'fixed' | 'moveable' | 'flexible';
  conflict_resolved?: boolean;
  resolution_details?: string;
}

export interface ScheduleTaskRequest {
  task_id: string;
  user_id: string;
  title: string;
  description?: string;
  estimated_duration: number; // minutes
  deadline?: string; // ISO string
  energy_required?: 'low' | 'medium' | 'high';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  flexibility?: 'fixed' | 'moveable' | 'flexible';
  importance?: 'low' | 'medium' | 'high' | 'critical';
  preferred_start_time?: string; // ISO string
  preferred_end_time?: string; // ISO string
  source_id?: string; // Optional: if scheduling into a specific calendar source
}

export interface AvailabilityQuery {
  start: Date;
  end: Date;
  duration: number; // minimum duration in minutes
  buffer?: number; // buffer time in minutes
  preferences?: {
    preferredTimes?: { start: string; end: string }[]; // HH:MM format
    avoidTimes?: { start: string; end: string }[];
    energyLevel?: 'low' | 'medium' | 'high';
    taskType?: string;
  };
}

export interface SyncResult {
  source_id: string;
  success: boolean;
  events_added: number;
  events_updated: number;
  events_deleted: number;
  errors?: string[];
  last_sync: Date;
}

export interface CalendarStats {
  total_events: number;
  events_by_type: Record<string, number>;
  events_by_source: Record<string, number>;
  upcoming_events: number;
  conflicts: number;
  free_time_today: number; // minutes
}

// API Request/Response types
export interface CreateCalendarSourceRequest {
  name: string;
  type: CalendarSource['type'];
  url?: string;
  color?: string;
  priority?: number;
  sync_frequency?: number;
}

export interface UpdateCalendarSourceRequest {
  name?: string;
  url?: string;
  color?: string;
  priority?: number;
  sync_frequency?: number;
  is_active?: boolean;
}

export interface CalendarEventRequest {
  title: string;
  description?: string;
  start_time: string; // ISO string
  end_time: string; // ISO string
  location?: string;
  event_type?: CalendarEvent['event_type'];
  flexibility?: CalendarEvent['flexibility'];
  importance?: CalendarEvent['importance'];
}

export interface GoogleCalendarAuthRequest {
  code: string;
  state?: string;
}

export interface GoogleCalendarAuthResponse {
  success: boolean;
  source_id?: string;
  error?: string;
}

// Component Props types
export interface CalendarViewProps {
  events: CalendarEvent[];
  sources: CalendarSource[];
  selectedDate?: string; // ISO string
  viewType?: 'day' | 'week' | 'month';
  onEventClick?: (event: CalendarEvent) => void;
  onTimeSlotClick?: (date: string) => void;
  onEventUpdate?: (event: CalendarEvent) => void;
}

export interface CalendarSourceManagerProps {
  sources: CalendarSource[];
  onAddSource: (source: CreateCalendarSourceRequest) => Promise<void>;
  onUpdateSource: (id: string, updates: UpdateCalendarSourceRequest) => Promise<void>;
  onDeleteSource: (id: string) => Promise<void>;
  onSyncSource: (id: string) => Promise<void>;
}

export interface EventFormProps {
  event?: CalendarEvent;
  onSave: (event: CalendarEventRequest) => Promise<void>;
  onCancel: () => void;
  sources: CalendarSource[];
}

// Utility types
export type CalendarSourceType = CalendarSource['type'];
export type EventType = CalendarEvent['event_type'];
export type FlexibilityType = CalendarEvent['flexibility'];
export type ImportanceLevel = CalendarEvent['importance'];

// Error types
export class CalendarError extends Error {
  constructor(
    message: string,
    public code: string,
    public source?: string
  ) {
    super(message);
    this.name = 'CalendarError';
  }
}

export class SyncError extends CalendarError {
  constructor(message: string, source: string, public details?: any) {
    super(message, 'SYNC_ERROR', source);
    this.name = 'SyncError';
  }
}

export class AuthError extends CalendarError {
  constructor(message: string, source: string) {
    super(message, 'AUTH_ERROR', source);
    this.name = 'AuthError';
  }
}
