// src/lib/intelligence/agentic-life-optimizer.ts
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { StateGraph, END, START } from "@langchain/langgraph";
import { z } from "zod";
import { createServerClient } from '../supabase/server';

// Types for our agentic system
interface LifeState {
  userId: string;
  habits: any[];
  health: any[];
  finance: any[];
  content: any[];
  insights: AgentInsight[];
  actions: AgentAction[];
  currentFocus: string;
  riskFactors: RiskFactor[];
  optimizations: Optimization[];
}

interface AgentInsight {
  type: 'habit' | 'health' | 'finance' | 'content' | 'correlation' | 'prediction';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  urgency: 'low' | 'medium' | 'high';
  data: any;
}

interface AgentAction {
  type: 'notification' | 'habit_adjustment' | 'schedule_change' | 'intervention';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  timing: 'immediate' | 'today' | 'this_week' | 'this_month';
  automated: boolean;
  metadata: any;
}

interface RiskFactor {
  category: string;
  risk: string;
  probability: number;
  impact: 'low' | 'medium' | 'high';
  prevention: string[];
}

interface Optimization {
  domain: string;
  current: string;
  optimized: string;
  expectedGain: string;
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
}

export class AgenticLifeOptimizer {
  private llm: ChatGoogleGenerativeAI;
  private supabase: any;

