// Task Management Service Layer
// Provides business logic and data access for task operations

import { supabase } from '../supabase/client';
import type { 
  Task, 
  CreateTaskRequest, 
  UpdateTaskRequest,
  TaskQueryParams,
  TasksResponse,
  TimeSession,
  StartSessionRequest,
  EndSessionRequest,
  Goal,
  CreateGoalRequest,
  ValidationResult,
  ValidationError
} from '../../types/task-management';

export class TaskService {
  // Task CRUD operations
  static async createTask(userId: string, taskData: CreateTaskRequest): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...taskData,
        user_id: userId
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`);
    }

    return data;
  }

  static async getTask(userId: string, taskId: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Task not found
      }
      throw new Error(`Failed to fetch task: ${error.message}`);
    }

    return data;
  }

  static async getTasks(userId: string, params: TaskQueryParams = {}): Promise<TasksResponse> {
    let query = supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Apply filters
    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.priority) {
      query = query.eq('priority', params.priority);
    }

    if (params.category) {
      query = query.eq('category', params.category);
    }

    if (params.deadline_before) {
      query = query.lt('deadline', params.deadline_before);
    }

    if (params.deadline_after) {
      query = query.gt('deadline', params.deadline_after);
    }

    if (params.parent_task_id) {
      query = query.eq('parent_task_id', params.parent_task_id);
    }

    // Apply sorting
    const sortBy = params.sort_by || 'created_at';
    const sortOrder = params.sort_order || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch tasks: ${error.message}`);
    }

    return {
      tasks: data || [],
      total: count || 0,
      page,
      limit
    };
  }

  static async updateTask(userId: string, taskId: string, updates: UpdateTaskRequest): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update task: ${error.message}`);
    }

    return data;
  }

  static async deleteTask(userId: string, taskId: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete task: ${error.message}`);
    }
  }

  // Task completion and status management
  static async completeTask(userId: string, taskId: string): Promise<Task> {
    return this.updateTask(userId, taskId, { 
      status: 'completed',
    });
  }

  static async getTasksByStatus(userId: string, status: string): Promise<Task[]> {
    const response = await this.getTasks(userId, { status: status as any });
    return response.tasks;
  }

  static async getOverdueTasks(userId: string): Promise<Task[]> {
    const now = new Date().toISOString();
    const response = await this.getTasks(userId, { 
      deadline_before: now,
      status: 'pending'
    });
    return response.tasks;
  }

  // Subtask management
  static async getSubtasks(userId: string, parentTaskId: string): Promise<Task[]> {
    const response = await this.getTasks(userId, { parent_task_id: parentTaskId });
    return response.tasks;
  }

  static async createSubtask(userId: string, parentTaskId: string, taskData: Omit<CreateTaskRequest, 'parent_task_id'>): Promise<Task> {
    return this.createTask(userId, {
      ...taskData,
      parent_task_id: parentTaskId
    });
  }
}

