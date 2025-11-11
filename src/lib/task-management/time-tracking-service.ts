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
   * Analyzes productivity patterns from time sessions.
   */
  static async analyzeProductivityPatterns(userId: string, dateRange?: { from: string; to: string }): Promise<any> {
    let query = supabase
      .from('time_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('completion_status', 'completed')
      .order('start_time', { ascending: false });

    if (dateRange) {
      query = query.gte('start_time', dateRange.from).lte('start_time', dateRange.to);
    }

    const { data: sessions, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch sessions for analysis: ${error.message}`);
    }

    if (!sessions || sessions.length === 0) {
      return {
        averageProductivity: 0,
        bestPerformanceTimes: [],
        commonDistractions: [],
        totalSessions: 0,
        totalTimeSpent: 0,
        focusPatterns: []
      };
    }

    // Calculate basic statistics
    const totalSessions = sessions.length;
    const totalTimeSpent = sessions.reduce((sum, s) => sum + (s.actual_duration || 0), 0);
    const averageProductivity = sessions.reduce((sum, s) => sum + (s.productivity_rating || 0), 0) / totalSessions;
    const averageDifficulty = sessions.reduce((sum, s) => sum + (s.difficulty_rating || 0), 0) / totalSessions;
    const averageEnergy = sessions.reduce((sum, s) => sum + (s.energy_level || 0), 0) / totalSessions;

    // Analyze time patterns
    const hourlyProductivity = new Map<number, { total: number; count: number; avgProductivity: number }>();
    const dailyProductivity = new Map<number, { total: number; count: number; avgProductivity: number }>();

    sessions.forEach(session => {
      const startTime = new Date(session.start_time);
      const hour = startTime.getHours();
      const dayOfWeek = startTime.getDay();
      const productivity = session.productivity_rating || 0;

      // Hourly patterns
      if (!hourlyProductivity.has(hour)) {
        hourlyProductivity.set(hour, { total: 0, count: 0, avgProductivity: 0 });
      }
      const hourData = hourlyProductivity.get(hour)!;
      hourData.total += productivity;
      hourData.count += 1;
      hourData.avgProductivity = hourData.total / hourData.count;

      // Daily patterns
      if (!dailyProductivity.has(dayOfWeek)) {
        dailyProductivity.set(dayOfWeek, { total: 0, count: 0, avgProductivity: 0 });
      }
      const dayData = dailyProductivity.get(dayOfWeek)!;
      dayData.total += productivity;
      dayData.count += 1;
      dayData.avgProductivity = dayData.total / dayData.count;
    });

    // Find best performance times
    const bestHours = Array.from(hourlyProductivity.entries())
      .filter(([_, data]) => data.count >= 3) // At least 3 sessions
      .sort(([_, a], [__, b]) => b.avgProductivity - a.avgProductivity)
      .slice(0, 3)
      .map(([hour, data]) => ({
        hour,
        avgProductivity: Math.round(data.avgProductivity * 10) / 10,
        sessionCount: data.count
      }));

    // Analyze common distractions
    const distractionMap = new Map<string, number>();
    sessions.forEach(session => {
      if (session.distractions && Array.isArray(session.distractions)) {
        session.distractions.forEach(distraction => {
          distractionMap.set(distraction, (distractionMap.get(distraction) || 0) + 1);
        });
      }
    });

    const commonDistractions = Array.from(distractionMap.entries())
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
      .map(([distraction, count]) => ({
        name: distraction,
        frequency: count,
        percentage: Math.round((count / totalSessions) * 100)
      }));

    // Focus patterns based on session duration vs productivity
    const focusPatterns = sessions.map(session => ({
      duration: session.actual_duration || 0,
      productivity: session.productivity_rating || 0,
      difficulty: session.difficulty_rating || 0,
      energy: session.energy_level || 0,
      distractionCount: (session.distractions && Array.isArray(session.distractions)) ? session.distractions.length : 0
    }));

    return {
      totalSessions,
      totalTimeSpent,
      averageProductivity: Math.round(averageProductivity * 10) / 10,
      averageDifficulty: Math.round(averageDifficulty * 10) / 10,
      averageEnergy: Math.round(averageEnergy * 10) / 10,
      bestPerformanceTimes: bestHours,
      commonDistractions,
      focusPatterns,
      hourlyProductivity: Array.from(hourlyProductivity.entries()).map(([hour, data]) => ({
        hour,
        avgProductivity: Math.round(data.avgProductivity * 10) / 10,
        sessionCount: data.count
      })),
      dailyProductivity: Array.from(dailyProductivity.entries()).map(([day, data]) => ({
        day,
        avgProductivity: Math.round(data.avgProductivity * 10) / 10,
        sessionCount: data.count
      }))
    };
  }

  /**
   * Generates time reports for different periods and types.
   */
  static async generateTimeReports(userId: string, reportType: 'daily' | 'weekly' | 'monthly' = 'weekly'): Promise<any> {
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    switch (reportType) {
      case 'daily':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const { data: sessions, error } = await supabase
      .from('time_sessions')
      .select(`
        *,
        tasks (
          title,
          category,
          priority,
          complexity
        )
      `)
      .eq('user_id', userId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: false });

    if (error) {
      throw new Error(`Failed to generate time report: ${error.message}`);
    }

    if (!sessions || sessions.length === 0) {
      return {
        reportType,
        period: { start: startDate, end: endDate },
        totalSessions: 0,
        totalTimeSpent: 0,
        completedSessions: 0,
        averageProductivity: 0,
        categoryBreakdown: {},
        dailyBreakdown: []
      };
    }

    const completedSessions = sessions.filter(s => s.completion_status === 'completed');
    const totalTimeSpent = sessions.reduce((sum, s) => sum + (s.actual_duration || 0), 0);
    const averageProductivity = completedSessions.length > 0 
      ? completedSessions.reduce((sum, s) => sum + (s.productivity_rating || 0), 0) / completedSessions.length
      : 0;

    // Category breakdown
    const categoryMap = new Map<string, { time: number; sessions: number; avgProductivity: number }>();
    sessions.forEach(session => {
      const category = (session as any).tasks?.category || 'Uncategorized';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { time: 0, sessions: 0, avgProductivity: 0 });
      }
      const catData = categoryMap.get(category)!;
      catData.time += session.actual_duration || 0;
      catData.sessions += 1;
      catData.avgProductivity = (catData.avgProductivity * (catData.sessions - 1) + (session.productivity_rating || 0)) / catData.sessions;
    });

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      timeSpent: data.time,
      sessionCount: data.sessions,
      averageProductivity: Math.round(data.avgProductivity * 10) / 10,
      percentage: Math.round((data.time / totalTimeSpent) * 100)
    }));

    // Daily breakdown
    const dailyMap = new Map<string, { time: number; sessions: number; productivity: number }>();
    sessions.forEach(session => {
      const date = new Date(session.start_time).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { time: 0, sessions: 0, productivity: 0 });
      }
      const dayData = dailyMap.get(date)!;
      dayData.time += session.actual_duration || 0;
      dayData.sessions += 1;
      dayData.productivity = (dayData.productivity * (dayData.sessions - 1) + (session.productivity_rating || 0)) / dayData.sessions;
    });

    const dailyBreakdown = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        timeSpent: data.time,
        sessionCount: data.sessions,
        averageProductivity: Math.round(data.productivity * 10) / 10
      }));

    return {
      reportType,
      period: { start: startDate, end: endDate },
      totalSessions: sessions.length,
      totalTimeSpent,
      completedSessions: completedSessions.length,
      averageProductivity: Math.round(averageProductivity * 10) / 10,
      categoryBreakdown,
      dailyBreakdown,
      sessions: sessions.map(s => ({
        id: s.id,
        taskTitle: (s as any).tasks?.title || 'Unknown Task',
        startTime: s.start_time,
        duration: s.actual_duration,
        productivity: s.productivity_rating,
        status: s.completion_status
      }))
    };
  }
}
