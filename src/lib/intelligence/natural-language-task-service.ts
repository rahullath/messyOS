// NaturalLanguageTaskService - Unified interface for all AI task processing
// This combines TaskParsingService, TaskReasoningService, and TaskWorkflowService
import { taskParsingService, type ParsedTask } from './task-parsing-service';
import { taskReasoningService } from './task-reasoning-service';
import { taskWorkflowService, type EmailContent, type Conversation, type ExtractedGoal } from './task-workflow-service';
import { TaskService } from '../task-management/task-service';
import type { CreateTaskRequest, Task } from '../../types/task-management';

// Main interface for natural language task creation
export interface NLTaskCreationResult {
  tasks: ParsedTask[];
  goals?: ExtractedGoal[];
  summary: string;
  confidence: number;
  reasoning?: Array<{
    taskIndex: number;
    reasoning: string;
    suggestions: string[];
  }>;
  warnings?: string[];
}

// Configuration for different parsing modes
interface ParseConfig {
  enableReasoning: boolean;
  enableGoalExtraction: boolean;
  confidenceThreshold: number;
  maxTasks: number;
  userContext?: {
    recentTasks?: Task[];
    preferences?: any;
    timezone?: string;
  };
}

export class NaturalLanguageTaskService {
  private defaultConfig: ParseConfig = {
    enableReasoning: true,
    enableGoalExtraction: false,
    confidenceThreshold: 0.3, // Lowered from 0.6 to be less strict
    maxTasks: 10
  };

