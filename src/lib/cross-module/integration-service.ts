// Cross-module integration service
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';
import type {
  LifeOptimizationScore,
  Achievement,
  UserAchievement,
  CrossModuleCorrelation,
  ProgressSummary,
  ModuleStats,
  CrossModuleInsight,
  AchievementCheckResponse,
  CorrelationAnalysisResponse
} from '../../types/cross-module';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export class CrossModuleIntegrationService {
  /**
   * Calculate and update life optimization score for a user
   */
  async calculateLifeScore(userId: string, date?: string): Promise<LifeOptimizationScore> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase.rpc('calculate_life_optimization_score', {
      p_user_id: userId,
      p_date: targetDate
    });

    if (error) {
      throw new Error(`Failed to calculate life score: ${error.message}`);
    }

    // Fetch the updated score
    const { data: scoreData, error: scoreError } = await supabase
      .from('life_optimization_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('score_date', targetDate)
      .single();

    if (scoreError) {
      throw new Error(`Failed to fetch life score: ${scoreError.message}`);
    }

    return scoreData;
  }

  /**
   * Get life optimization scores for a user over time
   */
  async getLifeScoreHistory(
    userId: string, 
    days: number = 30
  ): Promise<LifeOptimizationScore[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('life_optimization_scores')
      .select('*')
      .eq('user_id', userId)
      .gte('score_date', startDate.toISOString().split('T')[0])
      .order('score_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch life score history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Check and award achievements for a user
   */
  async checkAchievements(userId: string): Promise<AchievementCheckResponse> {
    const { data, error } = await supabase.rpc('check_and_award_achievements', {
      p_user_id: userId
    });

    if (error) {
      throw new Error(`Failed to check achievements: ${error.message}`);
    }

    return {
      success: true,
      new_achievements: data.new_achievements || [],
      user_stats: data.user_stats || {}
    };
  }

  /**
   * Get all achievements for a user
   */
  async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    const { data, error } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user achievements: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Mark achievement as celebrated
   */
  async celebrateAchievement(userId: string, achievementId: string): Promise<void> {
    const { error } = await supabase
      .from('user_achievements')
      .update({
        is_celebrated: true,
        celebrated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('achievement_id', achievementId);

    if (error) {
      throw new Error(`Failed to mark achievement as celebrated: ${error.message}`);
    }
  }

  /**
   * Get available achievements
   */
  async getAvailableAchievements(): Promise<Achievement[]> {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch achievements: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Calculate cross-module correlations
   */
  async calculateCorrelations(userId: string): Promise<CorrelationAnalysisResponse> {
    // This would typically involve complex statistical analysis
    // For now, we'll implement basic correlation calculations
    
    const correlations: CrossModuleCorrelation[] = [];
    const insights: CrossModuleInsight[] = [];

    // Get habit completion rates by day
    const { data: habitData } = await supabase
      .from('habit_entries')
      .select('date, value, habit_id')
      .eq('user_id', userId)
      .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    // Get task completion rates by day
    const { data: taskData } = await supabase
      .from('tasks')
      .select('completed_at, priority, category')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('completed_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    // Calculate habit-task correlation
    if (habitData && taskData && habitData.length > 10 && taskData.length > 10) {
      const habitsByDay = this.groupByDay(habitData, 'date');
      const tasksByDay = this.groupByDay(taskData, 'completed_at');
      
      const correlation = this.calculatePearsonCorrelation(habitsByDay, tasksByDay);
      
      if (Math.abs(correlation) > 0.3) {
        correlations.push({
          id: `habit-task-${userId}`,
          user_id: userId,
          module1: 'habits',
          module1_metric: 'completion_rate',
          module2: 'tasks',
          module2_metric: 'completion_rate',
          correlation_score: correlation,
          confidence: Math.min(0.95, (habitData.length + taskData.length) / 200),
          sample_size: Math.min(habitData.length, taskData.length),
          insight: correlation > 0 
            ? 'Your habit completion positively correlates with task productivity'
            : 'There may be a trade-off between habit focus and task completion',
          last_calculated: new Date().toISOString()
        });

        insights.push({
          type: 'correlation',
          title: 'Habits & Tasks Connection',
          description: correlation > 0 
            ? 'Completing habits seems to boost your task productivity'
            : 'You might be focusing too much on habits at the expense of tasks',
          modules: ['habits', 'tasks'],
          confidence: Math.min(0.95, (habitData.length + taskData.length) / 200),
          actionable: true,
          data: { correlation, sample_size: Math.min(habitData.length, taskData.length) },
          created_at: new Date().toISOString()
        });
      }
    }

    // Store correlations in database
    for (const correlation of correlations) {
      await supabase
        .from('cross_module_correlations')
        .upsert(correlation, {
          onConflict: 'user_id,module1,module1_metric,module2,module2_metric'
        });
    }

    return {
      success: true,
      correlations,
      insights
    };
  }

  /**
   * Get cross-module correlations for a user
   */
  async getCorrelations(userId: string): Promise<CrossModuleCorrelation[]> {
    const { data, error } = await supabase
      .from('cross_module_correlations')
      .select('*')
      .eq('user_id', userId)
      .order('last_calculated', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch correlations: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get module statistics for a user
   */
  async getModuleStats(userId: string): Promise<ModuleStats> {
    const [habitsStats, tasksStats, healthStats, contentStats] = await Promise.all([
      this.getHabitsStats(userId),
      this.getTasksStats(userId),
      this.getHealthStats(userId),
      this.getContentStats(userId)
    ]);

    return {
      habits: habitsStats,
      tasks: tasksStats,
      health: healthStats,
      productivity: {
        focus_time: tasksStats.avg_completion_time,
        tasks_per_day: tasksStats.completed / 30, // Rough estimate
        efficiency_score: tasksStats.completion_rate
      },
      content: contentStats
    };
  }

  /**
   * Create a progress summary
   */
  async createProgressSummary(
    userId: string,
    type: 'weekly' | 'monthly' | 'milestone' | 'custom',
    startDate: string,
    endDate: string,
    title?: string
  ): Promise<ProgressSummary> {
    const [habits, tasks, scores, achievements] = await Promise.all([
      this.getHabitsForPeriod(userId, startDate, endDate),
      this.getTasksForPeriod(userId, startDate, endDate),
      this.getLifeScoreHistory(userId, this.daysBetween(startDate, endDate)),
      this.getUserAchievements(userId)
    ]);

    const summaryData = {
      habits: {
        completed: habits.filter(h => h.value > 0).length,
        streaks: habits.map(h => h.streak_count || 0),
        categories: this.groupByCategory(habits, 'category')
      },
      tasks: {
        completed: tasks.filter(t => t.status === 'completed').length,
        by_priority: this.groupByPriority(tasks),
        categories: this.groupByCategory(tasks, 'category')
      },
      scores: scores.filter(s => s.score_date >= startDate && s.score_date <= endDate),
      achievements: achievements.filter(a => 
        a.earned_at >= startDate && a.earned_at <= endDate
      ),
      insights: this.generateInsights(habits, tasks, scores)
    };

    const summary: Omit<ProgressSummary, 'id' | 'created_at'> = {
      user_id: userId,
      title: title || `${type.charAt(0).toUpperCase() + type.slice(1)} Progress Summary`,
      summary_type: type,
      period_start: startDate,
      period_end: endDate,
      data: summaryData,
      is_public: false
    };

    const { data, error } = await supabase
      .from('progress_summaries')
      .insert(summary)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create progress summary: ${error.message}`);
    }

    return data;
  }

  // Helper methods
  private groupByDay(data: any[], dateField: string): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    data.forEach(item => {
      const date = item[dateField].split('T')[0];
      grouped[date] = (grouped[date] || 0) + (item.value || 1);
    });

    return grouped;
  }

  private calculatePearsonCorrelation(
    data1: Record<string, number>, 
    data2: Record<string, number>
  ): number {
    const commonDates = Object.keys(data1).filter(date => date in data2);
    
    if (commonDates.length < 3) return 0;

    const values1 = commonDates.map(date => data1[date] || 0);
    const values2 = commonDates.map(date => data2[date] || 0);

    const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
    const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;

    let numerator = 0;
    let sum1 = 0;
    let sum2 = 0;

    for (let i = 0; i < values1.length; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      numerator += diff1 * diff2;
      sum1 += diff1 * diff1;
      sum2 += diff2 * diff2;
    }

    const denominator = Math.sqrt(sum1 * sum2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private async getHabitsStats(userId: string) {
    const { data: habits } = await supabase
      .from('habits')
      .select('*, habit_entries(*)')
      .eq('user_id', userId);

    if (!habits) return {
      total: 0, active: 0, completed_today: 0, avg_streak: 0, 
      best_streak: 0, completion_rate: 0
    };

    const today = new Date().toISOString().split('T')[0];
    const completedToday = habits.filter(h => 
      h.habit_entries?.some((e: any) => e.date === today && e.value > 0)
    ).length;

    return {
      total: habits.length,
      active: habits.filter(h => h.is_active).length,
      completed_today: completedToday,
      avg_streak: habits.reduce((sum, h) => sum + (h.streak_count || 0), 0) / habits.length,
      best_streak: Math.max(...habits.map(h => h.best_streak || 0)),
      completion_rate: habits.length > 0 ? (completedToday / habits.length) * 100 : 0
    };
  }

  private async getTasksStats(userId: string) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId);

    if (!tasks) return {
      total: 0, completed: 0, in_progress: 0, overdue: 0, 
      completion_rate: 0, avg_completion_time: 0
    };

    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const overdue = tasks.filter(t => 
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
    ).length;

    return {
      total: tasks.length,
      completed,
      in_progress: inProgress,
      overdue,
      completion_rate: tasks.length > 0 ? (completed / tasks.length) * 100 : 0,
      avg_completion_time: 0 // Would need more detailed time tracking
    };
  }

  private async getHealthStats(userId: string) {
    const { data: metrics } = await supabase
      .from('metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('category', 'health');

    if (!metrics || metrics.length === 0) {
      return { metrics_count: 0, avg_score: 0, trend: 'stable' as const };
    }

    const avgScore = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
    
    return {
      metrics_count: metrics.length,
      avg_score: avgScore,
      trend: 'stable' as const // Would need trend calculation
    };
  }

  private async getContentStats(userId: string) {
    const { data: content } = await supabase
      .from('content_entries')
      .select('*')
      .eq('user_id', userId);

    if (!content) return { consumed: 0, completed: 0, avg_rating: 0 };

    const completed = content.filter(c => c.status === 'completed').length;
    const ratings = content.filter(c => c.rating).map(c => c.rating!);
    const avgRating = ratings.length > 0 ? 
      ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;

    return {
      consumed: content.length,
      completed,
      avg_rating: avgRating
    };
  }

  private async getHabitsForPeriod(userId: string, startDate: string, endDate: string) {
    const { data } = await supabase
      .from('habit_entries')
      .select('*, habits(*)')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    return data || [];
  }

  private async getTasksForPeriod(userId: string, startDate: string, endDate: string) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    return data || [];
  }

  private daysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private groupByCategory(data: any[], field: string): Record<string, number> {
    return data.reduce((acc, item) => {
      const category = item[field] || 'uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
  }

  private groupByPriority(tasks: any[]): Record<string, number> {
    return tasks.reduce((acc, task) => {
      const priority = task.priority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});
  }

  private generateInsights(habits: any[], tasks: any[], scores: any[]): string[] {
    const insights: string[] = [];

    if (habits.length > 0) {
      const completionRate = habits.filter(h => h.value > 0).length / habits.length;
      if (completionRate > 0.8) {
        insights.push('Excellent habit consistency this period!');
      } else if (completionRate < 0.5) {
        insights.push('Consider focusing on fewer habits to improve consistency.');
      }
    }

    if (tasks.length > 0) {
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      if (completedTasks > tasks.length * 0.8) {
        insights.push('Outstanding task completion rate!');
      }
    }

    if (scores.length > 1) {
      const trend = scores[scores.length - 1].overall_score - scores[0].overall_score;
      if (trend > 10) {
        insights.push('Your overall life optimization score is trending upward!');
      } else if (trend < -10) {
        insights.push('Consider reviewing your goals and strategies.');
      }
    }

    return insights;
  }
}

export const crossModuleService = new CrossModuleIntegrationService();