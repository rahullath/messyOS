// src/lib/intelligence/autonomous-actions.ts - Autonomous Actions System
// Enables AI to write directly to tasks/habits/metrics tables with user transparency

import { createServerAuth } from '../auth/simple-multi-user';
import { unifiedContextManager, type UnifiedUserContext } from './unified-context';

export interface AIAction {
  id?: string;
  user_id: string;
  action_type: 'create_task' | 'log_habit' | 'record_metric' | 'create_habit' | 'update_task' | 'create_reminder';
  description: string;
  data: any;
  confidence: number; // 0-1 confidence score
  reasoning: string;
  executed: boolean;
  created_at?: string;
  executed_at?: string;
  result?: any;
  user_feedback?: 'approved' | 'rejected' | 'modified';
}

export interface TaskCreationData {
  title: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  subtasks?: string[];
  context?: any;
}

export interface HabitLogData {
  habit_id: string;
  value: number;
  notes?: string;
  mood?: number;
  energy_level?: number;
  context?: any;
}

export interface MetricRecordData {
  type: string;
  value: number;
  unit?: string;
  category: string;
  context?: any;
  recorded_at?: string;
}

export interface HabitCreationData {
  name: string;
  description?: string;
  category: string;
  type: 'build' | 'break';
  target_value?: number;
  target_unit?: string;
  frequency?: string;
}

class AutonomousActionsEngine {
  private supabase: any;
  private userId: string;

  constructor(cookies: any, userId: string) {
    const serverAuth = createServerAuth(cookies);
    this.supabase = serverAuth.supabase;
    this.userId = userId;
  }

  // Main method to process conversation and extract autonomous actions
  async processConversationForActions(
    userMessage: string, 
    aiResponse: string,
    context: UnifiedUserContext
  ): Promise<AIAction[]> {
    console.log('🤖 Processing conversation for autonomous actions...');

    const actions: AIAction[] = [];
    
    // Extract different types of actions from the conversation
    const taskActions = await this.extractTaskCreations(userMessage, aiResponse, context);
    const habitActions = await this.extractHabitLogs(userMessage, aiResponse, context);
    const metricActions = await this.extractMetricRecords(userMessage, aiResponse, context);
    const reminderActions = await this.extractReminders(userMessage, aiResponse, context);

    actions.push(...taskActions, ...habitActions, ...metricActions, ...reminderActions);

    // Execute high-confidence actions automatically
    for (const action of actions) {
      if (action.confidence >= 0.8) {
        await this.executeAction(action);
      }
    }

    return actions;
  }

