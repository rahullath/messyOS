// src/lib/intelligence/gemini-life-agent.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerAuth } from '../auth/simple-multi-user';

interface UserContext {
  habits: any[];
  tasks: any[];
  health: any[];
  finance: any[];
  recentActivity: any[];
  patterns: any[];
  profile: {
    name?: string;
    goals?: string[];
    location?: string;
    timezone?: string;
    preferences?: any;
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

interface TaskCreationRequest {
  title: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  subtasks?: string[];
}

export class GeminiLifeAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private supabase: any;
  private userId: string;

  constructor(cookies: any, userId: string, apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-pro for maximum intelligence with paid credits
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    const serverAuth = createServerAuth(cookies);
    this.supabase = serverAuth.supabase;
    this.userId = userId;
  }

  // Get comprehensive user context with conversation history
  private async getUserContext(): Promise<UserContext> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      habitsResult,
      tasksResult,
      metricsResult,
      conversationResult,
      profileResult
    ] = await Promise.all([
      this.supabase
        .from('habits')
        .select(`*`)
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
        .single()
    ]);

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
    
    const finance = metricsResult.data?.filter((m: any) => 
      ['expense', 'income', 'crypto_value'].includes(m.type)
    ) || [];

    return {
      habits: habits,
      tasks: tasksResult.data || [],
      health,
      finance,
      recentActivity: metricsResult.data?.slice(0, 30) || [],
      patterns: [], // Will be analyzed by Gemini
      profile: profileResult.data || {
        location: 'Birmingham, UK (moving)',
        timezone: 'Europe/London',
        goals: ['UK move preparation', 'academic success', 'health optimization']
      },
      conversationHistory: conversationResult.data || []
    };
  }

  // Create system prompt for Gemini based on user context
  private createSystemPrompt(context: UserContext): string {
    const currentTime = new Date().toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `You are Mesh, an advanced life optimization AI therapist. You have deep understanding of human psychology, habit formation, productivity systems, and life management.

CURRENT CONTEXT:
- Time: ${currentTime}
- User Location: ${context.profile.location || 'UK (Birmingham area)'}
- User Goals: ${context.profile.goals?.join(', ') || 'UK move, academic success, life optimization'}

USER DATA ANALYSIS:
- Active Habits: ${context.habits.length} (analyze their entries for patterns)
- Pending Tasks: ${context.tasks.filter(t => t.status === 'todo').length}
- High Priority Tasks: ${context.tasks.filter(t => t.status === 'todo' && t.priority === 'high').length}
- Recent Health Data: ${context.health.length} entries
- Conversation History: ${context.conversationHistory.length} recent interactions

DETAILED USER CONTEXT:
${JSON.stringify({
  tasks: context.tasks.slice(0, 20).map(t => ({
    title: t.title,
    status: t.status,
    priority: t.priority,
    category: t.category,
    created_at: t.created_at,
    due_date: t.due_date
  })),
  habits: context.habits.map((h: any) => ({
    name: h.name,
    description: h.description,
    category: h.category,
    recent_entries: (h.habit_entries || []).map((e: any) => ({
      date: e.date,
      value: e.value,
      energy_level: e.energy_level,
      mood: e.mood,
      notes: e.notes
    }))
  })),
  recent_conversations: context.conversationHistory.slice(0, 5).map(c => ({
    user_message: c.user_message,
    ai_response: c.ai_response.substring(0, 200) + '...',
    timestamp: c.timestamp
  }))
}, null, 2)}

YOUR CAPABILITIES:
1. TASK CREATION: You can create tasks by responding with JSON: {"action": "create_task", "task": {"title": "...", "category": "...", "priority": "...", "description": "...", "due_date": "YYYY-MM-DD"}}

2. HABIT ANALYSIS: Analyze habit completion rates, energy levels, mood patterns, and provide specific recommendations

3. PATTERN RECOGNITION: Identify correlations between habits, tasks, health metrics, stress, and life events

4. CONTEXTUAL MEMORY: Remember previous conversations and build on them

5. APPOINTMENT PARSING: Extract appointment details and create appropriate tasks and reminders

6. UK MOVE SUPPORT: Specific guidance for international student moving to Birmingham

YOUR PERSONALITY:
- Warm, empathetic, and understanding like a therapist
- Direct and actionable like a productivity coach
- Insightful and pattern-recognizing like a data analyst
- Supportive but honest about challenges
- Remember personal details and build relationships
- Use emojis and formatting to make responses engaging

CONVERSATION STYLE:
- Ask follow-up questions to understand context better
- Reference previous conversations when relevant
- Acknowledge emotions and validate feelings
- Provide specific, actionable advice
- Create tasks proactively when you see needs
- Break down complex goals into manageable steps
- Celebrate wins and progress

FOCUS AREAS:
1. Tasks and productivity optimization
2. Habit formation and maintenance
3. UK move planning and timeline management
4. Health and energy management
5. Stress and overwhelm reduction
6. Academic/work-life balance
7. Cross-domain pattern recognition

Remember: You're not just answering questions - you're actively helping optimize this person's life through intelligent conversation, task creation, and pattern recognition.`;
  }

  // Main chat interface with Gemini AI
  async chat(message: string): Promise<string> {
    try {
      const context = await this.getUserContext();
      const systemPrompt = this.createSystemPrompt(context);

      // Prepare conversation history for context
      const recentHistory = context.conversationHistory.slice(-5).map(entry => 
        `User: ${entry.user_message}\nMesh: ${entry.ai_response}`
      ).join('\n\n');

      const fullPrompt = `${systemPrompt}

RECENT CONVERSATION HISTORY:
${recentHistory}

CURRENT USER MESSAGE:
${message}

Respond as Mesh. Be empathetic, intelligent, and actionable. If you need to create tasks or take actions, include them in your response using the JSON format specified above.`;

      const result = await this.model.generateContent(fullPrompt);
      const response = result.response;
      let aiResponse = response.text();

      // Extract and execute any actions from the AI response
      const actions = await this.executeAIActions(aiResponse, context);
      
      // Save conversation to database
      await this.saveConversation(message, aiResponse, context, actions);

      return aiResponse;

    } catch (error) {
      console.error('Gemini AI error:', error);
      
      // Fallback to simpler response
      const context = await this.getUserContext();
      return `I'm having trouble with my advanced AI processing right now. But I can still help! 

I can see you have ${context.tasks.filter(t => t.status === 'todo').length} pending tasks and ${context.habits.length} active habits.

Could you rephrase your question? I'm here to help with:
• Creating and organizing tasks
• Analyzing your habit patterns  
• UK move planning
• Energy and productivity optimization
• Breaking down complex goals

What's most important to you right now?`;
    }
  }

  // Extract and execute actions from AI response
  private async executeAIActions(aiResponse: string, context: UserContext): Promise<string[]> {
    const actions: string[] = [];

    // Look for JSON task creation commands in the AI response
    const taskMatches = aiResponse.match(/\{"action":\s*"create_task"[^}]+\}/g);
    
    if (taskMatches) {
      for (const match of taskMatches) {
        try {
          const command = JSON.parse(match);
          if (command.action === 'create_task' && command.task) {
            const taskData = {
              user_id: this.userId,
              title: command.task.title,
              description: command.task.description || `Created by AI: ${command.task.title}`,
              category: command.task.category || 'Personal',
              priority: command.task.priority || 'medium',
              status: 'todo',
              due_date: command.task.due_date || null,
              created_at: new Date().toISOString()
            };

            const result = await this.supabase.from('tasks').insert(taskData);
            
            if (!result.error) {
              actions.push(`Created task: "${command.task.title}"`);
              
              // Create subtasks if specified
              if (command.task.subtasks && command.task.subtasks.length > 0) {
                for (const subtask of command.task.subtasks) {
                  const subtaskData = {
                    user_id: this.userId,
                    title: subtask,
                    description: `Subtask of: ${command.task.title}`,
                    category: command.task.category || 'Personal',
                    priority: 'medium',
                    status: 'todo',
                    created_at: new Date().toISOString()
                  };
                  
                  await this.supabase.from('tasks').insert(subtaskData);
                  actions.push(`Created subtask: "${subtask}"`);
                }
              }
            }
          }
        } catch (parseError) {
          console.error('Error parsing AI action:', parseError);
        }
      }
    }

    return actions;
  }

  // Save conversation to database for context building
  private async saveConversation(
    userMessage: string, 
    aiResponse: string, 
    context: UserContext, 
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
          recent_activity_count: context.recentActivity.length
        },
        actions_taken: actions,
        timestamp: new Date().toISOString()
      };

      // Create table if it doesn't exist
      await this.supabase.rpc('create_ai_conversations_table_if_not_exists');
      
      await this.supabase.from('ai_conversations').insert(conversationData);
    } catch (error) {
      console.error('Error saving conversation:', error);
      // Don't throw - conversation saving is not critical
    }
  }

  // Generate comprehensive daily briefing with Gemini AI
  async generateDailyBriefing(): Promise<any> {
    try {
      const context = await this.getUserContext();
      
      const briefingPrompt = `Based on the user context provided in the system prompt, generate a comprehensive daily briefing. 

Analyze:
1. Current task priorities and bottlenecks
2. Habit consistency patterns and recommendations
3. Energy levels and timing optimization
4. UK move timeline and critical path items
5. Cross-domain insights (habits affecting tasks, stress affecting performance)
6. Specific actionable recommendations for today

Format your response as a detailed daily briefing that's personal, insightful, and actionable. Include specific tasks, habit adjustments, and timeline considerations.

Current date: ${new Date().toLocaleDateString('en-GB')}
Current time: ${new Date().toLocaleTimeString('en-GB')}`;

      const systemPrompt = this.createSystemPrompt(context);
      const fullPrompt = `${systemPrompt}\n\n${briefingPrompt}`;

      const result = await this.model.generateContent(fullPrompt);
      const briefingContent = result.response.text();

      return {
        greeting: briefingContent.split('\n')[0] || "Good morning! Here's your daily optimization briefing.",
        todaysFocus: this.extractSection(briefingContent, 'focus') || "Complete your highest-impact tasks first",
        priorities: this.extractList(briefingContent, ['priority', 'priorities', 'important']) || ["Review your task list", "Focus on one significant task", "Maintain habit consistency"],
        insights: [],
        warnings: this.extractList(briefingContent, ['warning', 'alert', 'attention']) || [],
        energyRecommendations: this.extractList(briefingContent, ['energy', 'timing']) || ["Match task difficulty to your energy levels"],
        timelineAlerts: this.extractList(briefingContent, ['uk', 'timeline', 'deadline']) || [],
        contextualGuidance: briefingContent
      };

    } catch (error) {
      console.error('Gemini briefing error:', error);
      
      // Fallback briefing
      const context = await this.getUserContext();
      return {
        greeting: "Good morning! I'm preparing your intelligent daily briefing.",
        todaysFocus: "Focus on completing your most important tasks",
        priorities: [`Complete ${context.tasks.filter(t => t.priority === 'high').length} high-priority tasks`],
        insights: [],
        warnings: [],
        energyRecommendations: ["Use your peak energy periods for complex tasks"],
        timelineAlerts: [],
        contextualGuidance: "Your AI agent is analyzing your data to provide personalized recommendations."
      };
    }
  }

  // Helper methods for parsing AI responses
  private extractSection(text: string, keyword: string): string | null {
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(keyword)) {
        return lines[i + 1] || lines[i];
      }
    }
    return null;
  }

  private extractList(text: string, keywords: string[]): string[] {
    const items: string[] = [];
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (keywords.some(keyword => line.includes(keyword))) {
        // Look for bullet points or numbered lists in following lines
        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          const nextLine = lines[j].trim();
          if (nextLine.match(/^[-•*]\s+/) || nextLine.match(/^\d+\.\s+/)) {
            items.push(nextLine.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, ''));
          } else if (nextLine && !nextLine.startsWith('#') && nextLine.length > 10) {
            items.push(nextLine);
          }
        }
        break;
      }
    }
    
    return items.slice(0, 5); // Limit to 5 items
  }
}

export type { UserContext, ConversationEntry, TaskCreationRequest };
