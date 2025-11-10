import type { Task, Goal } from '../../types/task-management';
import type { Habit } from '../../types/habits'; // Assuming a habit type definition exists
import { TaskService } from '../task-management/task-service';
import { GoalService } from '../task-management/task-service';
// import { HabitService } from '../habits/habit-service'; // Assuming a habit service exists

interface LifeScore {
  overallScore: number;
  taskCompletionRate: number;
  goalProgress: number;
  habitConsistency: number;
}

export class LifeOptimizationService {
  /**
   * Calculates a user's "life score" based on data from various modules.
   */
  static async calculateLifeScore(userId: string): Promise<LifeScore> {
    const [tasksResponse, goals] = await Promise.all([
      TaskService.getTasks(userId),
      GoalService.getGoals(userId),
      // HabitService.getHabits(userId), // Assuming a habit service exists
    ]);

    const tasks = tasksResponse.tasks;
    const habits: Habit[] = []; // Placeholder for now

    // Task completion rate
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const taskCompletionRate = tasks.length > 0 ? completedTasks / tasks.length : 0;

    // Goal progress (simplified)
    const activeGoals = goals.filter(goal => goal.status === 'active').length;
    const completedGoals = goals.filter(goal => goal.status === 'completed').length;
    const goalProgress = goals.length > 0 ? completedGoals / goals.length : 0;

    // Habit consistency (simplified)
    const consistentHabits = habits.filter(habit => (habit.streak_count || 0) > 7).length;
    const habitConsistency = habits.length > 0 ? consistentHabits / habits.length : 0;

    // Overall score (weighted average)
    const overallScore = (taskCompletionRate * 0.4) + (goalProgress * 0.4) + (habitConsistency * 0.2);

    return {
      overallScore,
      taskCompletionRate,
      goalProgress,
      habitConsistency,
    };
  }

  /**
   * Generates cross-module insights (placeholder for future AI integration).
   */
  static async generateCrossModuleInsights(userId: string): Promise<any> {
    console.log(`Generating cross-module insights for user ${userId}`);
    // This will involve more complex logic, potentially using AI to find correlations
    // between task productivity, habit completion, health metrics, etc.
    return { message: 'Cross-module insights generation to be implemented.' };
  }
}