export class TimeTrackingService {
  static async startSession(userId: string, sessionData: StartSessionRequest): Promise<TimeSession> {
    // Check if there's already an active session
    const { data: activeSessions, error: activeError } = await supabase
      .from('time_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('completion_status', 'active');

    if (activeError) {
      throw new Error(`Failed to check active sessions: ${activeError.message}`);
    }

    if (activeSessions && activeSessions.length > 0) {
      throw new Error('You already have an active time tracking session');
    }

    // Verify the task exists and belongs to the user
    const task = await TaskService.getTask(userId, sessionData.task_id);
    if (!task) {
      throw new Error('Task not found');
    }

    const { data, error } = await supabase
      .from('time_sessions')
      .insert({
        user_id: userId,
        task_id: sessionData.task_id,
        start_time: new Date().toISOString(),
        estimated_duration: sessionData.estimated_duration || null,
        completion_status: 'active'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to start session: ${error.message}`);
    }

    return data;
  }

  static async endSession(userId: string, sessionId: string, endData: EndSessionRequest): Promise<TimeSession> {
    // Check if session exists and is active
    const { data: existingSession, error: fetchError } = await supabase
      .from('time_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new Error('Time session not found');
      }
      throw new Error(`Failed to fetch session: ${fetchError.message}`);
    }

    if (existingSession.completion_status !== 'active') {
      throw new Error('Session is not active and cannot be ended');
    }

    const updateData = {
      end_time: new Date().toISOString(),
      completion_status: endData.completion_status,
      productivity_rating: endData.productivity_rating || null,
      difficulty_rating: endData.difficulty_rating || null,
      energy_level: endData.energy_level || null,
      distractions: endData.distractions || null,
      notes: endData.notes || null
    };

    const { data, error } = await supabase
      .from('time_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to end session: ${error.message}`);
    }

    // If session was completed, update the task
    if (endData.completion_status === 'completed' && data.actual_duration) {
      await TaskService.updateTask(userId, data.task_id, {
        actual_duration: data.actual_duration,
        status: 'completed'
      });
    }

    return data;
  }

  static async getActiveSessions(userId: string): Promise<TimeSession[]> {
    const { data, error } = await supabase
      .from('time_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('completion_status', 'active')
      .order('start_time', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch active sessions: ${error.message}`);
    }

    return data || [];
  }

  static async getSessionsForTask(userId: string, taskId: string): Promise<TimeSession[]> {
    const { data, error } = await supabase
      .from('time_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('task_id', taskId)
      .order('start_time', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch sessions for task: ${error.message}`);
    }

    return data || [];
  }
}

export class GoalService {
  static async createGoal(userId: string, goalData: CreateGoalRequest): Promise<Goal> {
    const { data, error } = await supabase
      .from('goals')
      .insert({
        ...goalData,
        user_id: userId
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create goal: ${error.message}`);
    }

    return data;
  }

  static async getGoals(userId: string, status?: string, category?: string): Promise<Goal[]> {
    let query = supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId);

    if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('category', category);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch goals: ${error.message}`);
    }

    return data || [];
  }

  static async updateGoalStatus(userId: string, goalId: string, status: string): Promise<Goal> {
    const updateData: any = { status };
    
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('goals')
      .update(updateData)
      .eq('id', goalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update goal status: ${error.message}`);
    }

    return data;
  }
}

// Validation utilities
export class TaskValidation {
  static validateCreateTask(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title is required and must be a non-empty string' });
    }

    if (data.title && data.title.length > 255) {
      errors.push({ field: 'title', message: 'Title must be 255 characters or less' });
    }

    if (!data.category || typeof data.category !== 'string' || data.category.trim().length === 0) {
      errors.push({ field: 'category', message: 'Category is required and must be a non-empty string' });
    }

    if (data.priority && !['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
      errors.push({ field: 'priority', message: 'Priority must be one of: low, medium, high, urgent' });
    }

    if (data.complexity && !['simple', 'moderate', 'complex'].includes(data.complexity)) {
      errors.push({ field: 'complexity', message: 'Complexity must be one of: simple, moderate, complex' });
    }

    if (data.energy_required && !['low', 'medium', 'high'].includes(data.energy_required)) {
      errors.push({ field: 'energy_required', message: 'Energy required must be one of: low, medium, high' });
    }

    if (data.estimated_duration !== undefined && (typeof data.estimated_duration !== 'number' || data.estimated_duration <= 0)) {
      errors.push({ field: 'estimated_duration', message: 'Estimated duration must be a positive number' });
    }

    if (data.deadline && isNaN(Date.parse(data.deadline))) {
      errors.push({ field: 'deadline', message: 'Deadline must be a valid ISO date string' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateUpdateTask(data: any): ValidationResult {
    const errors: ValidationError[] = [];

    if (data.title !== undefined) {
      if (typeof data.title !== 'string' || data.title.trim().length === 0) {
        errors.push({ field: 'title', message: 'Title must be a non-empty string' });
      } else if (data.title.length > 255) {
        errors.push({ field: 'title', message: 'Title must be 255 characters or less' });
      }
    }

    if (data.category !== undefined) {
      if (typeof data.category !== 'string' || data.category.trim().length === 0) {
        errors.push({ field: 'category', message: 'Category must be a non-empty string' });
      }
    }

    if (data.priority !== undefined && !['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
      errors.push({ field: 'priority', message: 'Priority must be one of: low, medium, high, urgent' });
    }

    if (data.status !== undefined && !['pending', 'in_progress', 'completed', 'cancelled', 'deferred'].includes(data.status)) {
      errors.push({ field: 'status', message: 'Status must be one of: pending, in_progress, completed, cancelled, deferred' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}