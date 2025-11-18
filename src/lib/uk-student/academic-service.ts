// UK Student Academic Service
// Integrates with existing task management system for assignment breakdown and study session optimization

import { supabase as defaultSupabase } from '../supabase/client';
import { TaskService } from '../task-management/task-service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Task, CreateTaskRequest } from '../../types/task-management';
import type {
  Assignment,
  StudySession,
  AssignmentBreakdown,
  AssignmentTask,
  StudyBlock,
  AcademicDeadline,
  StudySessionRecommendation,
  CreateAssignmentRequest,
  UpdateAssignmentRequest,
  CreateStudySessionRequest,
  AssignmentBreakdownRequest,
  AcademicDashboardData
} from '../../types/uk-student-academic';

export class AcademicService {
  // Assignment management
  static async createAssignment(
    userId: string, 
    assignmentData: CreateAssignmentRequest,
    supabaseClient?: SupabaseClient
  ): Promise<Assignment> {
    const client = supabaseClient || defaultSupabase;
    
    const { data, error } = await client
      .from('assignments')
      .insert({
        ...assignmentData,
        user_id: userId,
        estimated_hours: assignmentData.estimated_hours || this.estimateAssignmentHours(assignmentData)
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create assignment: ${error.message}`);
    }

    return data as Assignment;
  }

  static async getAssignment(
    userId: string, 
    assignmentId: string,
    supabaseClient?: SupabaseClient
  ): Promise<Assignment | null> {
    const client = supabaseClient || defaultSupabase;
    
    const { data, error } = await client
      .from('assignments')
      .select('*')
      .eq('id', assignmentId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch assignment: ${error.message}`);
    }

    return data as Assignment;
  }

  static async getAssignments(
    userId: string,
    filters?: {
      status?: string;
      course_code?: string;
      deadline_before?: string;
      deadline_after?: string;
    },
    supabaseClient?: SupabaseClient
  ): Promise<Assignment[]> {
    const client = supabaseClient || defaultSupabase;
    
    let query = client
      .from('assignments')
      .select('*')
      .eq('user_id', userId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.course_code) {
      query = query.eq('course_code', filters.course_code);
    }
    if (filters?.deadline_before) {
      query = query.lt('deadline', filters.deadline_before);
    }
    if (filters?.deadline_after) {
      query = query.gt('deadline', filters.deadline_after);
    }

    query = query.order('deadline', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch assignments: ${error.message}`);
    }

    return (data || []) as Assignment[];
  }

  static async updateAssignment(
    userId: string,
    assignmentId: string,
    updates: UpdateAssignmentRequest,
    supabaseClient?: SupabaseClient
  ): Promise<Assignment> {
    const client = supabaseClient || defaultSupabase;
    
    const { data, error } = await client
      .from('assignments')
      .update(updates)
      .eq('id', assignmentId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update assignment: ${error.message}`);
    }

