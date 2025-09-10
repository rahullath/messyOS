/**
 * Task-Calendar Integration Service
 * Provides utilities for integrating task management with calendar functionality
 */

import { calendarService } from './calendar-service';
import { TaskService } from '../task-management/task-service';
import type { Task } from '../../types/task-management';
import type { CalendarEvent, ScheduledTask } from '../../types/calendar';

export class TaskCalendarIntegration {
  /**
   * Get all calendar events that represent scheduled tasks
   */
  static async getScheduledTaskEvents(userId: string): Promise<CalendarEvent[]> {
    const events = await calendarService.getCalendarEvents(userId, {
      eventTypes: ['task']
    });
    return events;
  }

  /**
   * Check if a specific task is scheduled
   */
  static async isTaskScheduled(userId: string, taskId: string): Promise<boolean> {
    const events = await calendarService.getCalendarEvents(userId, {
      eventTypes: ['task']
    });
    
    return events.some(event => event.external_id === taskId);
  }

  /**
   * Get the calendar event for a scheduled task
   */
  static async getTaskCalendarEvent(userId: string, taskId: string): Promise<CalendarEvent | null> {
    const events = await calendarService.getCalendarEvents(userId, {
      eventTypes: ['task']
    });
    
    return events.find(event => event.external_id === taskId) || null;
  }

  /**
   * Get tasks that are scheduled in the calendar
   */
  static async getScheduledTasks(userId: string): Promise<{ task: Task; event: CalendarEvent }[]> {
    const [tasks, taskEvents] = await Promise.all([
      TaskService.getTasks(userId, { status: 'in_progress' }),
      this.getScheduledTaskEvents(userId)
    ]);

    const scheduledTasks: { task: Task; event: CalendarEvent }[] = [];
    
    for (const task of tasks.tasks) {
      const event = taskEvents.find(e => e.external_id === task.id);
      if (event) {
        scheduledTasks.push({ task, event });
      }
    }

    return scheduledTasks;
  }

  /**
   * Get unscheduled tasks (pending tasks without calendar events)
   */
  static async getUnscheduledTasks(userId: string): Promise<Task[]> {
    const [allTasks, taskEvents] = await Promise.all([
      TaskService.getTasks(userId, { status: 'pending' }),
      this.getScheduledTaskEvents(userId)
    ]);

    const scheduledTaskIds = new Set(taskEvents.map(e => e.external_id));
    
    return allTasks.tasks.filter(task => !scheduledTaskIds.has(task.id));
  }

  /**
   * Get calendar statistics with task information
   */
  static async getCalendarStatsWithTasks(userId: string) {
    const [calendarStats, scheduledTasks, unscheduledTasks] = await Promise.all([
      calendarService.getCalendarStats(userId),
      this.getScheduledTasks(userId),
      this.getUnscheduledTasks(userId)
    ]);

    return {
      ...calendarStats,
      scheduled_tasks: scheduledTasks.length,
      unscheduled_tasks: unscheduledTasks.length,
      total_tasks: scheduledTasks.length + unscheduledTasks.length,
      task_completion_rate: scheduledTasks.length > 0 ? 
        (scheduledTasks.filter(st => st.task.status === 'completed').length / scheduledTasks.length) * 100 : 0
    };
  }

  /**
   * Suggest optimal times for unscheduled tasks
   */
  static async suggestTaskScheduling(userId: string, taskId: string): Promise<{
    availableSlots: any[];
    recommendations: string[];
  }> {
    const task = await TaskService.getTask(userId, taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Get next 7 days for scheduling suggestions
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const availableSlots = await calendarService.findAvailableSlots(userId, {
      start: now,
      end: nextWeek,
      duration: task.estimated_duration || 60,
      buffer: 15,
      preferences: {
        energyLevel: task.energy_required,
        taskType: 'task'
      }
    });

    const recommendations: string[] = [];
    
    if (availableSlots.length === 0) {
      recommendations.push('No available slots found in the next 7 days. Consider adjusting your schedule or reducing task duration.');
    } else if (availableSlots.length < 3) {
      recommendations.push('Limited availability found. Consider scheduling soon to secure a time slot.');
    } else {
      recommendations.push(`${availableSlots.length} available time slots found. Choose the one that works best for your energy and schedule.`);
    }

    if (task.deadline) {
      const deadline = new Date(task.deadline);
      const urgentSlots = availableSlots.filter(slot => slot.start < deadline);
      if (urgentSlots.length < availableSlots.length) {
        recommendations.push(`Task has deadline on ${deadline.toLocaleDateString()}. ${urgentSlots.length} slots available before deadline.`);
      }
    }

    return {
      availableSlots: availableSlots.slice(0, 10), // Limit to top 10 suggestions
      recommendations
    };
  }

  /**
   * Bulk schedule multiple tasks optimally
   */
  static async bulkScheduleTasks(userId: string, taskIds: string[]): Promise<{
    scheduled: ScheduledTask[];
    failed: { taskId: string; reason: string }[];
  }> {
    const scheduled: ScheduledTask[] = [];
    const failed: { taskId: string; reason: string }[] = [];

    for (const taskId of taskIds) {
      try {
        const task = await TaskService.getTask(userId, taskId);
        if (!task) {
          failed.push({ taskId, reason: 'Task not found' });
          continue;
        }

        const scheduledTask = await calendarService.scheduleTask({
          task_id: taskId,
          user_id: userId,
          title: task.title,
          description: `Work on: ${task.title}`,
          estimated_duration: task.estimated_duration || 60,
          deadline: task.deadline,
          energy_required: task.energy_required || 'medium',
          priority: task.priority || 'medium',
          flexibility: 'flexible',
          importance: 'medium'
        });

        scheduled.push(scheduledTask);
      } catch (error) {
        failed.push({ 
          taskId, 
          reason: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return { scheduled, failed };
  }
}

export const taskCalendarIntegration = new TaskCalendarIntegration();