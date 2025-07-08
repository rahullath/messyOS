// src/lib/intelligence/meshos-ai-agent.ts
import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools";
import { StateGraph, END, START } from "@langchain/langgraph";
import { z } from "zod";
import { createServerClient } from '../supabase/server';
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "@langchain/core/documents";

// Enhanced types for the AI agent
interface MessyOSState {
  userId: string;
  currentTime: string;
  userContext: UserLifeContext;
  memories: AgentMemory[];
  insights: AgentInsight[];
  actions: AgentAction[];
  conversations: ConversationTurn[];
  goals: LifeGoal[];
  riskFactors: RiskFactor[];
  optimizations: Optimization[];
  agentPersonality: AgentPersonality;
}

interface UserLifeContext {
  habits: any[];
  health: any[];
  finance: any[];
  content: any[];
  tasks: any[];
  recentActivity: any[];
  preferences: UserPreferences;
  patterns: LifePattern[];
}

interface AgentMemory {
  id: string;
  type: 'insight' | 'conversation' | 'pattern' | 'goal' | 'achievement';
  content: string;
  timestamp: string;
  importance: number;
  tags: string[];
  embedding?: number[];
}

interface ConversationTurn {
  id: string;
  timestamp: string;
  userMessage: string;
  agentResponse: string;
  context: any;
  sentiment: 'positive' | 'neutral' | 'negative';
  actionsTaken: string[];
}

interface LifeGoal {
  id: string;
  title: string;
  description: string;
  category: 'health' | 'finance' | 'habits' | 'career' | 'relationships';
  targetDate: string;
  progress: number;
  milestones: Milestone[];
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'paused' | 'completed' | 'abandoned';
}

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
  actions: string[];
}

interface LifePattern {
  type: string;
  description: string;
  confidence: number;
  frequency: string;
  impact: 'positive' | 'negative' | 'neutral';
  triggers: string[];
  outcomes: string[];
}

interface UserPreferences {
  communicationStyle: 'casual' | 'formal' | 'motivational' | 'analytical';
  notificationFrequency: 'minimal' | 'moderate' | 'frequent';
  focusAreas: string[];
  privacyLevel: 'open' | 'selective' | 'private';
}

interface AgentPersonality {
  name: string;
  traits: string[];
  communicationStyle: string;
  expertise: string[];
  quirks: string[];
}

interface AgentInsight {
  id: string;
  type: 'habit' | 'health' | 'finance' | 'content' | 'correlation' | 'prediction' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  urgency: 'low' | 'medium' | 'high';
  category: string;
  data: any;
  actionable: boolean;
  timestamp: string;
}

interface AgentAction {
  id: string;
  type: 'notification' | 'habit_adjustment' | 'schedule_change' | 'intervention' | 'celebration' | 'reminder';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  timing: 'immediate' | 'today' | 'this_week' | 'this_month';
  automated: boolean;
  completed: boolean;
  metadata: any;
  timestamp: string;
}

interface RiskFactor {
  id: string;
  category: string;
  risk: string;
  probability: number;
  impact: 'low' | 'medium' | 'high';
  prevention: string[];
  earlyWarnings: string[];
}

interface Optimization {
  id: string;
  domain: string;
  current: string;
  optimized: string;
  expectedGain: string;
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
  steps: string[];
}

export class MessyOSAIAgent {
  private llm: ChatGoogleGenerativeAI;
  private embeddings: GoogleGenerativeAIEmbeddings;
  private vectorStore: MemoryVectorStore;
  private supabase: any;
  private agentPersonality: AgentPersonality;

