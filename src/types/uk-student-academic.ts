// TypeScript interfaces for UK Student Academic System

export type AssignmentType = 'essay' | 'report' | 'presentation' | 'exam' | 'coursework' | 'project';
export type AssignmentStatus = 'not_started' | 'in_progress' | 'draft_complete' | 'review' | 'submitted' | 'graded';
export type StudySessionType = 'reading' | 'writing' | 'research' | 'revision' | 'practice' | 'group_study';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

// Core Academic interfaces
export interface Assignment {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  course_code: string;
  course_name: string;
  assignment_type: AssignmentType;
  word_count?: number;
  current_word_count?: number;
  deadline: string; // ISO timestamp
  submission_date?: string;
  status: AssignmentStatus;
  priority: UrgencyLevel;
  estimated_hours: number;
  actual_hours?: number;
  grade?: string;
  feedback?: string;
  created_at: string;
  updated_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  assignment_id?: string;
  course_code?: string;
  session_type: StudySessionType;
  title: string;
  description?: string;
  planned_duration: number; // minutes
  actual_duration?: number;
  start_time?: string;
  end_time?: string;
  productivity_rating?: number; // 1-10
  focus_rating?: number; // 1-10
  notes?: string;
  completed: boolean;
  created_at: string;
}

export interface Course {
  id: string;
  user_id: string;
  course_code: string;
  course_name: string;
  credits: number;
  semester: string;
  instructor?: string;
  schedule?: CourseSchedule[];
  is_active: boolean;
  created_at: string;
}

export interface CourseSchedule {
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // HH:MM format
  end_time: string;
  location?: string;
  session_type: 'lecture' | 'seminar' | 'tutorial' | 'lab' | 'workshop';
}

// Assignment breakdown and task creation
export interface AssignmentBreakdown {
  assignment_id: string;
  tasks: AssignmentTask[];
  total_estimated_hours: number;
  suggested_schedule: StudyBlock[];
}

export interface AssignmentTask {
  title: string;
  description: string;
  estimated_duration: number; // minutes
  priority: 'low' | 'medium' | 'high' | 'urgent';
  complexity: 'simple' | 'moderate' | 'complex';
  energy_required: 'low' | 'medium' | 'high';
  dependencies?: string[]; // task titles this depends on
  deadline_offset_days: number; // days before assignment deadline
}

export interface StudyBlock {
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string;
  task_title: string;
  session_type: StudySessionType;
  energy_level: 'low' | 'medium' | 'high';
}

// Progress tracking
export interface AssignmentProgress {
  assignment_id: string;
  completion_percentage: number;
  tasks_completed: number;
  tasks_total: number;
  hours_spent: number;
  hours_remaining: number;
  on_track: boolean;
  days_behind?: number;
  next_milestone: string;
  urgency_level: UrgencyLevel;
}

export interface AcademicDeadline {
  assignment_id: string;
  title: string;
  course_name: string;
  deadline: string;
  days_remaining: number;
  urgency_level: UrgencyLevel;
  completion_percentage: number;
  estimated_hours_remaining: number;
}

// Study session optimization
export interface StudySessionRecommendation {
  session_type: StudySessionType;
  duration: number;
  optimal_time_slots: TimeSlot[];
  energy_requirement: 'low' | 'medium' | 'high';
  location_suggestions: string[];
  preparation_needed: string[];
}

export interface TimeSlot {
  start_time: string; // HH:MM
  end_time: string;
  date: string; // YYYY-MM-DD
  energy_level: 'low' | 'medium' | 'high';
  availability_score: number; // 0-1
}

// API request/response interfaces
export interface CreateAssignmentRequest {
  title: string;
  description?: string;
  course_code: string;
  course_name: string;
  assignment_type: AssignmentType;
  word_count?: number;
  deadline: string;
  estimated_hours?: number;
}

export interface UpdateAssignmentRequest {
  title?: string;
  description?: string;
  status?: AssignmentStatus;
  current_word_count?: number;
  actual_hours?: number;
  grade?: string;
  feedback?: string;
}

export interface CreateStudySessionRequest {
  assignment_id?: string;
  course_code?: string;
  session_type: StudySessionType;
  title: string;
  description?: string;
  planned_duration: number;
  start_time?: string;
}

export interface AssignmentBreakdownRequest {
  assignment_id: string;
  preferences?: {
    daily_study_hours?: number;
    preferred_session_duration?: number;
    avoid_weekends?: boolean;
    morning_person?: boolean;
  };
}

// Academic dashboard data
export interface AcademicDashboardData {
  upcoming_deadlines: AcademicDeadline[];
  current_assignments: Assignment[];
  today_study_sessions: StudySession[];
  weekly_progress: WeeklyProgress;
  urgent_tasks: AssignmentTask[];
  study_recommendations: StudySessionRecommendation[];
}

export interface WeeklyProgress {
  total_hours_planned: number;
  total_hours_completed: number;
  assignments_on_track: number;
  assignments_behind: number;
  completion_rate: number;
}

// Integration with existing task system
export interface AcademicTaskMetadata {
  assignment_id?: string;
  course_code?: string;
  session_type?: StudySessionType;
  word_count_target?: number;
  is_academic: true;
}

// Validation interfaces
export interface AcademicValidationError {
  field: string;
  message: string;
}

export interface AcademicValidationResult {
  isValid: boolean;
  errors: AcademicValidationError[];
}