  constructor(cookies: any) {
    this.llm = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-pro",
      temperature: 0.1,
      apiKey: process.env.GEMINI_API_KEY,
    });
    this.supabase = createServerClient(cookies);
  }

  // Database interaction tools
  private createDatabaseTools() {
    const updateHabitTool = tool(
      async ({ habitId, updates }) => {
        const { data, error } = await this.supabase
          .from('habits')
          .update(updates)
          .eq('id', habitId)
          .select();
        
        return { success: !error, data, error: error?.message };
      },
      {
        name: "update_habit",
        description: "Update habit settings like target time, difficulty, or category",
        schema: z.object({
          habitId: z.string(),
          updates: z.object({
            target_time: z.string().optional(),
            difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
            category: z.string().optional(),
            reminder_time: z.string().optional(),
          })
        })
      }
    );

    const logMetricTool = tool(
      async ({ userId, type, value, metadata }) => {
        const { data, error } = await this.supabase
          .from('metrics')
          .insert({
            user_id: userId,
            type,
            value,
            metadata,
            recorded_at: new Date().toISOString()
          });
        
        return { success: !error, error: error?.message };
      },
      {
        name: "log_metric",
        description: "Log a new metric (health, finance, mood, etc.)",
        schema: z.object({
          userId: z.string(),
          type: z.string(),
          value: z.number(),
          metadata: z.object({}).optional()
        })
      }
    );

    const createNotificationTool = tool(
      async ({ userId, title, message, type, priority, scheduledFor }) => {
        // In a real implementation, this would create notifications
        // For now, we'll log to console and return the notification
        console.log(`🔔 NOTIFICATION for ${userId}: ${title} - ${message}`);
        
        return {
          success: true,
          notification: { title, message, type, priority, scheduledFor }
        };
      },
      {
        name: "create_notification",
        description: "Create a notification or reminder for the user",
        schema: z.object({
          userId: z.string(),
          title: z.string(),
          message: z.string(),
          type: z.enum(['reminder', 'alert', 'suggestion', 'celebration']),
          priority: z.enum(['low', 'medium', 'high']),
          scheduledFor: z.string().optional()
        })
      }
    );

    return [updateHabitTool, logMetricTool, createNotificationTool];
  }

  // Agent nodes for the state graph
  private async gatherLifeData(state: LifeState): Promise<LifeState> {
    console.log(`🔍 Gathering life data for user ${state.userId}`);
    
    // Get comprehensive user data
    const [habitsResult, metricsResult] = await Promise.all([
      this.supabase
        .from('habits')
        .select(`
          *,
          habit_entries(
            id, value, date, logged_at, effort, energy_level, mood, context, notes
          )
        `)
        .eq('user_id', state.userId)
        .eq('is_active', true),
      
      this.supabase
        .from('metrics')
        .select('*')
        .eq('user_id', state.userId)
        .gte('recorded_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: false })
    ]);

    // Categorize metrics
    const health = metricsResult.data?.filter(m => 
      ['sleep_duration', 'heart_rate_avg', 'stress_level', 'weight', 'steps'].includes(m.type)
    ) || [];
    
    const finance = metricsResult.data?.filter(m => 
      ['expense', 'income', 'crypto_value'].includes(m.type)
    ) || [];
    
    const content = metricsResult.data?.filter(m => 
      m.type === 'content_consumed'
    ) || [];

    return {
      ...state,
      habits: habitsResult.data || [],
      health,
      finance,
      content
    };
  }

  private async analyzeHabitPatterns(state: LifeState): Promise<LifeState> {
    console.log(`🧠 Analyzing habit patterns...`);
    
    const habitAnalysisPrompt = `
    Analyze these habit patterns and provide insights:
    
    HABITS DATA:
    ${JSON.stringify(state.habits.map(h => ({
      name: h.name,
      category: h.category,
      streak: h.streak_count,
      entries: h.habit_entries?.slice(-14) // Last 14 days
    })), null, 2)}
    
    HEALTH CONTEXT:
    ${JSON.stringify(state.health.slice(-7), null, 2)} // Last 7 days
    
    Provide analysis in this JSON format:
    {
      "insights": [
        {
          "type": "habit",
          "title": "Brief insight title",
          "description": "Detailed analysis with specific data",
          "confidence": 0.85,
          "impact": "high",
          "urgency": "medium",
          "data": {"habit": "habit_name", "pattern": "description"}
        }
      ],
      "riskFactors": [
        {
          "category": "habits",
          "risk": "Specific risk description",
          "probability": 0.7,
          "impact": "medium",
          "prevention": ["action1", "action2"]
        }
      ],
      "optimizations": [
        {
          "domain": "habits",
          "current": "Current situation",
          "optimized": "Optimized approach",
          "expectedGain": "Expected improvement",
          "effort": "low",
          "timeframe": "1-2 weeks"
        }
      ]
    }
    
    Focus on:
    1. Habit chains and correlations
    2. Optimal timing based on energy/mood patterns
    3. Risk of streak breaks
    4. Opportunities for habit stacking
    `;

    try {
      const response = await this.llm.invoke(habitAnalysisPrompt);
      const analysis = JSON.parse(response.content as string);
      
      return {
        ...state,
        insights: [...state.insights, ...analysis.insights],
        riskFactors: [...state.riskFactors, ...analysis.riskFactors],
        optimizations: [...state.optimizations, ...analysis.optimizations]
      };
    } catch (error) {
      console.error('Habit analysis error:', error);
      return state;
    }
  }

  private async analyzeHealthPatterns(state: LifeState): Promise<LifeState> {
    console.log(`❤️ Analyzing health patterns...`);
    
    if (state.health.length === 0) {
      return {
        ...state,
        insights: [...state.insights, {
          type: 'health',
          title: 'No Health Data',
          description: 'Start tracking sleep, stress, and activity for health insights',
          confidence: 1.0,
          impact: 'medium',
          urgency: 'low',
          data: { recommendation: 'start_health_tracking' }
        }]
      };
    }

    const healthAnalysisPrompt = `
    Analyze health patterns and correlations:
    
    HEALTH DATA:
    ${JSON.stringify(state.health, null, 2)}
    
    HABIT CONTEXT:
    ${JSON.stringify(state.habits.map(h => ({
      name: h.name,
      recent_completions: h.habit_entries?.slice(-7)
    })), null, 2)}
    
    Provide health insights in the same JSON format as before.
    Focus on:
    1. Sleep quality trends
    2. Stress patterns and triggers
    3. Health-habit correlations
    4. Early warning signs
    `;

    try {
      const response = await this.llm.invoke(healthAnalysisPrompt);
      const analysis = JSON.parse(response.content as string);
      
      return {
        ...state,
        insights: [...state.insights, ...analysis.insights],
        riskFactors: [...state.riskFactors, ...analysis.riskFactors],
        optimizations: [...state.optimizations, ...analysis.optimizations]
      };
    } catch (error) {
      console.error('Health analysis error:', error);
      return state;
    }
  }

  private async analyzeFinancePatterns(state: LifeState): Promise<LifeState> {
    console.log(`💰 Analyzing finance patterns...`);
    
    if (state.finance.length === 0) {
      return state;
    }

    // Calculate spending patterns
    const expenses = state.finance.filter(f => f.type === 'expense');
    const totalSpending = expenses.reduce((sum, e) => sum + e.value, 0);
    const avgDailySpending = totalSpending / 30;
    
    // Categorize expenses
    const categories = expenses.reduce((acc, expense) => {
      const category = expense.metadata?.category || 'Other';
      acc[category] = (acc[category] || 0) + expense.value;
      return acc;
    }, {} as Record<string, number>);

    const financeInsight: AgentInsight = {
      type: 'finance',
      title: 'Monthly Spending Analysis',
      description: `Total spending: ₹${totalSpending.toLocaleString()}. Daily average: ₹${Math.round(avgDailySpending)}. Top category: ${Object.entries(categories).sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown'}`,
      confidence: 0.9,
      impact: 'medium',
      urgency: 'low',
      data: { totalSpending, avgDailySpending, categories }
    };

    return {
      ...state,
      insights: [...state.insights, financeInsight]
    };
  }

  private async findCrossCorrelations(state: LifeState): Promise<LifeState> {
    console.log(`🔗 Finding cross-domain correlations...`);
    
    const correlationPrompt = `
    Find correlations across life domains:
    
    HABITS: ${JSON.stringify(state.habits.map(h => h.name))}
    HEALTH METRICS: ${state.health.length} data points
    FINANCE PATTERNS: ${state.finance.length} transactions
    
    RECENT INSIGHTS:
    ${JSON.stringify(state.insights, null, 2)}
    
    Find hidden connections like:
    - Sleep quality vs habit completion
    - Stress levels vs spending patterns
    - Exercise vs mood vs productivity
    - Weekend vs weekday patterns
    
    Return correlations in the same JSON format.
    `;

    try {
      const response = await this.llm.invoke(correlationPrompt);
      const analysis = JSON.parse(response.content as string);
      
      return {
        ...state,
        insights: [...state.insights, ...analysis.insights],
        riskFactors: [...state.riskFactors, ...(analysis.riskFactors || [])],
        optimizations: [...state.optimizations, ...(analysis.optimizations || [])]
      };
    } catch (error) {
      console.error('Correlation analysis error:', error);
      return state;
    }
  }

  private async generateActionPlan(state: LifeState): Promise<LifeState> {
    console.log(`📋 Generating action plan...`);
    
    const actionPrompt = `
    Based on all insights, create an actionable plan:
    
    INSIGHTS: ${JSON.stringify(state.insights)}
    RISK FACTORS: ${JSON.stringify(state.riskFactors)}
    OPTIMIZATIONS: ${JSON.stringify(state.optimizations)}
    
    Generate specific actions in this format:
    {
      "actions": [
        {
          "type": "habit_adjustment",
          "title": "Optimize gym timing",
          "description": "Move gym to 7 AM based on energy patterns",
          "priority": "high",
          "timing": "immediate",
          "automated": false,
          "metadata": {"habitId": "habit_id", "newTime": "07:00"}
        }
      ],
      "currentFocus": "One main thing to focus on this week"
    }
    
    Prioritize actions by impact and feasibility.
    `;

    try {
      const response = await this.llm.invoke(actionPrompt);
      const plan = JSON.parse(response.content as string);
      
      return {
        ...state,
        actions: plan.actions || [],
        currentFocus: plan.currentFocus || "Focus on consistency in your top 3 habits"
      };
    } catch (error) {
      console.error('Action planning error:', error);
      return {
        ...state,
        currentFocus: "Focus on consistency in your top 3 habits"
      };
    }
  }

  // Main agentic workflow
  async optimizeLife(userId: string): Promise<{
    insights: AgentInsight[];
    actions: AgentAction[];
    riskFactors: RiskFactor[];
    optimizations: Optimization[];
    currentFocus: string;
  }> {
    console.log(`🤖 Starting agentic life optimization for user ${userId}`);
    
    // Create the state graph
    const workflow = new StateGraph({
      channels: {
        userId: "string",
        habits: "array",
        health: "array", 
        finance: "array",
        content: "array",
        insights: "array",
        actions: "array",
        currentFocus: "string",
        riskFactors: "array",
        optimizations: "array"
      }
    })
    .addNode("gather_data", this.gatherLifeData.bind(this))
    .addNode("analyze_habits", this.analyzeHabitPatterns.bind(this))
    .addNode("analyze_health", this.analyzeHealthPatterns.bind(this))
    .addNode("analyze_finance", this.analyzeFinancePatterns.bind(this))
    .addNode("find_correlations", this.findCrossCorrelations.bind(this))
    .addNode("generate_actions", this.generateActionPlan.bind(this))
    .addEdge(START, "gather_data")
    .addEdge("gather_data", "analyze_habits")
    .addEdge("analyze_habits", "analyze_health")
    .addEdge("analyze_health", "analyze_finance")
    .addEdge("analyze_finance", "find_correlations")
    .addEdge("find_correlations", "generate_actions")
    .addEdge("generate_actions", END);

    // Initial state
    const initialState: LifeState = {
      userId,
      habits: [],
      health: [],
      finance: [],
      content: [],
      insights: [],
      actions: [],
      currentFocus: "",
      riskFactors: [],
      optimizations: []
    };

    try {
      // Compile and run the workflow
      const app = workflow.compile();
      const result = await app.invoke(initialState);
      
      console.log(`✅ Life optimization complete. Generated ${result.insights.length} insights, ${result.actions.length} actions`);
      
      return {
        insights: result.insights,
        actions: result.actions,
        riskFactors: result.riskFactors,
        optimizations: result.optimizations,
        currentFocus: result.currentFocus
      };
    } catch (error) {
      console.error('Agentic workflow error:', error);
      
      // Fallback to basic analysis
      return {
        insights: [{
          type: 'habit',
          title: 'Analysis Unavailable',
          description: 'AI analysis temporarily unavailable. Please try again later.',
          confidence: 0.5,
          impact: 'low',
          urgency: 'low',
          data: {}
        }],
        actions: [],
        riskFactors: [],
        optimizations: [],
        currentFocus: "Focus on maintaining your current habits"
      };
    }
  }

  // Quick daily check-in (lighter version)
  async dailyCheckIn(userId: string): Promise<{
    todaysFocus: string;
    urgentActions: AgentAction[];
    quickInsights: AgentInsight[];
  }> {
    console.log(`🌅 Daily check-in for user ${userId}`);
    
    // Get today's data only
    const today = new Date().toISOString().split('T')[0];
    
    const [habitsResult, todayEntries] = await Promise.all([
      this.supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true),
      
      this.supabase
        .from('habit_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
    ]);

    const habits = habitsResult.data || [];
    const completedToday = todayEntries.data || [];
    const completionRate = habits.length > 0 ? completedToday.length / habits.length : 0;

    const quickInsights: AgentInsight[] = [];
    const urgentActions: AgentAction[] = [];

    // Quick completion rate insight
    if (completionRate < 0.3 && new Date().getHours() > 18) {
      quickInsights.push({
        type: 'habit',
        title: 'Low Completion Rate',
        description: `Only ${Math.round(completionRate * 100)}% of habits completed today`,
        confidence: 1.0,
        impact: 'medium',
        urgency: 'high',
        data: { completionRate, timeOfDay: new Date().getHours() }
      });

      urgentActions.push({
        type: 'intervention',
        title: 'Evening Habit Rescue',
        description: 'Complete at least 2 quick habits before bed',
        priority: 'high',
        timing: 'immediate',
        automated: false,
        metadata: { suggestedHabits: habits.slice(0, 2).map(h => h.name) }
      });
    }

    const todaysFocus = completionRate > 0.7 
      ? "Great progress today! Maintain momentum."
      : "Focus on completing your core habits today.";

    return {
      todaysFocus,
      urgentActions,
      quickInsights
    };
  }
}

// Export for use in API routes
export type { AgentInsight, AgentAction, RiskFactor, Optimization };