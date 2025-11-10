import type {
  DailyPlan,
  LifeContext,
  GoalActionPlan,
  LifeBalanceAnalysis,
  LifeOptimization,
  AIResponse,
  EnergyPattern,
  Goal,
  Task,
  TimeSlot as TaskManagementTimeSlot, // Alias to avoid conflict with Calendar TimeSlot
} from '../../types/task-management';
import { energyAwareScheduler } from './energy-aware-scheduler';
import { calendarService } from '../calendar/calendar-service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';
import { TaskService } from '../task-management/task-service'; // Import TaskService
import type { TimeSlot as CalendarTimeSlot, CalendarEvent } from '../../types/calendar'; // Import Calendar TimeSlot and CalendarEvent
import type { TablesInsert, Json } from '../../types/supabase'; // Import TablesInsert and Json

export class AILifeCoach {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Generates a personalized daily plan for the user.
   * This will involve aggregating context, predicting energy, and scheduling tasks.
   */
  async generateDailyPlan(userId: string, date: Date): Promise<DailyPlan> {
    console.log(`Generating daily plan for user ${userId} on ${date.toISOString()}`);

    // 1. Gather complete life context
    const lifeContext = await this.gatherLifeContext(userId, date);

    // 2. Predict energy patterns for the day
    const energyForecast = await energyAwareScheduler.predictEnergyLevels(userId, date);

    // 3. Get tasks that need to be scheduled (pending tasks)
    const pendingTasks = await TaskService.getTasksByStatus(userId, 'pending');

    // 4. Schedule tasks optimally using energy-aware scheduler
    // Convert energyForecast to CalendarTimeSlot[] for scheduling constraints
    const preferredTimes: CalendarTimeSlot[] = energyForecast.map(forecast => ({
      start: forecast.time,
      end: new Date(new Date(forecast.time).getTime() + 2 * 60 * 60 * 1000).toISOString(), // Assume 2-hour blocks
      duration: 120, // 2 hours
    }));

    const schedulingConstraints = {
      preferred_times: preferredTimes,
      energy_level: 'medium' as Task['energy_required'], // Placeholder, can be refined
    };
    const optimalSchedule = await energyAwareScheduler.scheduleTasksOptimally(
      userId,
      pendingTasks,
      schedulingConstraints
    );

    // 5. Construct the daily plan
    const dailyPlan: DailyPlan = {
      id: 'temp-plan-id', // Placeholder
      user_id: userId,
      plan_date: date.toISOString(),
      energy_forecast: energyForecast,
      scheduled_blocks: optimalSchedule.scheduledTasks, // Using scheduled tasks as blocks for now
      prioritized_tasks: [], // TODO: Implement task prioritization
      personal_development: [], // TODO: Implement personal development blocks
      balance_score: optimalSchedule.balanceScore,
      recommendations: [], // TODO: Generate recommendations
      ai_confidence: 0.8, // Placeholder
      tokens_used: 0, // Placeholder
      created_at: new Date().toISOString(),
    };

    // Save the daily plan to the database
    const insertPayload: TablesInsert<'daily_plans'> = {
      user_id: dailyPlan.user_id,
      plan_date: dailyPlan.plan_date,
      energy_forecast: dailyPlan.energy_forecast as Json,
      scheduled_blocks: dailyPlan.scheduled_blocks as Json,
      prioritized_tasks: dailyPlan.prioritized_tasks as Json,
      personal_development: dailyPlan.personal_development as Json,
      balance_score: dailyPlan.balance_score,
      recommendations: dailyPlan.recommendations,
      ai_confidence: dailyPlan.ai_confidence,
      tokens_used: dailyPlan.tokens_used,
    };

    const { data: savedPlan, error: saveError } = await this.supabase
      .from('daily_plans')
      .upsert(insertPayload, { 
        onConflict: 'user_id,plan_date',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving daily plan:', saveError);
      throw new Error(`Failed to save daily plan: ${saveError.message}`);
    }

    return { ...dailyPlan, id: savedPlan.id };
  }

  /**
   * Gathers complete life context from various modules.
   */
  private async gatherLifeContext(userId: string, date: Date): Promise<LifeContext> {
    // Fetch calendar events
    const currentSchedule = await calendarService.getCalendarEvents(userId, {
      startDate: date,
      endDate: new Date(date.getTime() + 24 * 60 * 60 * 1000), // For the current day
    });

    // Fetch energy patterns
    const energyLevels = (await energyAwareScheduler.learnEnergyPatterns(userId)).dailyPattern;

    // TODO: Integrate with other modules (habits, health, finance, sleep, goals)
    const habitPatterns: any[] = [];
    const healthMetrics: any = {};
    const financialStatus: any = {};
    const sleepData: any[] = [];
    const personalGoals: Goal[] = []; // TODO: Fetch actual goals
    const recentAchievements: any[] = [];

    return {
      currentSchedule,
      habitPatterns,
      healthMetrics,
      energyLevels,
      financialStatus,
      sleepData,
      personalGoals,
      recentAchievements,
    };
  }

  /**
   * Processes a conversation about goals and converts it into an actionable plan.
   */
  async processGoalConversation(userId: string, conversation: string): Promise<GoalActionPlan> {
    console.log(`Processing goal conversation for user ${userId}: "${conversation}"`);
    // This will involve AI NLP to parse goals, break them into milestones and tasks.
    return {
      goal: 'Example Goal',
      timeframe: 'Next 3 months',
      milestones: [],
      tasks: [],
      schedulingPlan: {},
    };
  }

  /**
   * Analyzes the user's life balance across different areas.
   */
  async analyzeLifeBalance(userId: string): Promise<LifeBalanceAnalysis> {
    console.log(`Analyzing life balance for user ${userId}`);
    // This will involve aggregating data from all modules and identifying imbalances.
    return {
      overallScore: 0.75,
      areas: {
        work: 0.8,
        health: 0.6,
        social: 0.7,
        personal: 0.9,
        financial: 0.7,
      },
      recommendations: ['Spend more time on health activities.', 'Connect with friends this week.'],
    };
  }

  /**
   * Suggests life optimizations based on holistic context.
   */
  async suggestLifeOptimizations(userId: string): Promise<LifeOptimization[]> {
    console.log(`Suggesting life optimizations for user ${userId}`);
    // This will involve AI reasoning to find patterns and suggest improvements.
    return [
      {
        id: 'opt-1',
        user_id: userId,
        optimization_type: 'productivity',
        title: 'Optimize morning routine',
        description: 'Start high-energy tasks earlier in the day.',
        impact_area: ['work', 'personal'],
        confidence: 0.9,
        implementation_difficulty: 'medium',
        expected_benefit: 'Increased focus and productivity',
        is_implemented: false,
        created_at: new Date().toISOString(),
      },
    ];
  }

  /**
   * Handles contextual queries from the user.
   */
  async handleContextualQuery(userId: string, query: string, context: LifeContext): Promise<AIResponse> {
    console.log(`Handling contextual query for user ${userId}: "${query}"`);
    // This will involve AI NLP and reasoning over the provided context.
    return {
      message: `I understand you're asking about "${query}". Based on your current schedule, you have a meeting at 3 PM.`,
      confidence: 0.85,
    };
  }

  /**
   * Provides personalized productivity coaching based on user's patterns.
   */
  async getProductivityCoaching(userId: string): Promise<string> {
    console.log(`Getting productivity coaching for user ${userId}`);
    // In a real application, this would analyze user data and provide personalized advice
    return "You're doing great! Remember to take breaks and stay hydrated.";
  }
}

export const aiLifeCoach = new AILifeCoach();
