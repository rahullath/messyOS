import type {
  Task,
  EnergyLevel as TaskEnergyLevel,
  SchedulingConstraints,
  OptimalSchedule,
  ScheduledTask as TaskManagementScheduledTask,
} from '../../types/task-management';
import type {
  EnergyPattern,
  TimeSlot,
  AvailabilityQuery,
  CalendarEvent,
  ScheduleTaskRequest,
  ScheduledTask as CalendarScheduledTask,
} from '../../types/calendar';
import { calendarService } from '../calendar/calendar-service';
import { supabase } from 'lib/supabase/client';

interface EnergyProfile {
  dailyPattern: EnergyPattern[];
  weeklyPattern: EnergyPattern[];
  seasonalTrends: any[]; // Placeholder for now
  factorsInfluencingEnergy: any[]; // Placeholder for now
  optimalWorkingHours: { start: string; end: string }[];
}

interface EnergyForecast {
  time: string;
  level: number; // 1-10 scale
  confidence: number;
  factors: string[];
}

export class EnergyAwareScheduler {
  /**
   * Learns user's energy patterns over time.
   * For now, this will be a simplified version, eventually integrating with health/sleep data.
   */
  async learnEnergyPatterns(userId: string): Promise<EnergyProfile> {
    // Fetch existing energy patterns from the database
    const { data, error } = await supabase
      .from('energy_patterns')
      .select('*')
      .eq('user_id', userId)
      .order('time_of_day');

    if (error) {
      console.error('Error fetching energy patterns:', error);
      throw new Error(`Failed to learn energy patterns: ${error.message}`);
    }

    // For a simplified initial implementation, we'll just return the raw data
    // In a real scenario, this would involve more complex aggregation and analysis
    const dailyPattern: EnergyPattern[] = data || [];
    const optimalWorkingHours = this.inferOptimalWorkingHours(dailyPattern);

    return {
      dailyPattern: dailyPattern,
      weeklyPattern: [], // Placeholder
      seasonalTrends: [], // Placeholder
      factorsInfluencingEnergy: [], // Placeholder
      optimalWorkingHours: optimalWorkingHours,
    };
  }

  /**
   * Schedules tasks optimally based on user's energy patterns and calendar availability.
   */
  async scheduleTasksOptimally(
    userId: string,
    tasks: Task[],
    constraints: SchedulingConstraints
  ): Promise<OptimalSchedule> {
    const energyProfile = await this.learnEnergyPatterns(userId);
    const scheduledTasks: CalendarScheduledTask[] = [];
    let balanceScore = 0; // Placeholder

    // Sort tasks by priority and deadline (most urgent/important first)
    const sortedTasks = [...tasks].sort((a, b) => {
      if (a.priority === b.priority) {
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        return 0;
      }
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    for (const task of sortedTasks) {
      try {
        const preferredStartTime = constraints.preferred_times?.[0]?.start;
        const preferredEndTime = constraints.preferred_times?.[0]?.end;

        const scheduleRequest: ScheduleTaskRequest = {
          task_id: task.id,
          user_id: userId,
          title: task.title,
          description: task.description,
          estimated_duration: task.estimated_duration || 60, // Default to 60 mins if not set
          deadline: task.deadline,
          energy_required: task.energy_required,
          priority: task.priority,
          flexibility: 'flexible', // Default to flexible, or derive from task if added to Task interface
          importance: 'medium',    // Default to medium, or derive from task if added to Task interface
          preferred_start_time: preferredStartTime,
          preferred_end_time: preferredEndTime,
        };

        const scheduled = await calendarService.scheduleTask(scheduleRequest);
        scheduledTasks.push(scheduled);
      } catch (error) {
        console.warn(`Could not schedule task ${task.title}:`, error);
        // Optionally, add to a list of unscheduled tasks
      }
    }

    // Placeholder for actual energy utilization and balance score calculation
    const energyUtilization = 0;

    return {
      scheduledTasks,
      energyUtilization,
      balanceScore,
      alternativeOptions: [], // Placeholder
    };
  }

  /**
   * Adjusts schedule for current energy level (future implementation).
   */
  async adjustScheduleForEnergyLevel(userId: string, currentEnergy: number): Promise<any> {
    // This will be implemented later, likely involving rescheduling tasks
    console.log(`Adjusting schedule for user ${userId} with energy level ${currentEnergy}`);
    return { message: 'Schedule adjustment logic to be implemented.' };
  }

  /**
   * Predicts energy levels for a given date (future implementation).
   */
  async predictEnergyLevels(userId: string, date: Date): Promise<EnergyForecast[]> {
    // This will be implemented later, using learned patterns
    console.log(`Predicting energy levels for user ${userId} on ${date.toISOString()}`);
    return [];
  }

  /**
   * Helper to infer optimal working hours from energy patterns.
   * Simplified for now, will be more sophisticated later.
   */
  private inferOptimalWorkingHours(dailyPattern: EnergyPattern[]): { start: string; end: string }[] {
    if (dailyPattern.length === 0) {
      return [{ start: '09:00', end: '17:00' }]; // Default if no patterns
    }

    // Find the highest energy period
    let maxEnergy = -1;
    let optimalStart: string | undefined;
    let optimalEnd: string | undefined;

    for (let i = 0; i < dailyPattern.length; i++) {
      const current = dailyPattern[i];
      if (current.average_energy && current.average_energy > maxEnergy) {
        maxEnergy = current.average_energy;
        optimalStart = current.time_of_day;
        // For simplicity, assume optimal period lasts for 2 hours after peak
        const [hour, minute] = current.time_of_day.split(':').map(Number);
        const endDate = new Date();
        endDate.setHours(hour, minute + 120, 0, 0); // Add 2 hours
        optimalEnd = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      }
    }

    return optimalStart && optimalEnd ? [{ start: optimalStart, end: optimalEnd }] : [{ start: '09:00', end: '17:00' }];
  }
}

export const energyAwareScheduler = new EnergyAwareScheduler();