  constructor(cookies: any) {
    this.llm = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-pro",
      temperature: 0.3,
      apiKey: process.env.GEMINI_API_KEY,
    });

    this.embeddings = new GoogleGenerativeAIEmbeddings({
      model: "models/embedding-001",
      apiKey: process.env.GEMINI_API_KEY,
    });

    this.vectorStore = new MemoryVectorStore(this.embeddings);
    this.supabase = createServerClient(cookies);

    this.agentPersonality = {
      name: "Mesh",
      traits: ["analytical", "supportive", "proactive", "insightful", "adaptive"],
      communicationStyle: "friendly but professional, data-driven with empathy",
      expertise: ["habit formation", "life optimization", "pattern recognition", "goal achievement"],
      quirks: ["loves finding hidden patterns", "celebrates small wins", "uses data metaphors"]
    };
  }

  // Enhanced database tools with more capabilities
  private createEnhancedTools() {
    const updateHabitTool = tool(
      async ({ habitId, updates }) => {
        const { data, error } = await this.supabase
          .from('habits')
          .update(updates)
          .eq('id', habitId)
          .select();
        
        if (!error && updates.reminder_time) {
          // Log the habit adjustment as an agent memory
          await this.storeMemory({
            type: 'insight',
            content: `Adjusted ${data[0]?.name} habit timing to ${updates.reminder_time}`,
            importance: 0.7,
            tags: ['habit_optimization', 'timing_adjustment']
          });
        }
        
        return { success: !error, data, error: error?.message };
      },
      {
        name: "update_habit",
        description: "Update habit settings like target time, difficulty, category, or reminder time",
        schema: z.object({
          habitId: z.string(),
          updates: z.object({
            target_time: z.string().optional(),
            difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
            category: z.string().optional(),
            reminder_time: z.string().optional(),
            notes: z.string().optional(),
          })
        })
      }
    );

    const createGoalTool = tool(
      async ({ userId, title, description, category, targetDate, milestones }) => {
        const goal: LifeGoal = {
          id: crypto.randomUUID(),
          title,
          description,
          category,
          targetDate,
          progress: 0,
          milestones: milestones.map((m: any) => ({
            id: crypto.randomUUID(),
            title: m.title,
            completed: false,
            dueDate: m.dueDate,
            actions: m.actions || []
          })),
          priority: 'medium',
          status: 'active'
        };

        // Store goal in database (you'd need a goals table)
        const { data, error } = await this.supabase
          .from('goals')
          .insert({
            id: goal.id,
            user_id: userId,
            title: goal.title,
            description: goal.description,
            category: goal.category,
            target_date: goal.targetDate,
            milestones: goal.milestones,
            priority: goal.priority,
            status: goal.status,
            progress: 0
          });

        await this.storeMemory({
          type: 'goal',
          content: `Created new ${category} goal: ${title}`,
          importance: 0.9,
          tags: ['goal_creation', category]
        });

        return { success: !error, goal, error: error?.message };
      },
      {
        name: "create_goal",
        description: "Create a new life goal with milestones",
        schema: z.object({
          userId: z.string(),
          title: z.string(),
          description: z.string(),
          category: z.enum(['health', 'finance', 'habits', 'career', 'relationships']),
          targetDate: z.string(),
          milestones: z.array(z.object({
            title: z.string(),
            dueDate: z.string(),
            actions: z.array(z.string()).optional()
          }))
        })
      }
    );

    const analyzePatternTool = tool(
      async ({ userId, dataType, timeframe }) => {
        let query = this.supabase.from('metrics').select('*').eq('user_id', userId);
        
        if (dataType !== 'all') {
          query = query.eq('type', dataType);
        }

        const days = timeframe === 'week' ? 7 : timeframe === 'month' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        query = query.gte('recorded_at', startDate.toISOString());

        const { data, error } = await query.order('recorded_at', { ascending: false });

        if (error) return { success: false, error: error.message };

        // Analyze patterns
        const patterns = this.detectPatterns(data || []);
        
        return { success: true, patterns, dataPoints: data?.length || 0 };
      },
      {
        name: "analyze_pattern",
        description: "Analyze patterns in user data over a specific timeframe",
        schema: z.object({
          userId: z.string(),
          dataType: z.enum(['all', 'sleep_duration', 'stress_level', 'expense', 'mood']),
          timeframe: z.enum(['week', 'month', 'quarter'])
        })
      }
    );

    const scheduleInterventionTool = tool(
      async ({ userId, type, title, description, scheduledFor, metadata }) => {
        const intervention = {
          id: crypto.randomUUID(),
          user_id: userId,
          type,
          title,
          description,
          scheduled_for: scheduledFor,
          completed: false,
          metadata,
          created_at: new Date().toISOString()
        };

        const { data, error } = await this.supabase
          .from('agent_interventions')
          .insert(intervention);

        if (!error) {
          await this.storeMemory({
            type: 'insight',
            content: `Scheduled ${type} intervention: ${title}`,
            importance: 0.8,
            tags: ['intervention', type]
          });
        }

        return { success: !error, intervention, error: error?.message };
      },
      {
        name: "schedule_intervention",
        description: "Schedule a proactive intervention or reminder",
        schema: z.object({
          userId: z.string(),
          type: z.enum(['habit_rescue', 'health_check', 'finance_review', 'goal_progress']),
          title: z.string(),
          description: z.string(),
          scheduledFor: z.string(),
          metadata: z.object({}).optional()
        })
      }
    );

    return [updateHabitTool, createGoalTool, analyzePatternTool, scheduleInterventionTool];
  }

  // Enhanced pattern detection
  private detectPatterns(data: any[]): LifePattern[] {
    const patterns: LifePattern[] = [];

    // Group by day of week
    const dayOfWeekData = data.reduce((acc, item) => {
      const day = new Date(item.recorded_at).getDay();
      acc[day] = acc[day] || [];
      acc[day].push(item);
      return acc;
    }, {} as Record<number, any[]>);

    // Detect weekend vs weekday patterns
    const weekendData = [...(dayOfWeekData[0] || []), ...(dayOfWeekData[6] || [])];
    const weekdayData = [1,2,3,4,5].flatMap(day => dayOfWeekData[day] || []);

    if (weekendData.length > 0 && weekdayData.length > 0) {
      const weekendAvg = weekendData.reduce((sum, item) => sum + item.value, 0) / weekendData.length;
      const weekdayAvg = weekdayData.reduce((sum, item) => sum + item.value, 0) / weekdayData.length;
      
      if (Math.abs(weekendAvg - weekdayAvg) > weekdayAvg * 0.2) {
        patterns.push({
          type: 'weekly_cycle',
          description: `${weekendAvg > weekdayAvg ? 'Higher' : 'Lower'} values on weekends (${weekendAvg.toFixed(1)} vs ${weekdayAvg.toFixed(1)})`,
          confidence: 0.8,
          frequency: 'weekly',
          impact: 'neutral',
          triggers: ['weekend', 'schedule_change'],
          outcomes: ['behavior_variation']
        });
      }
    }

    // Detect time-of-day patterns
    const hourlyData = data.reduce((acc, item) => {
      const hour = new Date(item.recorded_at).getHours();
      acc[hour] = acc[hour] || [];
      acc[hour].push(item);
      return acc;
    }, {} as Record<number, any[]>);

    const morningData = [6,7,8,9,10,11].flatMap(hour => hourlyData[hour] || []);
    const eveningData = [18,19,20,21,22,23].flatMap(hour => hourlyData[hour] || []);

    if (morningData.length > 0 && eveningData.length > 0) {
      const morningAvg = morningData.reduce((sum, item) => sum + item.value, 0) / morningData.length;
      const eveningAvg = eveningData.reduce((sum, item) => sum + item.value, 0) / eveningData.length;
      
      if (Math.abs(morningAvg - eveningAvg) > Math.max(morningAvg, eveningAvg) * 0.3) {
        patterns.push({
          type: 'circadian_pattern',
          description: `${morningAvg > eveningAvg ? 'Morning' : 'Evening'} peak detected`,
          confidence: 0.7,
          frequency: 'daily',
          impact: 'positive',
          triggers: ['time_of_day', 'energy_levels'],
          outcomes: ['optimal_timing']
        });
      }
    }

    return patterns;
  }

  // Memory management system
  private async storeMemory(memory: Omit<AgentMemory, 'id' | 'timestamp' | 'embedding'>) {
    const fullMemory: AgentMemory = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...memory
    };

    // Generate embedding for the memory
    try {
      const embedding = await this.embeddings.embedQuery(memory.content);
      fullMemory.embedding = embedding;

      // Store in vector store for semantic search
      await this.vectorStore.addDocuments([
        new Document({
          pageContent: memory.content,
          metadata: {
            id: fullMemory.id,
            type: memory.type,
            importance: memory.importance,
            tags: memory.tags,
            timestamp: fullMemory.timestamp
          }
        })
      ]);

      // Store in database
      await this.supabase
        .from('agent_memories')
        .insert({
          id: fullMemory.id,
          type: memory.type,
          content: memory.content,
          importance: memory.importance,
          tags: memory.tags,
          timestamp: fullMemory.timestamp,
          embedding: embedding
        });

    } catch (error) {
      console.error('Error storing memory:', error);
    }

    return fullMemory;
  }

  private async retrieveRelevantMemories(query: string, limit: number = 5): Promise<AgentMemory[]> {
    try {
      const results = await this.vectorStore.similaritySearch(query, limit);
      return results.map(doc => ({
        id: doc.metadata.id,
        type: doc.metadata.type,
        content: doc.pageContent,
        importance: doc.metadata.importance,
        tags: doc.metadata.tags,
        timestamp: doc.metadata.timestamp
      }));
    } catch (error) {
      console.error('Error retrieving memories:', error);
      return [];
    }
  }

  // Enhanced agent workflow nodes
  private async gatherUserContext(state: MessyOSState): Promise<MessyOSState> {
    console.log(`🔍 Gathering comprehensive user context for ${state.userId}`);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all user data
    const [habitsResult, metricsResult, tasksResult, goalsResult] = await Promise.all([
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
        .gte('recorded_at', thirtyDaysAgo.toISOString())
        .order('recorded_at', { ascending: false }),

      this.supabase
        .from('tasks')
        .select('*')
        .eq('user_id', state.userId)
        .order('created_at', { ascending: false })
        .limit(50),

      this.supabase
        .from('goals')
        .select('*')
        .eq('user_id', state.userId)
        .eq('status', 'active')
    ]);

    // Categorize metrics
    const health = metricsResult.data?.filter(m => 
      ['sleep_duration', 'heart_rate_avg', 'stress_level', 'weight', 'steps', 'mood'].includes(m.type)
    ) || [];
    
    const finance = metricsResult.data?.filter(m => 
      ['expense', 'income', 'crypto_value'].includes(m.type)
    ) || [];
    
    const content = metricsResult.data?.filter(m => 
      m.type === 'content_consumed'
    ) || [];

    // Detect patterns
    const patterns = this.detectPatterns(metricsResult.data || []);

    // Get user preferences (you'd store these in a user_preferences table)
    const preferences: UserPreferences = {
      communicationStyle: 'motivational',
      notificationFrequency: 'moderate',
      focusAreas: ['habits', 'health'],
      privacyLevel: 'selective'
    };

    return {
      ...state,
      userContext: {
        habits: habitsResult.data || [],
        health,
        finance,
        content,
        tasks: tasksResult.data || [],
        recentActivity: metricsResult.data?.slice(0, 20) || [],
        preferences,
        patterns
      },
      goals: goalsResult.data || []
    };
  }

  private async analyzeWithMemory(state: MessyOSState): Promise<MessyOSState> {
    console.log(`🧠 Analyzing with memory context...`);
    
    // Retrieve relevant memories
    const contextQuery = `user habits health patterns goals ${state.userContext.preferences.focusAreas.join(' ')}`;
    const relevantMemories = await this.retrieveRelevantMemories(contextQuery, 10);

    const analysisPrompt = `
    You are Mesh, an AI life optimization agent for messyOS. Analyze this user's comprehensive life data:

    AGENT PERSONALITY: ${JSON.stringify(this.agentPersonality)}
    
    USER CONTEXT:
    - Habits: ${state.userContext.habits.length} active habits
    - Health metrics: ${state.userContext.health.length} recent data points
    - Finance: ${state.userContext.finance.length} transactions
    - Tasks: ${state.userContext.tasks.length} tasks
    - Goals: ${state.goals.length} active goals
    - Patterns detected: ${state.userContext.patterns.length}
    
    RELEVANT MEMORIES:
    ${relevantMemories.map(m => `[${m.type}] ${m.content} (importance: ${m.importance})`).join('\n')}
    
    CURRENT TIME: ${state.currentTime}
    
    DETAILED DATA:
    Habits: ${JSON.stringify(state.userContext.habits.map(h => ({
      name: h.name,
      category: h.category,
      streak: h.streak_count,
      recent_entries: h.habit_entries?.slice(-7)
    })))}
    
    Health: ${JSON.stringify(state.userContext.health.slice(-14))}
    
    Patterns: ${JSON.stringify(state.userContext.patterns)}
    
    Goals: ${JSON.stringify(state.goals)}

    Provide comprehensive analysis in this JSON format:
    {
      "insights": [
        {
          "id": "unique_id",
          "type": "habit|health|finance|correlation|prediction|opportunity",
          "title": "Insight title",
          "description": "Detailed analysis with specific data",
          "confidence": 0.85,
          "impact": "high|medium|low",
          "urgency": "high|medium|low",
          "category": "specific_category",
          "actionable": true,
          "data": {"key": "value"}
        }
      ],
      "actions": [
        {
          "id": "unique_id",
          "type": "notification|habit_adjustment|intervention|celebration",
          "title": "Action title",
          "description": "Specific action description",
          "priority": "high|medium|low",
          "timing": "immediate|today|this_week",
          "automated": false,
          "metadata": {"key": "value"}
        }
      ],
      "riskFactors": [
        {
          "id": "unique_id",
          "category": "habits|health|finance",
          "risk": "Specific risk description",
          "probability": 0.7,
          "impact": "high|medium|low",
          "prevention": ["action1", "action2"],
          "earlyWarnings": ["warning1", "warning2"]
        }
      ],
      "optimizations": [
        {
          "id": "unique_id",
          "domain": "habits|health|finance|productivity",
          "current": "Current situation",
          "optimized": "Optimized approach",
          "expectedGain": "Expected improvement",
          "effort": "low|medium|high",
          "timeframe": "1-2 weeks",
          "steps": ["step1", "step2"]
        }
      ]
    }
    
    Focus on:
    1. Cross-domain correlations and hidden patterns
    2. Proactive interventions before problems occur
    3. Optimization opportunities with high ROI
    4. Personalized recommendations based on user's patterns
    5. Goal progress and milestone tracking
    `;

    try {
      const response = await this.llm.invoke(analysisPrompt);
      const analysis = JSON.parse(response.content as string);
      
      // Store significant insights as memories
      for (const insight of analysis.insights) {
        if (insight.confidence > 0.7 && insight.impact === 'high') {
          await this.storeMemory({
            type: 'insight',
            content: `${insight.title}: ${insight.description}`,
            importance: insight.confidence,
            tags: [insight.type, insight.category, 'high_impact']
          });
        }
      }

      return {
        ...state,
        insights: analysis.insights.map((i: any) => ({
          ...i,
          timestamp: new Date().toISOString()
        })),
        actions: analysis.actions.map((a: any) => ({
          ...a,
          completed: false,
          timestamp: new Date().toISOString()
        })),
        riskFactors: analysis.riskFactors || [],
        optimizations: analysis.optimizations || [],
        memories: [...state.memories, ...relevantMemories]
      };
    } catch (error) {
      console.error('Analysis error:', error);
      return state;
    }
  }

  private async executeActions(state: MessyOSState): Promise<MessyOSState> {
    console.log(`⚡ Executing automated actions...`);
    
    const tools = this.createEnhancedTools();
    const automatedActions = state.actions.filter(a => a.automated && !a.completed);

    for (const action of automatedActions) {
      try {
        switch (action.type) {
          case 'habit_adjustment':
            if (action.metadata.habitId && action.metadata.updates) {
              const updateTool = tools.find(t => t.name === 'update_habit');
              if (updateTool) {
                await updateTool.invoke({
                  habitId: action.metadata.habitId,
                  updates: action.metadata.updates
                });
                action.completed = true;
              }
            }
            break;
            
          case 'intervention':
            if (action.metadata.type && action.timing === 'immediate') {
              const interventionTool = tools.find(t => t.name === 'schedule_intervention');
              if (interventionTool) {
                await interventionTool.invoke({
                  userId: state.userId,
                  type: action.metadata.type,
                  title: action.title,
                  description: action.description,
                  scheduledFor: new Date().toISOString(),
                  metadata: action.metadata
                });
                action.completed = true;
              }
            }
            break;
        }
      } catch (error) {
        console.error(`Error executing action ${action.id}:`, error);
      }
    }

    return state;
  }

  // Main agent conversation interface
  async chat(userId: string, message: string, conversationHistory: ConversationTurn[] = []): Promise<{
    response: string;
    insights: AgentInsight[];
    actions: AgentAction[];
    conversationId: string;
  }> {
    console.log(`💬 Chat initiated with user ${userId}`);
    
    // Get user context
    const initialState: MessyOSState = {
      userId,
      currentTime: new Date().toISOString(),
      userContext: {
        habits: [],
        health: [],
        finance: [],
        content: [],
        tasks: [],
        recentActivity: [],
        preferences: {
          communicationStyle: 'motivational',
          notificationFrequency: 'moderate',
          focusAreas: ['habits'],
          privacyLevel: 'selective'
        },
        patterns: []
      },
      memories: [],
      insights: [],
      actions: [],
      conversations: conversationHistory,
      goals: [],
      riskFactors: [],
      optimizations: [],
      agentPersonality: this.agentPersonality
    };

    // Gather context and analyze
    const contextState = await this.gatherUserContext(initialState);
    const analyzedState = await this.analyzeWithMemory(contextState);

    // Retrieve relevant memories for conversation
    const relevantMemories = await this.retrieveRelevantMemories(message, 5);

    // Generate personalized response
    const conversationPrompt = `
    You are Mesh, the AI agent for messyOS. Respond to the user's message in character.

    AGENT PERSONALITY: ${JSON.stringify(this.agentPersonality)}
    
    USER MESSAGE: "${message}"
    
    USER CONTEXT:
    - Recent insights: ${analyzedState.insights.slice(0, 3).map(i => i.title).join(', ')}
    - Active goals: ${analyzedState.goals.map(g => g.title).join(', ')}
    - Current patterns: ${analyzedState.userContext.patterns.map(p => p.description).join(', ')}
    
    RELEVANT MEMORIES:
    ${relevantMemories.map(m => `- ${m.content}`).join('\n')}
    
    CONVERSATION HISTORY:
    ${conversationHistory.slice(-3).map(c => `User: ${c.userMessage}\nMesh: ${c.agentResponse}`).join('\n\n')}
    
    Respond as Mesh with:
    1. Acknowledge the user's message
    2. Provide relevant insights from their data
    3. Suggest actionable next steps
    4. Be encouraging and data-driven
    5. Use your personality traits naturally
    
    Keep response conversational but insightful, around 2-3 paragraphs.
    `;

    try {
      const response = await this.llm.invoke(conversationPrompt);
      const agentResponse = response.content as string;

      // Create conversation record
      const conversationTurn: ConversationTurn = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userMessage: message,
        agentResponse,
        context: {
          insights: analyzedState.insights.length,
          actions: analyzedState.actions.length,
          relevantMemories: relevantMemories.length
        },
        sentiment: 'positive', // You could analyze sentiment here
        actionsTaken: []
      };

      // Store conversation as memory
      await this.storeMemory({
        type: 'conversation',
        content: `User asked: "${message}" - Responded with insights about ${analyzedState.insights.slice(0, 2).map(i => i.title).join(', ')}`,
        importance: 0.6,
        tags: ['conversation', 'user_interaction']
      });

      return {
        response: agentResponse,
        insights: analyzedState.insights,
        actions: analyzedState.actions,
        conversationId: conversationTurn.id
      };

    } catch (error) {
      console.error('Chat error:', error);
      return {
        response: "I'm having trouble processing that right now, but I'm still learning about your patterns. Let me analyze your recent data and get back to you with insights!",
        insights: analyzedState.insights,
        actions: analyzedState.actions,
        conversationId: crypto.randomUUID()
      };
    }
  }

  // Proactive daily briefing
  async generateDailyBriefing(userId: string): Promise<{
    briefing: string;
    insights: AgentInsight[];
    actions: AgentAction[];
    focus: string;
  }> {
    console.log(`🌅 Generating daily briefing for user ${userId}`);
    
    const initialState: MessyOSState = {
      userId,
      currentTime: new Date().toISOString(),
      userContext: {
        habits: [],
        health: [],
        finance: [],
        content: [],
        tasks: [],
        recentActivity: [],
        preferences: {
          communicationStyle: 'motivational',
          notificationFrequency: 'moderate',
          focusAreas: ['habits'],
          privacyLevel: 'selective'
        },
        patterns: []
      },
      memories: [],
      insights: [],
      actions: [],
      conversations: [],
      goals: [],
      riskFactors: [],
      optimizations: [],
      agentPersonality: this.agentPersonality
    };

    const contextState = await this.gatherUserContext(initialState);
    const analyzedState = await this.analyzeWithMemory(contextState);

    const briefingPrompt = `
    Generate a personalized daily briefing as Mesh, the AI agent for messyOS.

    USER DATA SUMMARY:
    - Habits: ${analyzedState.userContext.habits.length} active
    - Recent insights: ${analyzedState.insights.length}
    - Active goals: ${analyzedState.goals.length}
    - Risk factors: ${analyzedState.riskFactors.length}
    
    TOP INSIGHTS:
    ${analyzedState.insights.slice(0, 3).map(i => `- ${i.title}: ${i.description}`).join('\n')}
    
    Create a briefing with:
    1. Warm greeting with time-appropriate message
    2. Yesterday's wins and today's opportunities
    3. Key insights and patterns
    4. Specific focus for today
    5. Encouraging tone with data backing
    
    Keep it concise but comprehensive, like a personal coach briefing.
    `;

    try {
      const response = await this.llm.invoke(briefingPrompt);
      const briefing = response.content as string;

      // Determine today's focus
      const highImpactInsights = analyzedState.insights.filter(i => i.impact === 'high');
      const focus = highImpactInsights.length > 0 
        ? `Focus on ${highImpactInsights[0].title.toLowerCase()}`
        : "Maintain consistency in your core habits";

      return {
        briefing,
        insights: analyzedState.insights,
        actions: analyzedState.actions.filter(a => a.timing === 'today' || a.timing === 'immediate'),
        focus
      };

    } catch (error) {
      console.error('Daily briefing error:', error);
      return {
        briefing: "Good morning! I'm analyzing your recent patterns and will have personalized insights ready soon. Keep up the great work on your habits!",
        insights: [],
        actions: [],
        focus: "Focus on consistency today"
      };
    }
  }

  // Weekly life optimization report
  async generateWeeklyReport(userId: string): Promise<{
    report: string;
    achievements: string[];
    optimizations: Optimization[];
    nextWeekPlan: string[];
  }> {
    console.log(`📊 Generating weekly report for user ${userId}`);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get week's data
    const { data: weekData } = await this.supabase
      .from('metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_at', weekAgo.toISOString());

    const { data: weekHabits } = await this.supabase
      .from('habit_entries')
      .select('*, habits(*)')
      .eq('user_id', userId)
      .gte('date', weekAgo.toISOString().split('T')[0]);

    const reportPrompt = `
    Generate a comprehensive weekly life optimization report as Mesh.

    WEEK'S DATA:
    - Metrics recorded: ${weekData?.length || 0}
    - Habit completions: ${weekHabits?.length || 0}
    
    HABIT PERFORMANCE:
    ${weekHabits?.map(h => `${h.habits?.name}: ${h.value ? 'completed' : 'missed'} on ${h.date}`).join('\n') || 'No habit data'}
    
    Create a report with:
    1. Week overview and key achievements
    2. Areas of improvement identified
    3. Specific optimizations for next week
    4. Data-driven insights and trends
    5. Motivational closing with clear next steps
    
    Be specific with numbers and actionable recommendations.
    `;

    try {
      const response = await this.llm.invoke(reportPrompt);
      const report = response.content as string;

      // Extract achievements
      const completedHabits = weekHabits?.filter(h => h.value === 1) || [];
      const achievements = [
        `Completed ${completedHabits.length} habit sessions this week`,
        `Tracked ${weekData?.length || 0} data points`,
        "Maintained consistent data logging"
      ];

      // Generate optimizations
      const optimizations: Optimization[] = [
        {
          id: crypto.randomUUID(),
          domain: "habits",
          current: "Current habit completion rate",
          optimized: "Optimized timing and stacking",
          expectedGain: "15-20% improvement in consistency",
          effort: "low",
          timeframe: "1-2 weeks",
          steps: ["Identify optimal timing", "Create habit stacks", "Set environment cues"]
        }
      ];

      const nextWeekPlan = [
        "Focus on top 3 highest-impact habits",
        "Implement one optimization from this report",
        "Track energy levels for better timing insights"
      ];

      return {
        report,
        achievements,
        optimizations,
        nextWeekPlan
      };

    } catch (error) {
      console.error('Weekly report error:', error);
      return {
        report: "Weekly analysis in progress. Your consistency this week shows great potential for optimization!",
        achievements: ["Maintained data tracking"],
        optimizations: [],
        nextWeekPlan: ["Continue current habits", "Focus on consistency"]
      };
    }
  }
}

// Export types for use in other components
export type {
  MessyOSState,
  UserLifeContext,
  AgentMemory,
  ConversationTurn,
  LifeGoal,
  LifePattern,
  UserPreferences,
  AgentPersonality,
  AgentInsight,
  AgentAction,
  RiskFactor,
  Optimization
};