// TypeScript interfaces and types for Intelligent Task Management

// Enum types matching database enums
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deferred';
export type TaskComplexity = 'simple' | 'moderate' | 'complex';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type CalendarSourceType = 'google' | 'ical' | 'outlook' | 'manual';
export type EventType = 'class' | 'meeting' | 'personal' | 'workout' | 'task' | 'break' | 'meal';
export type FlexibilityType = 'fixed' | 'moveable' | 'flexible';
export type ImportanceLevel = 'low' | 'medium' | 'high' | 'critical';
export type SessionStatus = 'active' | 'completed' | 'partial' | 'abandoned';
export type GoalCategory = 'career' | 'health' | 'creative' | 'financial' | 'social' | 'personal';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';

// Core Task interface
export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: string;
  priority: TaskPriority;
  status: TaskStatus;
  complexity: TaskComplexity;
  energy_required: EnergyLevel;
  estimated_duration?: number; // minutes
  actual_duration?: number; // minutes
  deadline?: string; // ISO timestamp
  created_from: string;
  parent_task_id?: string;
  position: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

// Task creation/update interfaces
export interface CreateTaskRequest {
  title: string;
  description?: string;
  category: string;
  priority?: TaskPriority;
  complexity?: TaskComplexity;
  energy_required?: EnergyLevel;
  estimated_duration?: number;
  deadline?: string;
  parent_task_id?: string;
  created_from?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  category?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  complexity?: TaskComplexity;
  energy_required?: EnergyLevel;
  estimated_duration?: number;
  deadline?: string;
  position?: number;
  actual_duration?: number; // Add actual_duration to UpdateTaskRequest
}

// Calendar interfaces
export interface CalendarSource {
  id: string;
  user_id: string;
  name: string;
  type: CalendarSourceType;
  url?: string;
  credentials?: Record<string, any>;
  sync_frequency: number;
  color: string;
  priority: number;
  is_active: boolean;
  last_sync?: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  source_id: string;
  external_id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  event_type: EventType;
  flexibility: FlexibilityType;
  importance: ImportanceLevel;
  created_at: string;
  updated_at: string;
}

// Time tracking interfaces
export interface TimeSession {
  id: string;
  user_id: string;
  task_id: string;
  start_time: string;
  end_time?: string;
  estimated_duration?: number;
  actual_duration?: number;
  productivity_rating?: number; // 1-10
  difficulty_rating?: number; // 1-10
  energy_level?: number; // 1-10
  distractions?: string[];
  notes?: string;
  completion_status: SessionStatus;
  created_at: string;
}

export interface StartSessionRequest {
  task_id: string;
  estimated_duration?: number;
}

export interface EndSessionRequest {
  productivity_rating?: number;
  difficulty_rating?: number;
  energy_level?: number;
  distractions?: string[];
  notes?: string;
  completion_status: SessionStatus;
}

// Goal and milestone interfaces
export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: GoalCategory;
  timeframe?: string;
  measurable_outcomes?: string[];
  success_metrics?: Record<string, any>;
  status: GoalStatus;
  created_from: string;
  target_date?: string;
  created_at: string;
  completed_at?: string;
}

export interface Milestone {
  id: string;
  goal_id: string;
  title: string;
  description?: string;
  target_date?: string;
  completion_criteria?: string;
  is_achieved: boolean;
  achieved_at?: string;
  created_at: string;
}

export interface CreateGoalRequest {
  title: string;
  description?: string;
  category: GoalCategory;
  timeframe?: string;
  measurable_outcomes?: string[];
  success_metrics?: Record<string, any>;
  target_date?: string;
  created_from?: string;
}

// AI-generated plans and insights
export interface DailyPlan {
  id: string;
  user_id: string;
  plan_date: string; // Date string
  energy_forecast?: Record<string, any>;
  scheduled_blocks?: Record<string, any>;
  prioritized_tasks?: Record<string, any>;
  personal_development?: Record<string, any>;
  balance_score?: number;
  recommendations?: string[];
  ai_confidence?: number;
  tokens_used: number;
  created_at: string;
}

export interface LifeOptimization {
  id: string;
  user_id: string;
  optimization_type: string;
  title: string;
  description?: string;
  impact_area?: string[];
  confidence?: number;
  implementation_difficulty?: string;
  expected_benefit?: string;
  is_implemented: boolean;
  created_at: string;
}

// Energy pattern interfaces
export interface EnergyPattern {
  id: string;
  user_id: string;
  time_of_day: string; // Time string
  day_of_week?: number; // 0-6
  average_energy?: number;
  confidence?: number;
  sample_size?: number;
  last_updated: string;
}

// API response interfaces
export interface TasksResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
}

export interface TaskResponse {
  task: Task;
}

export interface SessionsResponse {
  sessions: TimeSession[];
  total: number;
}

export interface GoalsResponse {
  goals: Goal[];
  total: number;
}

// Query parameters for filtering and pagination
export interface TaskQueryParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  deadline_before?: string;
  deadline_after?: string;
  parent_task_id?: string;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'deadline' | 'priority' | 'title';
  sort_order?: 'asc' | 'desc';
}

export interface SessionQueryParams {
  task_id?: string;
  status?: SessionStatus;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

// Validation interfaces
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// AI-related interfaces for future use
export interface AILifeCoach {
  generateDailyPlan(userId: string, date: Date): Promise<DailyPlan>;
  processGoalConversation(userId: string, conversation: string): Promise<GoalActionPlan>;
  analyzeLifeBalance(userId: string): Promise<LifeBalanceAnalysis>;
  suggestLifeOptimizations(userId: string): Promise<LifeOptimization[]>;
  handleContextualQuery(userId: string, query: string, context: LifeContext): Promise<AIResponse>;
}

export interface LifeContext {
  currentSchedule: CalendarEvent[];
  habitPatterns: any[]; // Will be defined when habits integration is implemented
  healthMetrics: any;
  energyLevels: EnergyPattern[];
  financialStatus: any;
  sleepData: any[];
  personalGoals: Goal[];
  recentAchievements: any[];
}

export interface GoalActionPlan {
  goal: string;
  timeframe: string;
  milestones: Milestone[];
  tasks: Task[];
  schedulingPlan: any;
}

export interface LifeBalanceAnalysis {
  overallScore: number;
  areas: {
    work: number;
    health: number;
    social: number;
    personal: number;
    financial: number;
  };
  recommendations: string[];
}

export interface AIResponse {
  message: string;
  actions?: any[];
  confidence: number;
}

// Import TimeSlot from calendar.ts for consistency
import type { TimeSlot } from './calendar';

export interface SchedulingConstraints {
  preferred_times?: TimeSlot[];
  energy_level?: EnergyLevel;
  max_duration?: number;
  buffer_time?: number;
}

import type { ScheduledTask as CalendarScheduledTask } from './calendar';

export interface OptimalSchedule {
  scheduledTasks: CalendarScheduledTask[];
  energyUtilization: number;
  balanceScore: number;
  alternativeOptions: ScheduleOption[];
}

// Using the ScheduledTask from calendar.ts for consistency in scheduling
export type ScheduledTask = CalendarScheduledTask;

export interface ScheduleOption {
  tasks: ScheduledTask[];
  score: number;
  description: string;
}

// Database utility types
export type DatabaseTask = Omit<Task, 'id' | 'created_at' | 'updated_at'>;
export type DatabaseTimeSession = Omit<TimeSession, 'id' | 'created_at'>;
export type DatabaseGoal = Omit<Goal, 'id' | 'created_at'>;
