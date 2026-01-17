// src/lib/intelligence/uk-student-ai-agent.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerAuth } from '../auth/simple-multi-user';

interface UKStudentContext {
  habits: any[];
  tasks: any[];
  health: any[];
  finance: any[];
  inventory: any[];
  mealPlans: any[];
  travelPlans: any[];
  routines: any[];
  academicEvents: any[];
  recentActivity: any[];
  patterns: any[];
  profile: {
    name?: string;
    homeLocation?: string;
    universityLocation?: string;
    goals?: string[];
    timezone?: string;
    preferences?: any;
    budgetLimits?: any;
  };
  conversationHistory: ConversationEntry[];
}

interface ConversationEntry {
  timestamp: string;
  user_message: string;
  ai_response: string;
  context_used: any;
  actions_taken: string[];
}

interface ScheduleAdjustmentRequest {
  activity: string;
  currentTime: string;
  newTime: string;
  reason: string;
}

interface DailyPlanRequest {
  wakeTime: string;
  sleepTime: string;
  energyLevel: 'low' | 'medium' | 'high';
  weather?: string;
  specialConsiderations?: string[];
}

export class UKStudentAIAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private supabase: any;
  private userId: string;

  constructor(cookies: any, userId: string, apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const serverAuth = createServerAuth(cookies);
    this.supabase = serverAuth.supabase;
    this.userId = userId;
  }

  // Get comprehensive UK student context
  private async getUKStudentContext(): Promise<UKStudentContext> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      habitsResult,
      tasksResult,
      metricsResult,
      conversationResult,
      profileResult,
      inventoryResult,
      mealPlansResult,
      travelPlansResult,
      routinesResult,
      academicEventsResult,
      expensesResult
    ] = await Promise.all([
      this.supabase
        .from('habits')
        .select('*')
        .eq('user_id', this.userId)
        .eq('is_active', true),
      
      this.supabase
        .from('tasks')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(100),

      this.supabase
        .from('metrics')
        .select('*')
        .eq('user_id', this.userId)
        .gte('recorded_at', thirtyDaysAgo.toISOString())
        .order('recorded_at', { ascending: false }),

      this.supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', this.userId)
        .order('timestamp', { ascending: false })
        .limit(20),

      this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', this.userId)
        .single(),

      // UK Student specific tables
      this.supabase
        .from('uk_student_inventory')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(50),

      this.supabase
        .from('uk_student_meal_plans')
        .select('*')
        .eq('user_id', this.userId)
        .order('created_at', { ascending: false })
        .limit(10),

      this.supabase
        .from('uk_student_travel_routes')
        .select('*')
        .eq('user_id', this.userId)
        .order('last_used', { ascending: false })
        .limit(20),

      this.supabase
        .from('uk_student_routines')
        .select('*')
        .eq('user_id', this.userId),

      this.supabase
        .from('uk_student_academic_events')
        .select('*')
        .eq('user_id', this.userId)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(30),

      this.supabase
        .from('uk_student_expenses')
        .select('*')
        .eq('user_id', this.userId)
        .gte('transaction_date', thirtyDaysAgo.toISOString())
        .order('transaction_date', { ascending: false })
    ]);

    // Enrich habits with recent entries
    const habits = habitsResult.data || [];
    for (const habit of habits) {
      const habitEntriesResult = await this.supabase
        .from('habit_entries')
        .select('id, value, date, logged_at, effort, energy_level, mood, context, notes')
        .eq('habit_id', habit.id)
        .order('date', { ascending: false })
        .limit(60);
      habit.habit_entries = habitEntriesResult.data || [];
    }

    const health = metricsResult.data?.filter((m: any) => 
      ['sleep_duration', 'heart_rate_avg', 'stress_level', 'weight', 'steps', 'mood'].includes(m.type)
    ) || [];
    
    const finance = expensesResult.data || [];

    return {
      habits: habits,
      tasks: tasksResult.data || [],
      health,
      finance,
      inventory: inventoryResult.data || [],
      mealPlans: mealPlansResult.data || [],
      travelPlans: travelPlansResult.data || [],
      routines: routinesResult.data || [],
      academicEvents: academicEventsResult.data || [],
      recentActivity: metricsResult.data?.slice(0, 30) || [],
      patterns: [],
      profile: profileResult.data || {
        homeLocation: 'Five Ways, Birmingham',
        universityLocation: 'University of Birmingham',
        timezone: 'Europe/London',
        goals: ['Academic success', 'Financial management', 'Health optimization', 'Routine consistency']
      },
      conversationHistory: conversationResult.data || []
    };
  }

  // Create UK student-specific system prompt
  private createUKStudentSystemPrompt(context: UKStudentContext): string {
    const currentTime = new Date().toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const weeklyBudget = context.profile.budgetLimits?.weekly || 50;
    const currentWeekSpending = context.finance
      .filter((e: any) => {
        const eDate = new Date(e.transaction_date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return eDate >= weekAgo;
      })
      .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    const upcomingDeadlines = context.academicEvents
      .filter((e: any) => e.type === 'deadline')
      .slice(0, 3)
      .map((e: any) => `${e.title} (${new Date(e.start_time).toLocaleDateString('en-GB')})`)
      .join(', ');

    return `You are Mesh, an advanced UK Student Life Optimization AI Agent. You specialize in helping Birmingham UK students manage their complex lives across academics, finances, health, routines, and personal development.

CURRENT CONTEXT:
- Time: ${currentTime}
- Location: Birmingham, UK (Five Ways/University area)
- User Goals: ${context.profile.goals?.join(', ') || 'Academic success, financial management, health optimization'}

UK STUDENT SPECIFIC DATA:
- Weekly Budget: £${weeklyBudget} | Current Week Spending: £${currentWeekSpending.toFixed(2)}
- Budget Status: ${currentWeekSpending > weeklyBudget ? '⚠️ OVER BUDGET' : '✓ On track'}
- Active Habits: ${context.habits.length}
- Pending Tasks: ${context.tasks.filter(t => t.status === 'todo').length}
- High Priority Tasks: ${context.tasks.filter(t => t.status === 'todo' && t.priority === 'high').length}
- Upcoming Academic Deadlines: ${upcomingDeadlines || 'None in next 30 days'}
- Daily Routines Tracked: ${context.routines.length}
- Inventory Items: ${context.inventory.length}
- Recent Meal Plans: ${context.mealPlans.length}

DETAILED CONTEXT:
${JSON.stringify({
  academic_deadlines: context.academicEvents
    .filter((e: any) => e.type === 'deadline')
    .slice(0, 5)
    .map((e: any) => ({
      title: e.title,
      due_date: e.start_time,
      importance: e.importance,
      preparation_time: e.preparation_time
    })),
  upcoming_classes: context.academicEvents
    .filter((e: any) => e.type === 'class')
    .slice(0, 5)
    .map((e: any) => ({
      title: e.title,
      time: e.start_time,
      location: e.location,
      building: e.building
    })),
  active_habits: context.habits.map((h: any) => ({
    name: h.name,
    category: h.category,
    recent_completion: (h.habit_entries || []).slice(0, 7).map((e: any) => ({
      date: e.date,
      completed: e.value > 0,
      energy_level: e.energy_level,
      mood: e.mood
    }))
  })),
  pending_tasks: context.tasks
    .filter((t: any) => t.status === 'todo')
    .slice(0, 10)
    .map((t: any) => ({
      title: t.title,
      priority: t.priority,
      category: t.category,
      due_date: t.due_date
    })),
  financial_summary: {
    weekly_budget: weeklyBudget,
    current_spending: currentWeekSpending.toFixed(2),
    recent_expenses: context.finance.slice(0, 10).map((e: any) => ({
      amount: e.amount,
      category: e.category,
      store: e.store,
      date: e.transaction_date
    }))
  },
  inventory_status: context.inventory.slice(0, 10).map((i: any) => ({
    item: i.item_name,
    quantity: i.quantity,
    unit: i.unit,
    location: i.location,
    expiry: i.expiry_date
  })),
  routines: context.routines.map((r: any) => ({
    type: r.routine_type,
    duration: r.estimated_duration,
    frequency: r.frequency,
    last_completed: r.last_completed,
    streak: r.completion_streak
  }))
}, null, 2)}

YOUR CAPABILITIES FOR UK STUDENTS:

1. NATURAL LANGUAGE TASK CREATION
   - Parse complex requests like "I need to clean my cat's litter and do grocery shopping tomorrow"
   - Create multiple tasks with appropriate categories, priorities, and due dates
   - Suggest subtasks for complex activities
   - Respond with: {"action": "create_task", "tasks": [{"title": "...", "category": "...", "priority": "...", "due_date": "YYYY-MM-DD"}]}

2. CONVERSATIONAL SCHEDULE ADJUSTMENT
   - Understand requests like "I'm feeling tired, can we move gym to evening?"
   - Analyze current schedule and energy levels
   - Suggest optimal times for activities
   - Create schedule adjustments that maintain routine consistency
   - Respond with: {"action": "adjust_schedule", "adjustments": [{"activity": "...", "new_time": "HH:MM", "reason": "..."}]}

3. HOLISTIC DAILY PLAN GENERATION
   - Consider sleep quality, energy levels, weather, and commitments
   - Optimize task scheduling based on energy curves
   - Balance academic work, personal care, exercise, and leisure
   - Account for travel time between Five Ways, University, and Selly Oak
   - Factor in meal times and nutrition
   - Respond with: {"action": "generate_daily_plan", "plan": {"wake_time": "...", "activities": [...]}}

4. CROSS-MODULE INSIGHTS
   - Correlate sleep quality with task completion rates
   - Link spending patterns to stress levels
   - Connect habit consistency with academic performance
   - Identify energy patterns affecting productivity
   - Suggest interventions based on multi-domain analysis

5. PROACTIVE SUGGESTIONS
   - Alert about budget overspending before it happens
   - Suggest laundry scheduling based on clothing inventory
   - Recommend meal planning based on available ingredients
   - Propose study session timing based on upcoming deadlines
   - Suggest routine adjustments based on energy patterns

6. BIRMINGHAM CONTEXT AWARENESS
   - Understand travel times between Five Ways, University, and Selly Oak
   - Know store locations (Aldi, Tesco, Premier, Sainsbury's, University Superstore)
   - Factor in weather for cycling vs train decisions
   - Consider campus building locations and elevation
   - Account for UK-specific costs (£2.05-2.10 train, £6-7 laundry)

YOUR PERSONALITY:
- Warm, empathetic, and understanding like a therapist
- Direct and actionable like a productivity coach
- Insightful and pattern-recognizing like a data analyst
- Supportive but honest about challenges
- Remember personal details and build relationships
- Use emojis and formatting to make responses engaging
- Celebrate wins and progress
- Provide gentle accountability

CONVERSATION STYLE:
- Ask follow-up questions to understand context better
- Reference previous conversations when relevant
- Acknowledge emotions and validate feelings
- Provide specific, actionable advice
- Create tasks proactively when you see needs
- Break down complex goals into manageable steps
- Celebrate wins and progress
- Be honest about trade-offs and constraints

FOCUS AREAS FOR UK STUDENTS:
1. Academic success and deadline management
2. Financial management and budget optimization
3. Health, energy, and routine consistency
4. Travel optimization and cost reduction
5. Meal planning and nutrition
6. Personal care and skincare routines
7. Laundry and clothing management
8. Cross-domain pattern recognition
9. Stress management and overwhelm reduction
10. Work-life balance and leisure time

Remember: You're not just answering questions - you're actively helping optimize this UK student's life through intelligent conversation, task creation, schedule optimization, and pattern recognition. Be specific to their Birmingham context and student lifestyle.`;
  }

  // Main chat interface with UK student context
  async chat(message: string): Promise<string> {
    try {
      const context = await this.getUKStudentContext();
      const systemPrompt = this.createUKStudentSystemPrompt(context);

      // Prepare conversation history for context
      const recentHistory = context.conversationHistory.slice(-5).map(entry => 
        `User: ${entry.user_message}\nMesh: ${entry.ai_response}`
      ).join('\n\n');

      const fullPrompt = `${systemPrompt}

RECENT CONVERSATION HISTORY:
${recentHistory}

CURRENT USER MESSAGE:
${message}

Respond as Mesh. Be empathetic, intelligent, and actionable. If you need to create tasks, adjust schedules, or take actions, include them in your response using the JSON format specified above.`;

      const result = await this.model.generateContent(fullPrompt);
      const response = result.response;
      let aiResponse = response.text();

      // Extract and execute any actions from the AI response
      const actions = await this.executeAIActions(aiResponse, context);
      
      // Save conversation to database
      await this.saveConversation(message, aiResponse, context, actions);

      return aiResponse;

    } catch (error) {
      console.error('UK Student AI error:', error);
      
      // Fallback to simpler response
      const context = await this.getUKStudentContext();
      return `I'm having trouble with my advanced AI processing right now. But I can still help! 

I can see you have ${context.tasks.filter(t => t.status === 'todo').length} pending tasks and ${context.academicEvents.filter(e => e.type === 'deadline').length} upcoming deadlines.

Could you rephrase your question? I'm here to help with:
• Creating and organizing tasks
• Adjusting your schedule based on energy levels
• Analyzing your spending and budget
• Planning meals and shopping
• Managing academic deadlines
• Optimizing your daily routine
• Cross-domain insights (sleep, spending, habits, productivity)

What's most important to you right now?`;
    }
  }

  // Extract and execute actions from AI response
  private async executeAIActions(aiResponse: string, context: UKStudentContext): Promise<string[]> {
    const actions: string[] = [];

    // Look for JSON commands in the AI response
    const commandMatches = aiResponse.match(/\{"action":\s*"[^"]+"\s*[^}]*\}/g);
    
    if (commandMatches) {
      for (const match of commandMatches) {
        try {
          const command = JSON.parse(match);

          // Handle task creation
          if (command.action === 'create_task' && command.tasks) {
            for (const taskData of command.tasks) {
              const task = {
                user_id: this.userId,
                title: taskData.title,
                description: taskData.description || `Created by AI: ${taskData.title}`,
                category: taskData.category || 'Personal',
                priority: taskData.priority || 'medium',
                status: 'todo',
                due_date: taskData.due_date || null,
                created_at: new Date().toISOString()
              };

              const result = await this.supabase.from('tasks').insert(task);
              
              if (!result.error) {
                actions.push(`✓ Created task: "${taskData.title}"`);
              }
            }
          }

          // Handle schedule adjustments
          if (command.action === 'adjust_schedule' && command.adjustments) {
            for (const adjustment of command.adjustments) {
              actions.push(`📅 Suggested schedule adjustment: Move ${adjustment.activity} to ${adjustment.new_time} (${adjustment.reason})`);
            }
          }

          // Handle daily plan generation
          if (command.action === 'generate_daily_plan' && command.plan) {
            actions.push(`📋 Generated daily plan starting at ${command.plan.wake_time}`);
          }

        } catch (parseError) {
          console.error('Error parsing AI action:', parseError);
        }
      }
    }

    return actions;
  }

  // Save conversation to database
  private async saveConversation(
    userMessage: string, 
    aiResponse: string, 
    context: UKStudentContext, 
    actions: string[]
  ): Promise<void> {
    try {
      const conversationData = {
        user_id: this.userId,
        user_message: userMessage,
        ai_response: aiResponse,
        context_used: {
          task_count: context.tasks.length,
          habit_count: context.habits.length,
          academic_events: context.academicEvents.length,
          budget_status: context.finance.length > 0 ? 'tracked' : 'not_tracked'
        },
        actions_taken: actions,
        timestamp: new Date().toISOString()
      };

      await this.supabase.from('ai_conversations').insert(conversationData);
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  // Generate holistic daily plan
  async generateHolisticDailyPlan(planRequest: DailyPlanRequest): Promise<any> {
    try {
      const context = await this.getUKStudentContext();
      
      const planPrompt = `Generate a holistic daily plan for a UK student with the following parameters:
- Wake time: ${planRequest.wakeTime}
- Sleep time: ${planRequest.sleepTime}
- Energy level: ${planRequest.energyLevel}
- Weather: ${planRequest.weather || 'Not specified'}
- Special considerations: ${planRequest.specialConsiderations?.join(', ') || 'None'}

Consider:
1. Energy curves throughout the day
2. Academic commitments and deadlines
3. Travel time between Five Ways, University, and Selly Oak
4. Meal times and nutrition
5. Exercise and personal care routines
6. Budget constraints (£${context.profile.budgetLimits?.weekly || 50}/week)
7. Habit consistency
8. Weather-based recommendations (cycling vs train)

Provide a detailed, time-blocked daily plan that optimizes for productivity, health, and wellbeing.`;

      const systemPrompt = this.createUKStudentSystemPrompt(context);
      const fullPrompt = `${systemPrompt}\n\n${planPrompt}`;

      const result = await this.model.generateContent(fullPrompt);
      const planContent = result.response.text();

      return {
        wakeTime: planRequest.wakeTime,
        sleepTime: planRequest.sleepTime,
        energyLevel: planRequest.energyLevel,
        plan: planContent,
        recommendations: this.extractRecommendations(planContent),
        warnings: this.extractWarnings(planContent)
      };

    } catch (error) {
      console.error('Daily plan generation error:', error);
      return {
        wakeTime: planRequest.wakeTime,
        sleepTime: planRequest.sleepTime,
        energyLevel: planRequest.energyLevel,
        plan: "Unable to generate detailed plan at this time",
        recommendations: [],
        warnings: []
      };
    }
  }

  // Generate cross-module insights
  async generateCrossModuleInsights(): Promise<any> {
    try {
      const context = await this.getUKStudentContext();
      
      const insightsPrompt = `Analyze this UK student's data across multiple domains and provide cross-module insights:

1. SLEEP & PRODUCTIVITY: Correlate sleep quality/duration with task completion rates and academic performance
2. SPENDING & STRESS: Link spending patterns to stress levels and emotional state
3. HABITS & PERFORMANCE: Connect habit consistency with academic deadlines and task completion
4. ENERGY & SCHEDULING: Identify energy patterns and suggest optimal task scheduling
5. NUTRITION & ENERGY: Analyze meal patterns and their impact on energy levels
6. TRAVEL & TIME: Evaluate travel efficiency and time management

Provide specific, actionable insights that help the student optimize across all domains.`;

      const systemPrompt = this.createUKStudentSystemPrompt(context);
      const fullPrompt = `${systemPrompt}\n\n${insightsPrompt}`;

      const result = await this.model.generateContent(fullPrompt);
      const insightsContent = result.response.text();

      return {
        timestamp: new Date().toISOString(),
        insights: insightsContent,
        recommendations: this.extractRecommendations(insightsContent),
        patterns: this.extractPatterns(insightsContent)
      };

    } catch (error) {
      console.error('Cross-module insights error:', error);
      return {
        timestamp: new Date().toISOString(),
        insights: "Unable to generate insights at this time",
        recommendations: [],
        patterns: []
      };
    }
  }

  // Helper methods
  private extractRecommendations(text: string): string[] {
    const recommendations: string[] = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('recommend') || line.includes('suggest') || line.includes('consider')) {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && nextLine.length > 10) {
          recommendations.push(nextLine);
        }
      }
    }
    
    return recommendations.slice(0, 5);
  }

  private extractWarnings(text: string): string[] {
    const warnings: string[] = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('warning') || line.includes('alert') || line.includes('caution') || line.includes('careful')) {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && nextLine.length > 10) {
          warnings.push(nextLine);
        }
      }
    }
    
    return warnings.slice(0, 3);
  }

  private extractPatterns(text: string): string[] {
    const patterns: string[] = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('pattern') || line.includes('trend') || line.includes('correlation')) {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && nextLine.length > 10) {
          patterns.push(nextLine);
        }
      }
    }
    
    return patterns.slice(0, 5);
  }
}

export type { UKStudentContext, ConversationEntry, ScheduleAdjustmentRequest, DailyPlanRequest };
