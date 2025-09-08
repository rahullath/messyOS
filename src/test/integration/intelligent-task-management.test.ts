import { describe, it, expect, beforeAll } from 'vitest';
import { TaskService } from '../../lib/task-management/task-service';
import { TimeTrackingService } from '../../lib/task-management/time-tracking-service';
import { NaturalLanguageParser } from '../../lib/intelligence/natural-language-parser';
import { calendarService } from '../../lib/calendar/calendar-service';
import { energyAwareScheduler } from '../../lib/intelligence/energy-aware-scheduler';
import { aiLifeCoach } from '../../lib/intelligence/ai-life-coach';
import { supabase } from '../../lib/supabase/client';

// Mock user for testing
const mockUserId = 'test-user-id';

describe('Intelligent Task Management Module Integration', () => {
  beforeAll(async () => {
    // Clean up any existing test data
    await supabase.from('tasks').delete().eq('user_id', mockUserId);
    await supabase.from('time_sessions').delete().eq('user_id', mockUserId);
    await supabase.from('daily_plans').delete().eq('user_id', mockUserId);
  });

  it('should create a task from natural language, schedule it, and track its completion', async () => {
    // 1. Create a task from natural language
    const taskString = 'Work on my assignment due next Friday';
    const task = await NaturalLanguageParser.createTaskFromNaturalLanguage(mockUserId, taskString);
    expect(task).toBeDefined();
    expect(task.title).toBe(taskString);
    expect(task.deadline).toBeDefined();

    // 2. Generate a daily plan, which should schedule the task
    const today = new Date();
    const dailyPlan = await aiLifeCoach.generateDailyPlan(mockUserId, today);
    expect(dailyPlan).toBeDefined();
    expect(dailyPlan.scheduled_blocks).toBeDefined();
    expect(dailyPlan.scheduled_blocks!.length).toBeGreaterThan(0);

    // 3. Start a time tracking session for the task
    const session = await TimeTrackingService.startSession(mockUserId, { task_id: task.id });
    expect(session).toBeDefined();
    expect(session.completion_status).toBe('active');

    // 4. End the time tracking session
    const endedSession = await TimeTrackingService.endSession(mockUserId, session.id, {
      completion_status: 'completed',
      productivity_rating: 8,
    });
    expect(endedSession.completion_status).toBe('completed');

    // 5. Verify the task is marked as completed
    const completedTask = await TaskService.getTask(mockUserId, task.id);
    expect(completedTask).toBeDefined();
    expect(completedTask?.status).toBe('completed');
  });
});