  // Extract task creation requests from conversation
  private async extractTaskCreations(
    userMessage: string, 
    aiResponse: string, 
    context: UnifiedUserContext
  ): Promise<AIAction[]> {
    const actions: AIAction[] = [];
    const combinedText = `${userMessage} ${aiResponse}`;

    // Patterns that indicate task creation intent
    const taskPatterns = [
      /need to (.*?)(?:\.|$)/gi,
      /i should (.*?)(?:\.|$)/gi,
      /todo:?\s*(.*?)(?:\.|$)/gi,
      /task:?\s*(.*?)(?:\.|$)/gi,
      /reminder to (.*?)(?:\.|$)/gi,
      /don't forget to (.*?)(?:\.|$)/gi,
      /schedule (.*?)(?:\.|$)/gi,
      /plan to (.*?)(?:\.|$)/gi,
      /appointment (.*?)(?:\.|$)/gi,
    ];

    // Date extraction patterns
    const datePatterns = [
      /(?:by|before|on|at)\s*(\d{1,2}\/\d{1,2}\/?\d{0,4})/gi,
      /(?:tomorrow|today|this week|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
      /(?:in\s*\d+\s*(?:days?|weeks?|months?))/gi,
    ];

    // Priority detection patterns
    const urgentPatterns = /(?:urgent|asap|immediately|now|critical|important)/gi;
    const highPatterns = /(?:soon|this week|priority|high)/gi;

    for (const pattern of taskPatterns) {
      let match;
      while ((match = pattern.exec(combinedText)) !== null) {
        const taskText = match[1].trim();
        if (taskText.length < 5) continue; // Skip too short matches

        // Extract due date if present
        let dueDate: string | undefined;
        for (const datePattern of datePatterns) {
          const dateMatch = taskText.match(datePattern);
          if (dateMatch) {
            dueDate = this.parseDate(dateMatch[0]);
            break;
          }
        }

        // Determine priority
        let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
        if (urgentPatterns.test(taskText)) priority = 'urgent';
        else if (highPatterns.test(taskText)) priority = 'high';

        // Determine category based on context
        const category = this.categorizeTask(taskText, context);

        const taskData: TaskCreationData = {
          title: this.cleanTaskTitle(taskText),
          description: `Created from conversation: "${userMessage.substring(0, 100)}..."`,
          category,
          priority,
          due_date: dueDate,
          context: {
            source: 'conversation',
            original_text: match[0],
            user_message: userMessage.substring(0, 200),
            confidence_factors: this.analyzeTaskConfidence(taskText, userMessage)
          }
        };

        const confidence = this.calculateTaskConfidence(taskText, userMessage, context);

        actions.push({
          user_id: this.userId,
          action_type: 'create_task',
          description: `Create task: "${taskData.title}"`,
          data: taskData,
          confidence,
          reasoning: `Detected task creation intent in conversation. Pattern: "${pattern.source}", Priority: ${priority}, Confidence: ${Math.round(confidence * 100)}%`,
          executed: false,
        });
      }
    }

    return actions;
  }

  // Extract habit logging from conversation
  private async extractHabitLogs(
    userMessage: string, 
    aiResponse: string, 
    context: UnifiedUserContext
  ): Promise<AIAction[]> {
    const actions: AIAction[] = [];
    const combinedText = `${userMessage} ${aiResponse}`.toLowerCase();

    // Get user's active habits for matching
    const activeHabits = context.habits.active;
    
    for (const habit of activeHabits) {
      const habitName = habit.name.toLowerCase();
      const habitKeywords = habitName.split(' ');

      // Check if habit is mentioned in conversation
      const habitMentioned = habitKeywords.some(keyword => 
        combinedText.includes(keyword) || 
        this.checkHabitSynonyms(keyword, combinedText)
      );

      if (!habitMentioned) continue;

      // Extract value and context from conversation
      const logData = this.extractHabitLogDetails(combinedText, habit, userMessage);
      
      if (logData.value !== null) {
        const confidence = this.calculateHabitLogConfidence(combinedText, habit);
        
        actions.push({
          user_id: this.userId,
          action_type: 'log_habit',
          description: `Log habit: "${habit.name}" with value ${logData.value}`,
          data: {
            habit_id: habit.id,
            value: logData.value,
            notes: logData.notes,
            mood: logData.mood,
            energy_level: logData.energy_level,
            context: {
              source: 'conversation',
              original_message: userMessage.substring(0, 200),
              detection_reason: logData.detection_reason
            }
          },
          confidence,
          reasoning: `Detected habit "${habit.name}" logging in conversation. Value: ${logData.value}, Confidence: ${Math.round(confidence * 100)}%`,
          executed: false,
        });
      }
    }

    return actions;
  }

  // Extract metric recording from conversation
  private async extractMetricRecords(
    userMessage: string, 
    aiResponse: string, 
    context: UnifiedUserContext
  ): Promise<AIAction[]> {
    const actions: AIAction[] = [];
    const combinedText = `${userMessage} ${aiResponse}`.toLowerCase();

    // Metric extraction patterns
    const metricPatterns = [
      { pattern: /(?:slept|sleep)\s*(?:for)?\s*(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)/gi, type: 'sleep_duration', unit: 'hours', category: 'health' },
      { pattern: /weight\s*(?:is|was|:)?\s*(\d+(?:\.\d+)?)\s*(?:kg|lbs?|pounds?)/gi, type: 'weight', unit: 'kg', category: 'health' },
      { pattern: /(?:walked|steps)\s*(\d+(?:,\d+)?)\s*(?:steps?)/gi, type: 'steps', unit: 'steps', category: 'health' },
      { pattern: /mood\s*(?:is|was|:)?\s*(\d+)\/10/gi, type: 'mood', unit: 'scale', category: 'health' },
      { pattern: /energy\s*(?:level|is|was|:)?\s*(\d+)\/10/gi, type: 'energy_level', unit: 'scale', category: 'health' },
      { pattern: /spent\s*(?:£|\$)?(\d+(?:\.\d+)?)/gi, type: 'expense', unit: 'currency', category: 'finance' },
      { pattern: /earned\s*(?:£|\$)?(\d+(?:\.\d+)?)/gi, type: 'income', unit: 'currency', category: 'finance' },
    ];

    for (const metricPattern of metricPatterns) {
      let match;
      while ((match = metricPattern.pattern.exec(combinedText)) !== null) {
        const value = parseFloat(match[1].replace(',', ''));
        
        if (isNaN(value) || value <= 0) continue;

        // Sanity checks for realistic values
        if (!this.isRealisticMetricValue(metricPattern.type, value)) continue;

        const confidence = this.calculateMetricConfidence(match[0], userMessage, metricPattern.type);

        const metricData: MetricRecordData = {
          type: metricPattern.type,
          value,
          unit: metricPattern.unit,
          category: metricPattern.category,
          context: {
            source: 'conversation',
            original_text: match[0],
            user_message: userMessage.substring(0, 200)
          },
          recorded_at: new Date().toISOString()
        };

        actions.push({
          user_id: this.userId,
          action_type: 'record_metric',
          description: `Record ${metricPattern.type}: ${value} ${metricPattern.unit}`,
          data: metricData,
          confidence,
          reasoning: `Detected metric "${metricPattern.type}" in conversation. Value: ${value}, Confidence: ${Math.round(confidence * 100)}%`,
          executed: false,
        });
      }
    }

    return actions;
  }

  // Extract reminder creation from conversation
  private async extractReminders(
    userMessage: string, 
    aiResponse: string, 
    context: UnifiedUserContext
  ): Promise<AIAction[]> {
    const actions: AIAction[] = [];
    const combinedText = `${userMessage} ${aiResponse}`;

    // Reminder patterns
    const reminderPatterns = [
      /remind me to (.*?)(?:\.|$)/gi,
      /reminder:?\s*(.*?)(?:\.|$)/gi,
      /don't let me forget to (.*?)(?:\.|$)/gi,
    ];

    for (const pattern of reminderPatterns) {
      let match;
      while ((match = pattern.exec(combinedText)) !== null) {
        const reminderText = match[1].trim();
        if (reminderText.length < 5) continue;

        const confidence = 0.9; // High confidence for explicit reminder requests

        const taskData: TaskCreationData = {
          title: `Reminder: ${reminderText}`,
          description: `Reminder created from conversation`,
          category: 'Personal',
          priority: 'medium',
          context: {
            source: 'reminder_request',
            original_text: match[0],
            user_message: userMessage.substring(0, 200)
          }
        };

        actions.push({
          user_id: this.userId,
          action_type: 'create_reminder',
          description: `Create reminder: "${reminderText}"`,
          data: taskData,
          confidence,
          reasoning: `Explicit reminder request detected in conversation`,
          executed: false,
        });
      }
    }

    return actions;
  }

  // Execute an autonomous action
  async executeAction(action: AIAction): Promise<boolean> {
    try {
      console.log(`🔄 Executing autonomous action: ${action.description}`);

      let result: any;

      switch (action.action_type) {
        case 'create_task':
          result = await this.createTask(action.data as TaskCreationData);
          break;
        
        case 'log_habit':
          result = await this.logHabit(action.data as HabitLogData);
          break;
        
        case 'record_metric':
          result = await this.recordMetric(action.data as MetricRecordData);
          break;
        
        case 'create_reminder':
          result = await this.createTask(action.data as TaskCreationData);
          break;
        
        default:
          throw new Error(`Unknown action type: ${action.action_type}`);
      }

      // Mark action as executed and save to database
      action.executed = true;
      action.executed_at = new Date().toISOString();
      action.result = result;

      await this.saveActionLog(action);

      console.log(`✅ Successfully executed: ${action.description}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to execute action: ${action.description}`, error);
      
      // Save failed action for debugging
      action.result = { error: error.message };
      await this.saveActionLog(action);
      
      return false;
    }
  }

  // Create a task in the database
  private async createTask(data: TaskCreationData): Promise<any> {
    const taskData = {
      user_id: this.userId,
      title: data.title,
      description: data.description || '',
      category: data.category,
      priority: data.priority,
      status: 'todo',
      due_date: data.due_date || null,
      created_at: new Date().toISOString()
    };

    const { data: result, error } = await this.supabase
      .from('tasks')
      .insert(taskData)
      .select()
      .single();

    if (error) throw error;

    // Create subtasks if specified
    if (data.subtasks && data.subtasks.length > 0) {
      for (const subtask of data.subtasks) {
        const subtaskData = {
          user_id: this.userId,
          title: subtask,
          description: `Subtask of: ${data.title}`,
          category: data.category,
          priority: 'medium',
          status: 'todo',
          created_at: new Date().toISOString()
        };
        
        await this.supabase.from('tasks').insert(subtaskData);
      }
    }

    // Clear cache to reflect new data
    unifiedContextManager.clearUserCache(this.userId);

    return result;
  }

  // Log a habit entry
  private async logHabit(data: HabitLogData): Promise<any> {
    const habitLogData = {
      habit_id: data.habit_id,
      user_id: this.userId,
      value: data.value,
      notes: data.notes || '',
      mood: data.mood || null,
      energy_level: data.energy_level || null,
      logged_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const { data: result, error } = await this.supabase
      .from('habit_entries')
      .insert(habitLogData)
      .select()
      .single();

    if (error) throw error;

    // Update habit streak count
    await this.updateHabitStreak(data.habit_id);

    // Clear cache to reflect new data
    unifiedContextManager.clearUserCache(this.userId);

    return result;
  }

  // Record a metric
  private async recordMetric(data: MetricRecordData): Promise<any> {
    const metricData = {
      user_id: this.userId,
      type: data.type,
      value: data.value,
      unit: data.unit || null,
      category: data.category,
      metadata: data.context || {},
      recorded_at: data.recorded_at || new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const { data: result, error } = await this.supabase
      .from('metrics')
      .insert(metricData)
      .select()
      .single();

    if (error) throw error;

    // Clear cache to reflect new data
    unifiedContextManager.clearUserCache(this.userId);

    return result;
  }

  // Save action log for transparency
  private async saveActionLog(action: AIAction): Promise<void> {
    const actionLogData = {
      user_id: this.userId,
      action_type: action.action_type,
      description: action.description,
      data: action.data,
      confidence: action.confidence,
      reasoning: action.reasoning,
      executed: action.executed,
      executed_at: action.executed_at || null,
      result: action.result || null,
      user_feedback: action.user_feedback || null,
      created_at: action.created_at || new Date().toISOString()
    };

    // Create ai_actions table if it doesn't exist and insert
    try {
      await this.supabase.from('ai_actions').insert(actionLogData);
    } catch (error) {
      console.error('Error saving action log:', error);
      // Create table if it doesn't exist
      await this.createAIActionsTable();
      await this.supabase.from('ai_actions').insert(actionLogData);
    }
  }

  // Helper methods for pattern recognition and confidence calculation

  private parseDate(dateString: string): string | undefined {
    const today = new Date();
    const cleanDate = dateString.toLowerCase().trim();
    
    if (cleanDate === 'today') return today.toISOString().split('T')[0];
    if (cleanDate === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    
    // Handle other date formats...
    return undefined;
  }

  private categorizeTask(taskText: string, context: UnifiedUserContext): string {
    const text = taskText.toLowerCase();
    
    if (text.includes('uk') || text.includes('birmingham') || text.includes('move')) return 'UK Move';
    if (text.includes('assignment') || text.includes('study') || text.includes('university')) return 'Academic';
    if (text.includes('gym') || text.includes('workout') || text.includes('health')) return 'Health';
    if (text.includes('shopping') || text.includes('buy') || text.includes('order')) return 'Shopping';
    if (text.includes('work') || text.includes('job')) return 'Work';
    
    return 'Personal';
  }

  private cleanTaskTitle(taskText: string): string {
    return taskText
      .replace(/^(need to|i should|todo:?\s*|task:?\s*|reminder to|don't forget to|schedule|plan to)\s*/i, '')
      .replace(/\s+(today|tomorrow|this week|next week)$/i, '')
      .trim();
  }

  private calculateTaskConfidence(taskText: string, userMessage: string, context: UnifiedUserContext): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence for explicit task language
    if (/^(need to|i should|todo|task|reminder)/i.test(taskText)) confidence += 0.3;
    
    // Increase confidence for specific details
    if (taskText.length > 10) confidence += 0.1;
    if (/\d{1,2}\/\d{1,2}|\w+day|tomorrow|today/.test(taskText)) confidence += 0.2;
    
    // Decrease confidence for vague language
    if (/maybe|might|perhaps|could/i.test(userMessage)) confidence -= 0.2;
    
    return Math.min(Math.max(confidence, 0), 1);
  }

  private checkHabitSynonyms(keyword: string, text: string): boolean {
    const synonyms = {
      'exercise': ['workout', 'gym', 'fitness', 'training'],
      'meditation': ['mindfulness', 'meditate', 'calm'],
      'reading': ['book', 'read', 'literature'],
      'water': ['hydration', 'drink', 'fluid'],
      'sleep': ['rest', 'bed', 'tired', 'nap']
    };
    
    const syns = synonyms[keyword as keyof typeof synonyms] || [];
    return syns.some(syn => text.includes(syn));
  }

  private extractHabitLogDetails(text: string, habit: any, userMessage: string): any {
    // Extract numerical values and context for habit logging
    const numbers = text.match(/\d+(?:\.\d+)?/g);
    
    if (!numbers) return { value: null };
    
    // Default to 1 for binary habits (done/not done)
    let value = 1;
    
    // For quantitative habits, try to extract the value
    if (habit.target_value && numbers.length > 0) {
      value = parseFloat(numbers[0]);
    }
    
    // Extract mood and energy if mentioned
    const moodMatch = text.match(/mood\s*(\d+)/);
    const energyMatch = text.match(/energy\s*(\d+)/);
    
    return {
      value,
      mood: moodMatch ? parseInt(moodMatch[1]) : null,
      energy_level: energyMatch ? parseInt(energyMatch[1]) : null,
      notes: `Logged from conversation: "${userMessage.substring(0, 100)}"`,
      detection_reason: 'Habit mentioned in conversation'
    };
  }

  private calculateHabitLogConfidence(text: string, habit: any): number {
    let confidence = 0.6; // Base confidence
    
    // Higher confidence for explicit completion language
    if (/completed|finished|did|done/i.test(text)) confidence += 0.2;
    
    // Lower confidence for negative language
    if (/didn't|haven't|skip|miss/i.test(text)) confidence -= 0.3;
    
    return Math.min(Math.max(confidence, 0), 1);
  }

  private calculateMetricConfidence(matchText: string, userMessage: string, metricType: string): number {
    let confidence = 0.7; // Base confidence for numerical patterns
    
    // Higher confidence for explicit measurement language
    if (/measured|recorded|tracked/i.test(userMessage)) confidence += 0.2;
    
    // Lower confidence for uncertain language
    if (/about|around|roughly|approximately/i.test(matchText)) confidence -= 0.1;
    
    return Math.min(Math.max(confidence, 0), 1);
  }

  private isRealisticMetricValue(type: string, value: number): boolean {
    const ranges = {
      'sleep_duration': { min: 1, max: 16 },
      'weight': { min: 30, max: 300 },
      'steps': { min: 100, max: 50000 },
      'mood': { min: 1, max: 10 },
      'energy_level': { min: 1, max: 10 },
      'expense': { min: 0.01, max: 10000 },
      'income': { min: 1, max: 100000 }
    };
    
    const range = ranges[type as keyof typeof ranges];
    return range ? value >= range.min && value <= range.max : true;
  }

  private analyzeTaskConfidence(taskText: string, userMessage: string): string[] {
    const factors = [];
    
    if (/^(need to|must|should)/i.test(taskText)) factors.push('explicit_obligation');
    if (/urgent|asap|important/i.test(taskText)) factors.push('urgency_markers');
    if (/\d{1,2}\/\d{1,2}|\w+day/.test(taskText)) factors.push('specific_date');
    if (taskText.length > 20) factors.push('detailed_description');
    if (/maybe|might|perhaps/i.test(userMessage)) factors.push('uncertainty');
    
    return factors;
  }

  private async updateHabitStreak(habitId: string): Promise<void> {
    // Calculate and update habit streak - simplified implementation
    const { data: entries } = await this.supabase
      .from('habit_entries')
      .select('logged_at')
      .eq('habit_id', habitId)
      .order('logged_at', { ascending: false })
      .limit(30);
    
    if (!entries) return;
    
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < entries.length; i++) {
      const entryDate = new Date(entries[i].logged_at);
      const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }
    
    await this.supabase
      .from('habits')
      .update({ streak_count: streak })
      .eq('id', habitId);
  }

  private async createAIActionsTable(): Promise<void> {
    // Create the ai_actions table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ai_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL,
        description TEXT NOT NULL,
        data JSONB NOT NULL,
        confidence DECIMAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
        reasoning TEXT NOT NULL,
        executed BOOLEAN DEFAULT FALSE,
        executed_at TIMESTAMPTZ,
        result JSONB,
        user_feedback VARCHAR(20) CHECK (user_feedback IN ('approved', 'rejected', 'modified')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Create index for efficient querying
      CREATE INDEX IF NOT EXISTS idx_ai_actions_user_created ON ai_actions(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ai_actions_user_executed ON ai_actions(user_id, executed, created_at DESC);

      -- Enable RLS
      ALTER TABLE ai_actions ENABLE ROW LEVEL SECURITY;

      -- Create RLS policy
      DROP POLICY IF EXISTS "Users can only access their own AI actions" ON ai_actions;
      CREATE POLICY "Users can only access their own AI actions" ON ai_actions
        FOR ALL USING (auth.uid() = user_id);
    `;

    try {
      await this.supabase.rpc('exec_sql', { sql: createTableSQL });
    } catch (error) {
      console.error('Error creating ai_actions table:', error);
    }
  }
}

// Factory function to create autonomous actions engine
export function createAutonomousActionsEngine(cookies: any, userId: string): AutonomousActionsEngine {
  return new AutonomousActionsEngine(cookies, userId);
}

// Convenience function for processing conversations
export async function processConversationForAutonomousActions(
  cookies: any,
  userId: string,
  userMessage: string,
  aiResponse: string
): Promise<AIAction[]> {
  const engine = new AutonomousActionsEngine(cookies, userId);
  const context = await unifiedContextManager.getUserContext(cookies, userId);
  
  return engine.processConversationForActions(userMessage, aiResponse, context);
}

// Type exports
export type { TaskCreationData, HabitLogData, MetricRecordData, HabitCreationData };