  /**
   * MAIN METHOD: Create tasks from natural language
   * This is the primary interface that the UI will use
   */
  async createTasksFromText(
    input: string, 
    userId: string, 
    config: Partial<ParseConfig> = {}
  ): Promise<NLTaskCreationResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    try {
      console.log(`🚀 Creating tasks from natural language: "${input.substring(0, 50)}..."`);
      console.log(`Config:`, { 
        enableReasoning: finalConfig.enableReasoning,
        enableGoalExtraction: finalConfig.enableGoalExtraction,
        confidenceThreshold: finalConfig.confidenceThreshold 
      });

      // Step 1: Validate input
      const validation = taskParsingService.validateInput(input);
      if (!validation.isValid) {
        return {
          tasks: [],
          summary: validation.error || 'Invalid input',
          confidence: 0,
          warnings: [validation.error || 'Invalid input']
        };
      }

      // Step 2: Basic parsing
      const cleanedInput = validation.cleanedInput || input;
      let parsedTasks: ParsedTask[];

      // Check if this looks like multiple tasks
      const hasMultipleTaskIndicators = /[,;]|and(?=\s)|then(?=\s)|also(?=\s)|\d+\.|•|\*/.test(cleanedInput);
      
      if (hasMultipleTaskIndicators) {
        parsedTasks = await taskParsingService.parseMultipleTasks(cleanedInput, finalConfig.userContext);
      } else {
        const singleTask = await taskParsingService.parseTask(cleanedInput, finalConfig.userContext);
        parsedTasks = [singleTask];
      }

      // Limit number of tasks
      if (parsedTasks.length > finalConfig.maxTasks) {
        parsedTasks = parsedTasks.slice(0, finalConfig.maxTasks);
      }

      // Step 3: Apply reasoning if enabled and confidence is sufficient
      let enhancedTasks = parsedTasks;
      let reasoning: Array<any> = [];

      if (finalConfig.enableReasoning) {
        console.log(`🧠 Applying reasoning to ${parsedTasks.length} tasks...`);
        
        enhancedTasks = await Promise.all(
          parsedTasks.map(async (task, index) => {
            // Apply reasoning to all tasks, not just high confidence ones
            try {
              const enhanced = await taskReasoningService.enhanceTaskWithReasoning(
                task, 
                finalConfig.userContext || {}
              );
              
              reasoning.push({
                taskIndex: index,
                reasoning: enhanced.reasoning.reasoningExplanation,
                suggestions: enhanced.reasoning.schedulingSuggestions.bestTimeSlots.map(slot => 
                  `${slot.start}-${slot.end}: ${slot.reason}`
                )
              });
              
              return enhanced;
            } catch (error) {
              console.warn(`Failed to enhance task ${index}, using original:`, error);
              return task;
            }
          })
        );
      }

      // Step 4: Filter out low-confidence tasks
      const finalTasks = enhancedTasks.filter(task => task.confidence >= finalConfig.confidenceThreshold);
      const filteredOut = enhancedTasks.length - finalTasks.length;

      // Step 5: Calculate overall confidence
      const avgConfidence = finalTasks.length > 0 
        ? finalTasks.reduce((sum, task) => sum + task.confidence, 0) / finalTasks.length 
        : 0;

      // Step 6: Generate warnings
      const warnings: string[] = [];
      if (filteredOut > 0) {
        warnings.push(`${filteredOut} tasks filtered out due to low confidence`);
      }
      if (avgConfidence < 0.7) {
        warnings.push('Some tasks may need manual review due to parsing uncertainty');
      }

      const result: NLTaskCreationResult = {
        tasks: finalTasks,
        summary: `Successfully parsed ${finalTasks.length} task${finalTasks.length === 1 ? '' : 's'} from natural language input`,
        confidence: avgConfidence,
        reasoning: reasoning.length > 0 ? reasoning : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };

      console.log(`✅ Task creation completed:`, {
        taskCount: finalTasks.length,
        avgConfidence: Math.round(avgConfidence * 100) / 100,
        hasReasoning: reasoning.length > 0,
        warningCount: warnings.length
      });

      return result;

    } catch (error) {
      console.error('❌ Error in natural language task creation:', error);
      
      return {
        tasks: [],
        summary: 'Failed to parse natural language input',
        confidence: 0,
        warnings: ['An error occurred during processing. Please try rephrasing your input.']
      };
    }
  }

  /**
   * Create tasks from email content
   */
  async createTasksFromEmail(
    email: EmailContent, 
    userId: string
  ): Promise<NLTaskCreationResult> {
    try {
      console.log(`📧 Creating tasks from email: "${email.subject}"`);

      const result = await taskWorkflowService.processEmail(email, userId);
      
      return {
        tasks: result.tasks,
        summary: result.summary,
        confidence: result.confidence,
        warnings: result.confidence < 0.7 ? ['Email parsing had low confidence - please review tasks'] : undefined
      };

    } catch (error) {
      console.error('❌ Error processing email:', error);
      return {
        tasks: [],
        summary: 'Failed to process email',
        confidence: 0,
        warnings: ['Email processing failed']
      };
    }
  }

  /**
   * Create tasks and goals from conversation
   */
  async createTasksFromConversation(
    conversation: Conversation, 
    userId: string
  ): Promise<NLTaskCreationResult> {
    try {
      console.log(`💬 Creating tasks from conversation...`);

      const result = await taskWorkflowService.processConversation(conversation, userId);
      
      return {
        tasks: result.tasks,
        goals: result.goals,
        summary: result.summary,
        confidence: result.confidence,
        warnings: result.confidence < 0.7 ? ['Conversation parsing had low confidence - please review extracted content'] : undefined
      };

    } catch (error) {
      console.error('❌ Error processing conversation:', error);
      return {
        tasks: [],
        summary: 'Failed to process conversation',
        confidence: 0,
        warnings: ['Conversation processing failed']
      };
    }
  }

  /**
   * Save parsed tasks to database
   */
  async saveParsedTasks(
    parsedTasks: ParsedTask[], 
    userId: string,
    supabaseClient?: any
  ): Promise<{
    savedTasks: Task[];
    errors: Array<{ task: ParsedTask; error: string }>;
  }> {
    const savedTasks: Task[] = [];
    const errors: Array<{ task: ParsedTask; error: string }> = [];

    console.log(`💾 Saving ${parsedTasks.length} parsed tasks to database...`);

    for (const parsedTask of parsedTasks) {
      try {
        const createRequest = taskParsingService.convertToCreateRequest(parsedTask, userId);
        
        if (!supabaseClient) {
          throw new Error('Supabase client is required for task creation');
        }
        
        // Debug: Check authentication state
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        console.log(`🔍 saveParsedTasks - userId: ${userId}, auth.user.id: ${user?.id}, match: ${userId === user?.id}`);
        
        if (!user) {
          throw new Error('No authenticated user found in supabase client');
        }
        
        // Direct database insert to avoid RLS issues with TaskService
        const { data: savedTask, error: insertError } = await supabaseClient
          .from('tasks')
          .insert({
            ...createRequest,
            user_id: userId
          })
          .select()
          .single();

        if (insertError) {
          throw new Error(`Failed to create task: ${insertError.message}`);
        }
        savedTasks.push(savedTask);
        console.log(`✅ Saved task: "${savedTask.title}"`);
        
      } catch (error) {
        console.error(`❌ Failed to save task: "${parsedTask.title}"`, error);
        errors.push({
          task: parsedTask,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(`💾 Save completed: ${savedTasks.length} saved, ${errors.length} errors`);

    return { savedTasks, errors };
  }

  /**
   * Full workflow: Parse and save tasks in one call
   */
  async parseAndSaveTasks(
    input: string,
    userId: string,
    config: Partial<ParseConfig> = {},
    supabaseClient?: any
  ): Promise<{
    parseResult: NLTaskCreationResult;
    savedTasks: Task[];
    errors: Array<{ task: ParsedTask; error: string }>;
  }> {
    console.log(`🔄 Starting full parse-and-save workflow...`);

    // Step 1: Parse tasks
    const parseResult = await this.createTasksFromText(input, userId, config);

    // Step 2: Save tasks if parsing was successful
    let savedTasks: Task[] = [];
    let errors: Array<{ task: ParsedTask; error: string }> = [];

    if (parseResult.tasks.length > 0) {
      const saveResult = await this.saveParsedTasks(parseResult.tasks, userId, supabaseClient);
      savedTasks = saveResult.savedTasks;
      errors = saveResult.errors;
    }

    console.log(`✅ Full workflow completed: ${savedTasks.length} tasks created`);

    return {
      parseResult,
      savedTasks,
      errors
    };
  }

  /**
   * Get task suggestions based on user context
   */
  async suggestTasks(
    userId: string,
    context: {
      timeOfDay?: 'morning' | 'afternoon' | 'evening';
      energyLevel?: 'low' | 'medium' | 'high';
      availableTime?: number; // minutes
      preferredCategory?: string;
    }
  ): Promise<{
    suggestions: Array<{
      title: string;
      description: string;
      category: string;
      priority: string;
      reason: string;
    }>;
  }> {
    try {
      console.log(`💡 Generating task suggestions for user ${userId}`);

      // This would use the reasoning service to suggest tasks
      // Based on user patterns, time of day, energy level, etc.
      // For now, return basic suggestions

      const suggestions = [
        {
          title: "Review today's priorities",
          description: "Quick review of important tasks for the day",
          category: "general",
          priority: "medium",
          reason: "Good way to start any time period"
        }
      ];

      return { suggestions };

    } catch (error) {
      console.error('❌ Error generating task suggestions:', error);
      return { suggestions: [] };
    }
  }

  /**
   * Analyze task creation patterns for insights
   */
  async analyzeCreationPatterns(userId: string): Promise<{
    insights: string[];
    suggestions: string[];
    stats: {
      totalTasksCreated: number;
      avgConfidence: number;
      topCategories: string[];
      creationMethods: { [method: string]: number };
    };
  }> {
    try {
      console.log(`📊 Analyzing task creation patterns for user ${userId}`);

      // Get user's tasks
      const userTasks = await TaskService.getTasksByUserId(userId);
      const aiCreatedTasks = userTasks.filter(t => t.created_from === 'ai');

      const stats = {
        totalTasksCreated: aiCreatedTasks.length,
        avgConfidence: 0.8, // Would calculate from actual data
        topCategories: ['work', 'personal', 'learning'],
        creationMethods: {
          'natural_language': aiCreatedTasks.length,
          'email': 0,
          'conversation': 0
        }
      };

      const insights = [
        `You've created ${aiCreatedTasks.length} tasks using AI assistance`,
        'Most of your tasks fall into work and personal categories',
      ];

      const suggestions = [
        'Try using email parsing to automatically create tasks from your inbox',
        'Use conversation mode to turn goals into actionable task plans'
      ];

      return { insights, suggestions, stats };

    } catch (error) {
      console.error('❌ Error analyzing creation patterns:', error);
      return {
        insights: ['Unable to analyze patterns at this time'],
        suggestions: [],
        stats: {
          totalTasksCreated: 0,
          avgConfidence: 0,
          topCategories: [],
          creationMethods: {}
        }
      };
    }
  }
}

// Export singleton instance
export const naturalLanguageTaskService = new NaturalLanguageTaskService();