// Task Management Service Layer
// Provides business logic and data access for task operations

import { supabase as defaultSupabase } from '../supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';
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
  static async createTask(userId: string, taskData: CreateTaskRequest, supabaseClient?: SupabaseClient<Database>): Promise<Task> {
    const client = supabaseClient || defaultSupabase;
    
    // Debug: Check auth state
    const { data: { user } } = await client.auth.getUser();
    console.log(`🔍 TaskService.createTask - userId: ${userId}, auth.user.id: ${user?.id}, match: ${userId === user?.id}`);
    
    const { data, error } = await client
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

  static async getTask(userId: string, taskId: string, supabaseClient?: SupabaseClient<Database>): Promise<Task | null> {
    const client = supabaseClient || defaultSupabase;
    
    const { data, error } = await client
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

  static async getTasks(userId: string, params: TaskQueryParams = {}, supabaseClient?: SupabaseClient<Database>): Promise<TasksResponse> {
    const client = supabaseClient || defaultSupabase;
    
    let query = client
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

  static async updateTask(userId: string, taskId: string, updates: UpdateTaskRequest, supabaseClient?: SupabaseClient<Database>): Promise<Task> {
    const client = supabaseClient || defaultSupabase;
    
    const { data, error } = await client
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

  static async deleteTask(userId: string, taskId: string, supabaseClient?: SupabaseClient<Database>): Promise<void> {
    const client = supabaseClient || defaultSupabase;
    
    const { error } = await client
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

export class GoalService {
  static async createGoal(userId: string, goalData: CreateGoalRequest, supabaseClient?: SupabaseClient<Database>): Promise<Goal> {
    const client = supabaseClient || defaultSupabase;
    
    const { data, error } = await client
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

  static async getGoals(userId: string, status?: string, category?: string, supabaseClient?: SupabaseClient<Database>): Promise<Goal[]> {
    const client = supabaseClient || defaultSupabase;
    
    let query = client
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

  static async updateGoalStatus(userId: string, goalId: string, status: string, supabaseClient?: SupabaseClient<Database>): Promise<Goal> {
    const client = supabaseClient || defaultSupabase;
    const updateData: any = { status };
    
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { data, error } = await client
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