    return data as Assignment;
  }

  // Assignment breakdown into tasks
  static async breakdownAssignment(
    userId: string,
    request: AssignmentBreakdownRequest,
    supabaseClient?: SupabaseClient
  ): Promise<AssignmentBreakdown> {
    const assignment = await this.getAssignment(userId, request.assignment_id, supabaseClient);
    if (!assignment) {
      throw new Error('Assignment not found');
    }

    const tasks = this.generateAssignmentTasks(assignment);
    const schedule = await this.generateStudySchedule(assignment, tasks, request.preferences);

    // Create tasks in the main task system
    const createdTasks: Task[] = [];
    for (const taskData of tasks) {
      const createTaskRequest: CreateTaskRequest = {
        title: `${assignment.title}: ${taskData.title}`,
        description: taskData.description,
        category: 'academic',
        priority: taskData.priority,
        complexity: taskData.complexity,
        energy_required: taskData.energy_required,
        estimated_duration: taskData.estimated_duration,
        deadline: this.calculateTaskDeadline(assignment.deadline, taskData.deadline_offset_days),
        created_from: 'academic_breakdown'
      };

      const task = await TaskService.createTask(userId, createTaskRequest, supabaseClient);
      createdTasks.push(task);

      // Link task to assignment
      await this.linkTaskToAssignment(request.assignment_id, task.id, supabaseClient);
    }

    return {
      assignment_id: request.assignment_id,
      tasks,
      total_estimated_hours: tasks.reduce((sum, task) => sum + (task.estimated_duration / 60), 0),
      suggested_schedule: schedule
    };
  }

  // Study session management
  static async createStudySession(
    userId: string,
    sessionData: CreateStudySessionRequest,
    supabaseClient?: SupabaseClient
  ): Promise<StudySession> {
    const client = supabaseClient || defaultSupabase;
    
    const { data, error } = await client
      .from('study_sessions')
      .insert({
        ...sessionData,
        user_id: userId
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create study session: ${error.message}`);
    }

    return data as StudySession;
  }

  static async getStudySessions(
    userId: string,
    filters?: {
      assignment_id?: string;
      course_code?: string;
      date_from?: string;
      date_to?: string;
    },
    supabaseClient?: SupabaseClient
  ): Promise<StudySession[]> {
    const client = supabaseClient || defaultSupabase;
    
    let query = client
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId);

    if (filters?.assignment_id) {
      query = query.eq('assignment_id', filters.assignment_id);
    }
    if (filters?.course_code) {
      query = query.eq('course_code', filters.course_code);
    }
    if (filters?.date_from) {
      query = query.gte('start_time', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('start_time', filters.date_to);
    }

    query = query.order('start_time', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch study sessions: ${error.message}`);
    }

    return (data || []) as StudySession[];
  }

  // Academic dashboard data
  static async getAcademicDashboard(
    userId: string,
    supabaseClient?: SupabaseClient
  ): Promise<AcademicDashboardData> {
    const [assignments, todaySessions, upcomingDeadlines] = await Promise.all([
      this.getAssignments(userId, { status: 'in_progress' }, supabaseClient),
      this.getTodayStudySessions(userId, supabaseClient),
      this.getUpcomingDeadlines(userId, supabaseClient)
    ]);

    const weeklyProgress = await this.calculateWeeklyProgress(userId, supabaseClient);
    const urgentTasks = await this.getUrgentTasks(userId, supabaseClient);
    const recommendations = await this.getStudyRecommendations(userId, supabaseClient);

    return {
      upcoming_deadlines: upcomingDeadlines,
      current_assignments: assignments,
      today_study_sessions: todaySessions,
      weekly_progress: weeklyProgress,
      urgent_tasks: urgentTasks,
      study_recommendations: recommendations
    };
  }

  // Progress tracking
  static async updateAssignmentProgress(
    userId: string,
    assignmentId: string,
    progress: {
      completion_percentage?: number;
      hours_spent?: number;
      word_count_progress?: number;
      notes?: string;
    },
    supabaseClient?: SupabaseClient
  ): Promise<void> {
    const client = supabaseClient || defaultSupabase;
    
    const { error } = await client
      .from('assignment_progress')
      .upsert({
        assignment_id: assignmentId,
        date: new Date().toISOString().split('T')[0],
        ...progress
      });

    if (error) {
      throw new Error(`Failed to update assignment progress: ${error.message}`);
    }

    // Update assignment status based on progress
    if (progress.completion_percentage !== undefined) {
      let status = 'in_progress';
      if (progress.completion_percentage === 0) {
        status = 'not_started';
      } else if (progress.completion_percentage >= 100) {
        status = 'draft_complete';
      }

      await this.updateAssignment(userId, assignmentId, { status: status as any }, supabaseClient);
    }
  }

  // Private helper methods
  private static estimateAssignmentHours(assignment: CreateAssignmentRequest): number {
    const baseHours = {
      'essay': 15,
      'report': 20,
      'presentation': 8,
      'exam': 10,
      'coursework': 25,
      'project': 40
    };

    let hours = baseHours[assignment.assignment_type] || 15;

    // Adjust based on word count
    if (assignment.word_count) {
      const wordsPerHour = 200; // Conservative estimate including research
      hours = Math.max(hours, assignment.word_count / wordsPerHour);
    }

    return Math.round(hours);
  }

  private static generateAssignmentTasks(assignment: Assignment): AssignmentTask[] {
    const tasks: AssignmentTask[] = [];

    if (assignment.assignment_type === 'essay') {
      tasks.push(
        {
          title: 'Research and Reading',
          description: 'Gather sources, read relevant materials, and take notes',
          estimated_duration: Math.round((assignment.estimated_hours * 0.3) * 60),
          priority: 'high',
          complexity: 'moderate',
          energy_required: 'medium',
          deadline_offset_days: Math.floor((new Date(assignment.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24) * 0.7)
        },
        {
          title: 'Create Outline',
          description: 'Structure arguments and create detailed essay outline',
          estimated_duration: 90,
          priority: 'high',
          complexity: 'moderate',
          energy_required: 'high',
          dependencies: ['Research and Reading'],
          deadline_offset_days: Math.floor((new Date(assignment.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24) * 0.6)
        },
        {
          title: 'Write First Draft',
          description: 'Write complete first draft following outline',
          estimated_duration: Math.round((assignment.estimated_hours * 0.4) * 60),
          priority: 'urgent',
          complexity: 'complex',
          energy_required: 'high',
          dependencies: ['Create Outline'],
          deadline_offset_days: Math.floor((new Date(assignment.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24) * 0.3)
        },
        {
          title: 'Review and Edit',
          description: 'Review content, check arguments, and improve clarity',
          estimated_duration: Math.round((assignment.estimated_hours * 0.2) * 60),
          priority: 'high',
          complexity: 'moderate',
          energy_required: 'medium',
          dependencies: ['Write First Draft'],
          deadline_offset_days: Math.floor((new Date(assignment.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24) * 0.1)
        },
        {
          title: 'Final Proofreading',
          description: 'Check grammar, spelling, formatting, and references',
          estimated_duration: 60,
          priority: 'medium',
          complexity: 'simple',
          energy_required: 'low',
          dependencies: ['Review and Edit'],
          deadline_offset_days: 1
        }
      );
    }

    // Add similar breakdowns for other assignment types
    return tasks;
  }

  private static async generateStudySchedule(
    assignment: Assignment,
    tasks: AssignmentTask[],
    preferences?: any
  ): Promise<StudyBlock[]> {
    const schedule: StudyBlock[] = [];
    const dailyHours = preferences?.daily_study_hours || 3;
    const sessionDuration = preferences?.preferred_session_duration || 90;

    // Simple scheduling algorithm - can be enhanced with calendar integration
    let currentDate = new Date();
    const deadline = new Date(assignment.deadline);

    for (const task of tasks) {
      const sessionsNeeded = Math.ceil(task.estimated_duration / sessionDuration);
      
      for (let i = 0; i < sessionsNeeded; i++) {
        const sessionStart = new Date(currentDate);
        sessionStart.setHours(preferences?.morning_person ? 9 : 14, 0, 0, 0);
        
        const sessionEnd = new Date(sessionStart);
        sessionEnd.setMinutes(sessionEnd.getMinutes() + Math.min(sessionDuration, task.estimated_duration - (i * sessionDuration)));

        schedule.push({
          date: sessionStart.toISOString().split('T')[0],
          start_time: sessionStart.toTimeString().slice(0, 5),
          end_time: sessionEnd.toTimeString().slice(0, 5),
          task_title: task.title,
          session_type: this.getSessionTypeForTask(task.title),
          energy_level: task.energy_required
        });

        currentDate.setDate(currentDate.getDate() + 1);
        if (currentDate >= deadline) {
          break;
        }
      }
    }

    return schedule;
  }

  private static getSessionTypeForTask(taskTitle: string): 'reading' | 'writing' | 'research' | 'revision' | 'practice' | 'group_study' {
    if (taskTitle.toLowerCase().includes('research') || taskTitle.toLowerCase().includes('reading')) {
      return 'research';
    }
    if (taskTitle.toLowerCase().includes('write') || taskTitle.toLowerCase().includes('draft')) {
      return 'writing';
    }
    if (taskTitle.toLowerCase().includes('review') || taskTitle.toLowerCase().includes('edit')) {
      return 'revision';
    }
    return 'reading';
  }

  private static calculateTaskDeadline(assignmentDeadline: string, offsetDays: number): string {
    const deadline = new Date(assignmentDeadline);
    deadline.setDate(deadline.getDate() - offsetDays);
    return deadline.toISOString();
  }

  private static async linkTaskToAssignment(
    assignmentId: string,
    taskId: string,
    supabaseClient?: SupabaseClient
  ): Promise<void> {
    const client = supabaseClient || defaultSupabase;
    
    const { error } = await client
      .from('assignment_tasks')
      .insert({
        assignment_id: assignmentId,
        task_id: taskId
      });

    if (error) {
      throw new Error(`Failed to link task to assignment: ${error.message}`);
    }
  }

  private static async getTodayStudySessions(
    userId: string,
    supabaseClient?: SupabaseClient
  ): Promise<StudySession[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.getStudySessions(userId, {
      date_from: `${today}T00:00:00Z`,
      date_to: `${today}T23:59:59Z`
    }, supabaseClient);
  }

  private static async getUpcomingDeadlines(
    userId: string,
    supabaseClient?: SupabaseClient
  ): Promise<AcademicDeadline[]> {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 14);

    const assignments = await this.getAssignments(userId, {
      deadline_before: nextWeek.toISOString(),
      status: 'in_progress'
    }, supabaseClient);

    return assignments.map(assignment => ({
      assignment_id: assignment.id,
      title: assignment.title,
      course_name: assignment.course_name,
      deadline: assignment.deadline,
      days_remaining: Math.ceil((new Date(assignment.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      urgency_level: assignment.priority,
      completion_percentage: assignment.current_word_count && assignment.word_count 
        ? (assignment.current_word_count / assignment.word_count) * 100 
        : 0,
      estimated_hours_remaining: Math.max(0, assignment.estimated_hours - (assignment.actual_hours || 0))
    }));
  }

  private static async calculateWeeklyProgress(userId: string, supabaseClient?: SupabaseClient) {
    // Implementation for weekly progress calculation
    return {
      total_hours_planned: 20,
      total_hours_completed: 15,
      assignments_on_track: 2,
      assignments_behind: 1,
      completion_rate: 0.75
    };
  }

  private static async getUrgentTasks(userId: string, supabaseClient?: SupabaseClient): Promise<AssignmentTask[]> {
    // Implementation for getting urgent tasks
    return [];
  }

  private static async getStudyRecommendations(userId: string, supabaseClient?: SupabaseClient): Promise<StudySessionRecommendation[]> {
    // Implementation for study recommendations
    return [];
  }
}