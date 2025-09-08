import { supabase } from '../supabase/client';
import type {
  TimeSession,
  StartSessionRequest,
  EndSessionRequest,
  Task,
  UpdateTaskRequest, // Import UpdateTaskRequest
} from '../../types/task-management';
import { TaskService } from './task-service';
import type { TablesInsert, TablesUpdate } from '../../types/supabase'; // Import Supabase types

export class TimeTrackingService {
  /**
   * Starts a new time tracking session for a given task.
   * Ensures only one active session per user at a time.
   */
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

    const insertPayload: TablesInsert<'time_sessions'> = {
      user_id: userId,
      task_id: sessionData.task_id,
      start_time: new Date().toISOString(),
      estimated_duration: sessionData.estimated_duration || null,
      completion_status: 'active',
    };

    const { data, error } = await supabase
      .from('time_sessions')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to start session: ${error.message}`);
    }

    return data;
  }

  /**
   * Ends an active time tracking session.
   * Calculates actual duration and updates task status if completed.
   */
  static async endSession(userId: string, sessionId: string, endData: EndSessionRequest): Promise<TimeSession> {
    // Check if session exists and is active
    const { data: existingSessionData, error: fetchError } = await supabase
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

    const existingSession: TimeSession = existingSessionData as TimeSession;

    if (existingSession.completion_status !== 'active') {
      throw new Error('Session is not active and cannot be ended');
    }

    const endTime = new Date();
    const startTime = new Date(existingSession.start_time);
    const actualDuration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes

    const updateData: TablesUpdate<'time_sessions'> = {
      end_time: endTime.toISOString(),
      actual_duration: actualDuration,
      completion_status: endData.completion_status,
      productivity_rating: endData.productivity_rating || null,
      difficulty_rating: endData.difficulty_rating || null,
      energy_level: endData.energy_level || null,
      distractions: endData.distractions || null,
      notes: endData.notes || null,
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
    // If session was completed, update the task
    if (endData.completion_status === 'completed' && data.task_id) {
      const task = await TaskService.getTask(userId, data.task_id);
      if (task) {
        const taskUpdate: UpdateTaskRequest = {
          actual_duration: (task.actual_duration || 0) + actualDuration, // Aggregate duration
          status: 'completed'
        };
        await TaskService.updateTask(userId, data.task_id, taskUpdate);
      }
    }

    return data;
  }

  /**
   * Retrieves all active time tracking sessions for a user.
   */
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

  /**
   * Retrieves all time tracking sessions for a specific task.
   */
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

  /**
   * Analyzes productivity patterns (placeholder for future AI integration).
   */
  static async analyzeProductivityPatterns(userId: string): Promise<any> {
    console.log(`Analyzing productivity patterns for user ${userId}`);
    // This will involve more complex logic, potentially using AI to detect focus patterns, common distractions, etc.
    return { message: 'Productivity analysis logic to be implemented.' };
  }

  /**
   * Generates time reports (placeholder for future implementation).
   */
  static async generateTimeReports(userId: string, reportType: string): Promise<any> {
    console.log(`Generating ${reportType} time report for user ${userId}`);
    // This will involve querying time sessions and aggregating data for various reports.
    return { message: 'Time report generation logic to be implemented.' };
  }
}
