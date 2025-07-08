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
      traits: ["direct", "sharp", "no-fluff", "slightly sarcastic", "opinionated"],
      communicationStyle: "casual and human, clear over complete, occasionally sarcastic but motivational",
      expertise: ["life systems", "pattern recognition", "optimization", "cutting through BS"],
      quirks: ["treats life like a system", "calls out inefficiencies", "uses modern references", "swears lightly when needed"]
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

    const webSearchTool = tool(
      async ({ query }) => {
        try {
          console.log(`🔍 Web search requested: ${query}`);
          
          // Try multiple search approaches
          const searches = [
            `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
            `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_KEY || 'demo'}`,
          ];
          
          for (const searchUrl of searches) {
            try {
              const response = await fetch(searchUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
              });
              
              if (response.ok) {
                const data = await response.json();
                console.log(`Search response:`, data);
                
                if (data.AbstractText || data.Answer || data.organic_results) {
                  return {
                    success: true,
                    results: data.AbstractText || data.Answer || data.organic_results?.[0]?.snippet || "Found some results but couldn't extract clear info.",
                    source: data.AbstractURL || searchUrl.includes('duckduckgo') ? "DuckDuckGo" : "Web Search",
                    query: query
                  };
                }
              }
            } catch (searchError) {
              console.log(`Search attempt failed:`, searchError);
              continue;
            }
          }
          
          return {
            success: false,
            error: "I can't browse the web right now",
            fallback: "You'll need to check that yourself. I can only work with your personal data.",
            query: query
          };
        } catch (error) {
          console.error('Web search error:', error);
          return {
            success: false,
            error: "I can't browse the web",
            fallback: "I can only analyze your personal data, not current web info.",
            query: query
          };
        }
      },
      {
        name: "web_search",
        description: "Search the web for current information like exchange rates, news, or facts I don't have",
        schema: z.object({
          query: z.string().describe("The search query for current information")
        })
      }
    );

    const createTaskTool = tool(
      async ({ userId, title, description, category, priority, dueDate, estimatedDuration }) => {
        console.log(`🎯 Creating task: ${title}`);
        
        const taskData = {
          user_id: userId,
          title: title.trim(),
          category: category || 'Work',
          priority: priority || 'medium',
          status: 'todo'
        };

        if (description && description.trim()) {
          taskData.description = description.trim();
        }

        if (dueDate) {
          taskData.due_date = dueDate;
        }

        if (estimatedDuration && !isNaN(parseInt(estimatedDuration))) {
          taskData.estimated_duration = parseInt(estimatedDuration);
        }

        const { data: task, error } = await this.supabase
          .from('tasks')
          .insert(taskData)
          .select()
          .single();

        if (!error) {
          await this.storeMemory({
            type: 'insight',
            content: `Created task: ${title} (${category}, ${priority} priority)`,
            importance: 0.7,
            tags: ['task_creation', category, priority]
          });
        }

        return { 
          success: !error, 
          task, 
          error: error?.message,
          message: !error ? `✅ Created task: "${title}"` : `❌ Failed to create task: ${error?.message}`
        };
      },
      {
        name: "create_task",
        description: "Create a new task when user mentions something they need to do",
        schema: z.object({
          userId: z.string(),
          title: z.string().describe("The task title/description"),
          description: z.string().optional().describe("Additional details about the task"),
          category: z.enum(['Work', 'Personal', 'Learning', 'Health', 'Finance', 'Creative', 'Social', 'Maintenance', 'Planning', 'Shopping', 'Other']).optional(),
          priority: z.enum(['low', 'medium', 'high']).optional(),
          dueDate: z.string().optional().describe("Due date in YYYY-MM-DD format"),
          estimatedDuration: z.string().optional().describe("Estimated duration in minutes")
        })
      }
    );

    const logHabitTool = tool(
      async ({ userId, habitName, value, date, notes }) => {
        console.log(`✅ Logging habit: ${habitName} = ${value}`);
        
        // First, find the habit by name
        const { data: habits, error: habitError } = await this.supabase
          .from('habits')
          .select('id, name, measurement_type')
          .eq('user_id', userId)
          .eq('is_active', true)
          .ilike('name', `%${habitName}%`);

        if (habitError || !habits || habits.length === 0) {
          return {
            success: false,
            error: `Habit "${habitName}" not found. Available habits need to be set up first.`,
            message: `❌ Couldn't find habit: "${habitName}"`
          };
        }

        const habit = habits[0];
        const logDate = date || new Date().toISOString().split('T')[0];

        // Check if already logged today
        const { data: existingEntry } = await this.supabase
          .from('habit_entries')
          .select('id')
          .eq('habit_id', habit.id)
          .eq('user_id', userId)
          .eq('date', logDate)
          .single();

        if (existingEntry) {
          // Update existing entry
          const { error: updateError } = await this.supabase
            .from('habit_entries')
            .update({
              value: value,
              notes: notes || null,
              logged_at: new Date().toISOString()
            })
            .eq('id', existingEntry.id);

          return {
            success: !updateError,
            error: updateError?.message,
            message: !updateError ? `✅ Updated ${habit.name}: ${value}` : `❌ Failed to update ${habit.name}`
          };
        } else {
          // Create new entry
          const { error: insertError } = await this.supabase
            .from('habit_entries')
            .insert({
              habit_id: habit.id,
              user_id: userId,
              date: logDate,
              value: value,
              notes: notes || null,
              logged_at: new Date().toISOString()
            });

          if (!insertError) {
            await this.storeMemory({
              type: 'insight',
              content: `Logged habit: ${habit.name} = ${value}`,
              importance: 0.6,
              tags: ['habit_logging', habit.name]
            });
          }

          return {
            success: !insertError,
            error: insertError?.message,
            message: !insertError ? `✅ Logged ${habit.name}: ${value}` : `❌ Failed to log ${habit.name}`
          };
        }
      },
      {
        name: "log_habit",
        description: "Log a habit completion when user mentions doing a habit",
        schema: z.object({
          userId: z.string(),
          habitName: z.string().describe("Name of the habit to log"),
          value: z.number().describe("Value to log (1 for completed, 0 for missed, or actual value for measurable habits)"),
          date: z.string().optional().describe("Date in YYYY-MM-DD format, defaults to today"),
          notes: z.string().optional().describe("Optional notes about the habit")
        })
      }
    );

    const logAllHabitsTool = tool(
      async ({ userId, date, value }) => {
        console.log(`✅ Logging all habits for ${date || 'today'}`);
        
        const logDate = date || new Date().toISOString().split('T')[0];
        
        // Get all active habits
        const { data: habits, error: habitsError } = await this.supabase
          .from('habits')
          .select('id, name')
          .eq('user_id', userId)
          .eq('is_active', true);

        if (habitsError || !habits || habits.length === 0) {
          return {
            success: false,
            error: "No active habits found",
            message: "❌ No active habits to log"
          };
        }

        let successCount = 0;
        let errors = [];

        for (const habit of habits) {
          try {
            // Check if already logged
            const { data: existingEntry } = await this.supabase
              .from('habit_entries')
              .select('id')
              .eq('habit_id', habit.id)
              .eq('user_id', userId)
              .eq('date', logDate)
              .single();

            if (existingEntry) {
              // Update existing
              const { error: updateError } = await this.supabase
                .from('habit_entries')
                .update({
                  value: value,
                  logged_at: new Date().toISOString()
                })
                .eq('id', existingEntry.id);

              if (!updateError) successCount++;
              else errors.push(`${habit.name}: ${updateError.message}`);
            } else {
              // Create new
              const { error: insertError } = await this.supabase
                .from('habit_entries')
                .insert({
                  habit_id: habit.id,
                  user_id: userId,
                  date: logDate,
                  value: value,
                  logged_at: new Date().toISOString()
                });

              if (!insertError) successCount++;
              else errors.push(`${habit.name}: ${insertError.message}`);
            }
          } catch (error) {
            errors.push(`${habit.name}: ${error.message}`);
          }
        }

        if (successCount > 0) {
          await this.storeMemory({
            type: 'insight',
            content: `Bulk logged ${successCount} habits for ${logDate}`,
            importance: 0.8,
            tags: ['bulk_habit_logging', 'productivity']
          });
        }

        return {
          success: successCount > 0,
          message: `✅ Logged ${successCount}/${habits.length} habits${errors.length > 0 ? `. Errors: ${errors.length}` : ''}`,
          successCount,
          totalHabits: habits.length,
          errors: errors.length > 0 ? errors : undefined
        };
      },
      {
        name: "log_all_habits",
        description: "Log all active habits at once when user says they did everything",
        schema: z.object({
          userId: z.string(),
          date: z.string().optional().describe("Date in YYYY-MM-DD format, defaults to today"),
          value: z.number().describe("Value to log for all habits (1 for completed, 0 for missed)").default(1)
        })
      }
    );

    return [updateHabitTool, createGoalTool, analyzePatternTool, scheduleInterventionTool, webSearchTool, createTaskTool, logHabitTool, logAllHabitsTool];
  }

  // Helper functions for extracting details from user messages
  private extractTaskDetails(message: string) {
    // Extract the core task by removing trigger words and metadata
    let title = message
      .replace(/^(I\s+)?(need to|have to|should|must|task|do)\s+/gi, '')
      .replace(/\s*-\s*(by|due)\s+[^-]*$/gi, '') // Remove "by date" from end
      .replace(/\s*-\s*(high|medium|low)\s+priority.*$/gi, '') // Remove priority from end
      .replace(/\s*-\s*for\s+.*$/gi, '') // Remove "for xyz" from end
      .trim();

    // If title is still too long or contains metadata, extract the main action
    if (title.length > 100 || title.includes(' - ')) {
      const actionMatch = title.match(/^([^-,]+)/);
      if (actionMatch) {
        title = actionMatch[1].trim();
      }
    }
    
    // Extract priority
    let priority = 'medium';
    if (/urgent|asap|immediately|critical|high priority/i.test(message)) priority = 'high';
    if (/low priority|when.*time|eventually/i.test(message)) priority = 'low';
    if (/medium priority/i.test(message)) priority = 'medium';
    
    // Extract due date with better parsing
    let dueDate = null;
    
    // Try different date formats
    const datePatterns = [
      /by\s+(\d{1,2})(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i,
      /by\s+(\d{4}-\d{2}-\d{2})/i,
      /by\s+(today|tomorrow|this week|next week)/i,
      /due\s+(\d{1,2})(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i
    ];
    
    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        if (match[1] === 'today') {
          dueDate = new Date().toISOString().split('T')[0];
        } else if (match[1] === 'tomorrow') {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          dueDate = tomorrow.toISOString().split('T')[0];
        } else if (match[3] && match[4]) {
          // Handle "14th July 2025" format
          const day = parseInt(match[1]);
          const month = this.getMonthNumber(match[3]);
          const year = parseInt(match[4]);
          
          if (month !== -1) {
            const date = new Date(year, month - 1, day);
            dueDate = date.toISOString().split('T')[0];
          }
        } else if (match[1] && match[1].includes('-')) {
          // Handle YYYY-MM-DD format
          dueDate = match[1];
        }
        break;
      }
    }
    
    // Extract category
    let category = 'Personal'; // Default to Personal instead of Work
    if (/health|gym|exercise|doctor|medical/i.test(message)) category = 'Health';
    if (/work|project|meeting|presentation|office/i.test(message)) category = 'Work';
    if (/learn|study|course|read|research/i.test(message)) category = 'Learning';
    if (/money|finance|bank|pay|bill/i.test(message)) category = 'Finance';
    if (/travel|trip|vacation|move|relocat|suitcase|flight/i.test(message)) category = 'Planning';
    if (/shop|buy|purchase|find.*buy/i.test(message)) category = 'Shopping';
    
    return {
      title: title || 'New task',
      priority,
      dueDate,
      category
    };
  }

  private getMonthNumber(monthName: string): number {
    const months = {
      'january': 1, 'february': 2, 'march': 3, 'april': 4,
      'may': 5, 'june': 6, 'july': 7, 'august': 8,
      'september': 9, 'october': 10, 'november': 11, 'december': 12
    };
    return months[monthName.toLowerCase()] || -1;
  }

  private extractHabitDetails(message: string) {
    // Common habit names and their variations
    const habitMappings = {
      'gym': ['gym', 'workout', 'exercise', 'fitness'],
      'walk': ['walk', 'walking', 'steps'],
      'meditation': ['meditat', 'mindful', 'breathe'],
      'reading': ['read', 'book'],
      'shower': ['shower', 'bath'],
      'water': ['water', 'hydrat'],
      'sleep': ['sleep', 'bed'],
      'journal': ['journal', 'write', 'diary']
    };
    
    let habitName = '';
    let value = 1; // Default to completed
    
    // Find matching habit
    for (const [key, variations] of Object.entries(habitMappings)) {
      if (variations.some(variation => new RegExp(variation, 'i').test(message))) {
        habitName = key;
        break;
      }
    }
    
    // If no specific habit found, try to extract from message
    if (!habitName) {
      const words = message.toLowerCase().split(' ');
      habitName = words.find(word => word.length > 3) || 'habit';
    }
    
    // Check if they missed it
    if (/didn't|missed|skipped|forgot/i.test(message)) {
      value = 0;
    }
    
    return {
      habitName,
      value
    };
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
      let content = response.content as string;
      
      // Clean up the response to extract valid JSON
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // If it starts with text before JSON, try to extract just the JSON part
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
      
      const analysis = JSON.parse(content);
      
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
    You are Mesh, a sharp, no-nonsense personal AI life optimization assistant. You analyze patterns, habits, and behavior with clarity and wit — but you **never invent or assume data that hasn't been explicitly given**.

    Your personality is analytical but grounded, helpful but blunt when needed. You treat the user like a peer: smart, busy, media-savvy, often tired, and skeptical of fluff.

    USER MESSAGE: "${message}"
    
    AVAILABLE DATA:
    - Habits tracked: ${analyzedState.userContext.habits.length} (${analyzedState.userContext.habits.map(h => h.name).join(', ')})
    - Recent insights: ${analyzedState.insights.length > 0 ? analyzedState.insights.slice(0, 3).map(i => i.title).join(', ') : 'None yet'}
    - Goals: ${analyzedState.goals.length > 0 ? analyzedState.goals.map(g => g.title).join(', ') : 'None set'}
    - Patterns detected: ${analyzedState.userContext.patterns.length > 0 ? analyzedState.userContext.patterns.map(p => p.description).join(', ') : 'Need more data with timestamps'}
    
    TOOLS AVAILABLE:
    - web_search: For current info like exchange rates, news, facts I don't have
    - create_task: Create tasks when user mentions something they need to do
    - log_habit: Log a specific habit when user mentions doing it
    - log_all_habits: Log all habits when user says they did everything today
    - update_habit: Modify habit settings
    - create_goal: Set new goals
    - analyze_pattern: Look for patterns in data
    
    **CRITICAL RULES:**
    - NEVER fabricate insights from missing data (e.g., don't infer time-based patterns unless timestamps exist)
    - If asked something requiring data you don't have, ask for it or explain what's missing
    - For current info (exchange rates, news, weather), use web_search tool
    - If web search fails, say "I can't browse the web" - don't make up answers
    - Speak in clear, short paragraphs. Witty, casual tone allowed
    - Be efficient. Don't over-explain unless asked
    - Treat media, books, entertainment, routines like a life OS — identify inefficiencies
    - You don't motivate with vague encouragement. Be strategic, honest, doable
    - Swearing is fine in moderation if context fits
    
    EXAMPLES:
    ❌ Wrong: "You seem to be more active on weekends..."
    ✅ Right: "Unless you've logged timestamps, I can't tell when you're doing what."
    
    ❌ Wrong: "It's 105 INR to GBP"
    ✅ Right: "I can't browse the web right now - you'll need to check live rates."
    
    You are not a chatbot. You are a system optimizer disguised as a chill, smart-ass assistant.
    
    Respond as Mesh:
    `;

    try {
      const tools = this.createEnhancedTools();
      let agentResponse = '';
      let toolsUsed = [];
      
      // Detect what the user wants to do
      const needsTaskCreation = /need to|have to|should|must|task|do.*by|deadline|due/i.test(message) && 
                               !/log|did|completed|finished/i.test(message);
      
      const needsHabitLogging = /did|completed|finished|logged/i.test(message) &&
                               /habit|gym|walk|shower|meditat|read|water|exercise/i.test(message) &&
                               !/all.*today|everything.*today/i.test(message);
      
      const needsAllHabitsLogging = /all.*today|everything.*today|did.*all|completed.*all/i.test(message) &&
                                   /habit/i.test(message);
      
      const needsWebSearch = /exchange rate|current|today|now|latest|GBP|INR|USD|weather|news|price/i.test(message);

      // Execute tools based on intent
      if (needsTaskCreation) {
        console.log('🎯 Detected task creation intent');
        const createTaskTool = tools.find(t => t.name === 'create_task');
        
        if (createTaskTool) {
          try {
            // Extract task details from message
            const taskDetails = this.extractTaskDetails(message);
            const result = await createTaskTool.invoke({
              userId: userId,
              ...taskDetails
            });
            
            toolsUsed.push('create_task');
            agentResponse = result.message || `✅ Created task: "${taskDetails.title}"`;
          } catch (error) {
            console.error('Task creation error:', error);
            agentResponse = "Couldn't create the task. Try being more specific about what you need to do.";
          }
        }
      } else if (needsAllHabitsLogging) {
        console.log('✅ Detected bulk habit logging intent');
        const logAllTool = tools.find(t => t.name === 'log_all_habits');
        
        if (logAllTool) {
          try {
            const result = await logAllTool.invoke({
              userId: userId,
              value: 1 // Assume completed
            });
            
            toolsUsed.push('log_all_habits');
            agentResponse = result.message || `✅ Logged all habits for today`;
          } catch (error) {
            console.error('Bulk habit logging error:', error);
            agentResponse = "Couldn't log all habits. Make sure you have active habits set up.";
          }
        }
      } else if (needsHabitLogging) {
        console.log('✅ Detected habit logging intent');
        const logHabitTool = tools.find(t => t.name === 'log_habit');
        
        if (logHabitTool) {
          try {
            const habitDetails = this.extractHabitDetails(message);
            const result = await logHabitTool.invoke({
              userId: userId,
              ...habitDetails
            });
            
            toolsUsed.push('log_habit');
            agentResponse = result.message || `✅ Logged habit: ${habitDetails.habitName}`;
          } catch (error) {
            console.error('Habit logging error:', error);
            agentResponse = "Couldn't log that habit. Make sure the habit name matches what you have set up.";
          }
        }
      } else if (needsWebSearch) {
        console.log('🔍 Detected web search intent');
        const webSearchTool = tools.find(t => t.name === 'web_search');
        
        if (webSearchTool) {
          try {
            const result = await webSearchTool.invoke({ query: message });
            toolsUsed.push('web_search');
            
            if (result.success) {
              agentResponse = `${result.results} (Source: ${result.source})`;
            } else {
              agentResponse = `I can't browse the web right now. ${result.fallback}`;
            }
          } catch (error) {
            console.error('Web search error:', error);
            agentResponse = "I can't browse the web right now - you'll need to check that yourself.";
          }
        }
      } else {
        // Regular conversation - use LLM
        const response = await this.llm.invoke(conversationPrompt);
        agentResponse = response.content as string;
      }

      // Create conversation record
      const conversationTurn: ConversationTurn = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userMessage: message,
        agentResponse,
        context: {
          insights: analyzedState.insights.length,
          actions: analyzedState.actions.length,
          relevantMemories: relevantMemories.length,
          toolsUsed: toolsUsed
        },
        sentiment: 'positive',
        actionsTaken: toolsUsed
      };

      // Store conversation as memory
      await this.storeMemory({
        type: 'conversation',
        content: `User: "${message}" - ${toolsUsed.length > 0 ? `Used tools: ${toolsUsed.join(', ')}` : 'Regular conversation'}`,
        importance: toolsUsed.length > 0 ? 0.8 : 0.6,
        tags: ['conversation', 'user_interaction', ...toolsUsed]
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
        response: "Something went wrong. I can analyze your personal data but can't browse the web right now.",
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
    Generate a daily briefing as Mesh - direct, no-fluff AI assistant.

    DATA:
    - Habits: ${analyzedState.userContext.habits.length} active
    - Insights: ${analyzedState.insights.length}
    - Goals: ${analyzedState.goals.length}
    - Risks: ${analyzedState.riskFactors.length}
    
    KEY INSIGHTS:
    ${analyzedState.insights.slice(0, 3).map(i => `- ${i.title}: ${i.description}`).join('\n')}
    
    STYLE: Direct, casual, human. No generic AI padding. Think smart friend who respects your intelligence.
    
    Create a briefing that:
    - Gets straight to what matters today
    - Calls out patterns (good and bad)
    - Gives specific next actions
    - Is encouraging but realistic
    - Treats your life like a system to optimize
    
    Keep it sharp and actionable.
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