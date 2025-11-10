// TaskWorkflowService - Uses LangGraph for complex multi-step AI workflows
import { StateGraph, START, END } from '@langchain/langgraph';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import { taskParsingService, type ParsedTask } from './task-parsing-service';
import { taskReasoningService } from './task-reasoning-service';
import type { Task } from '../../types/task-management';

// State schema for our workflow
const WorkflowState = z.object({
  input: z.string(),
  inputType: z.enum(['email', 'conversation', 'complex_text']),
  userId: z.string(),
  extractedTasks: z.array(z.any()).optional(),
  enhancedTasks: z.array(z.any()).optional(),
  goals: z.array(z.any()).optional(),
  error: z.string().optional(),
  step: z.string().optional(),
  confidence: z.number().optional()
});

type WorkflowStateType = z.infer<typeof WorkflowState>;

// Email content structure
export interface EmailContent {
  subject: string;
  body: string;
  sender: string;
  date: string;
  attachments?: string[];
}

// Conversation structure
export interface Conversation {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  context?: string;
}

// Goal structure
export interface ExtractedGoal {
  title: string;
  description: string;
  category: 'career' | 'health' | 'creative' | 'financial' | 'social' | 'personal';
  timeframe: string;
  measurableOutcomes: string[];
  tasks: ParsedTask[];
  confidence: number;
}

export class TaskWorkflowService {
  private model: ChatGoogleGenerativeAI;
  private workflow: StateGraph<WorkflowStateType>;

  constructor() {
    this.model = new ChatGoogleGenerativeAI({
      modelName: 'gemini-1.5-flash',
      apiKey: import.meta.env.GEMINI_API_KEY,
      temperature: 0.4
    });

    this.workflow = this.createWorkflow();
  }

  /**
   * Create the LangGraph workflow for complex task processing
   */
  private createWorkflow(): StateGraph<WorkflowStateType> {
    const workflow = new StateGraph(WorkflowState);

    // Define workflow steps
    workflow.addNode('extract_content', this.extractContent.bind(this));
    workflow.addNode('parse_tasks', this.parseTasks.bind(this));
    workflow.addNode('enhance_tasks', this.enhanceTasks.bind(this));
    workflow.addNode('extract_goals', this.extractGoals.bind(this));
    workflow.addNode('finalize', this.finalize.bind(this));

    // Define the workflow flow
    workflow.addEdge(START, 'extract_content');
    workflow.addConditionalEdges(
      'extract_content',
      this.routeAfterExtraction.bind(this),
      {
        'parse_tasks': 'parse_tasks',
        'extract_goals': 'extract_goals',
        'error': END
      }
    );
    workflow.addEdge('parse_tasks', 'enhance_tasks');
    workflow.addEdge('enhance_tasks', 'finalize');
    workflow.addEdge('extract_goals', 'finalize');
    workflow.addEdge('finalize', END);

    return workflow.compile();
  }

  /**
   * Process email content to extract tasks
   */
  async processEmail(email: EmailContent, userId: string): Promise<{
    tasks: ParsedTask[];
    summary: string;
    confidence: number;
  }> {
    try {
      console.log(`📧 Processing email: "${email.subject}"`);

      const initialState: WorkflowStateType = {
        input: `Subject: ${email.subject}\n\nBody: ${email.body}\n\nFrom: ${email.sender}`,
        inputType: 'email',
        userId,
        step: 'starting'
      };

      const result = await this.workflow.invoke(initialState);
      
      console.log(`✅ Email processing completed: ${result.extractedTasks?.length || 0} tasks`);
      
      return {
        tasks: result.extractedTasks || [],
        summary: `Extracted ${result.extractedTasks?.length || 0} tasks from email "${email.subject}"`,
        confidence: result.confidence || 0.5
      };

    } catch (error) {
      console.error('❌ Error processing email:', error);
      return {
        tasks: [],
        summary: 'Failed to process email',
        confidence: 0
      };
    }
  }

  /**
   * Process conversation to extract goals and tasks
   */
  async processConversation(conversation: Conversation, userId: string): Promise<{
    goals: ExtractedGoal[];
    tasks: ParsedTask[];
    summary: string;
    confidence: number;
  }> {
    try {
      console.log(`💬 Processing conversation with ${conversation.messages.length} messages`);

      const conversationText = conversation.messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n');

      const initialState: WorkflowStateType = {
        input: conversationText,
        inputType: 'conversation',
        userId,
        step: 'starting'
      };

      const result = await this.workflow.invoke(initialState);
      
      console.log(`✅ Conversation processing completed: ${result.goals?.length || 0} goals, ${result.extractedTasks?.length || 0} tasks`);
      
      return {
        goals: result.goals || [],
        tasks: result.extractedTasks || [],
        summary: `Extracted ${result.goals?.length || 0} goals and ${result.extractedTasks?.length || 0} tasks from conversation`,
        confidence: result.confidence || 0.5
      };

    } catch (error) {
      console.error('❌ Error processing conversation:', error);
      return {
        goals: [],
        tasks: [],
        summary: 'Failed to process conversation',
        confidence: 0
      };
    }
  }

  /**
   * Step 1: Extract and clean content
   */
  private async extractContent(state: WorkflowStateType): Promise<Partial<WorkflowStateType>> {
    try {
      console.log(`🔍 Extracting content from ${state.inputType}`);

      const prompt = `
You are an expert content analyzer. Extract actionable content from this ${state.inputType}.

Content:
${state.input}

For ${state.inputType === 'email' ? 'emails' : 'conversations'}, identify:
- Explicit tasks mentioned
- Implied actions needed
- Deadlines or time-sensitive items
- Goals or aspirations discussed

Return a JSON object:
{
  "actionableItems": ["item 1", "item 2", ...],
  "timeReferences": ["deadline 1", "date 2", ...],
  "context": "Brief summary of the overall context",
  "confidence": number (0-1)
}

Return ONLY the JSON object.
      `;

      const result = await this.model.invoke(prompt);
      const extracted = JSON.parse(result.content as string);

      return {
        ...state,
        step: 'content_extracted',
        confidence: extracted.confidence
      };

    } catch (error) {
      console.error('❌ Error extracting content:', error);
      return {
        ...state,
        error: 'Failed to extract content',
        step: 'error'
      };
    }
  }

  /**
   * Router: Decide next step after extraction
   */
  private routeAfterExtraction(state: WorkflowStateType): string {
    if (state.error) return 'error';
    if (state.inputType === 'conversation') return 'extract_goals';
    return 'parse_tasks';
  }

  /**
   * Step 2: Parse individual tasks
   */
  private async parseTasks(state: WorkflowStateType): Promise<Partial<WorkflowStateType>> {
    try {
      console.log(`📝 Parsing tasks from extracted content`);

      // Use our existing task parsing service
      const tasks = await taskParsingService.parseMultipleTasks(state.input);

      return {
        ...state,
        extractedTasks: tasks,
        step: 'tasks_parsed'
      };

    } catch (error) {
      console.error('❌ Error parsing tasks:', error);
      return {
        ...state,
        error: 'Failed to parse tasks',
        step: 'error'
      };
    }
  }

  /**
   * Step 3: Enhance tasks with reasoning
   */
  private async enhanceTasks(state: WorkflowStateType): Promise<Partial<WorkflowStateType>> {
    try {
      console.log(`🧠 Enhancing ${state.extractedTasks?.length || 0} tasks with reasoning`);

      if (!state.extractedTasks) {
        return { ...state, step: 'no_tasks_to_enhance' };
      }

      const enhancedTasks = await Promise.all(
        state.extractedTasks.map((task: ParsedTask) =>
          taskReasoningService.enhanceTaskWithReasoning(task, {})
        )
      );

      return {
        ...state,
        enhancedTasks,
        step: 'tasks_enhanced'
      };

    } catch (error) {
      console.error('❌ Error enhancing tasks:', error);
      return {
        ...state,
        extractedTasks: state.extractedTasks, // Keep original tasks
        step: 'enhancement_failed'
      };
    }
  }

  /**
   * Step 4: Extract goals from conversation
   */
  private async extractGoals(state: WorkflowStateType): Promise<Partial<WorkflowStateType>> {
    try {
      console.log(`🎯 Extracting goals from conversation`);

      const prompt = `
Analyze this conversation and extract any goals, aspirations, or life objectives discussed.

Conversation:
${state.input}

For each goal identified, provide:
- Clear goal title
- Detailed description
- Category (career, health, creative, financial, social, personal)
- Timeframe (when they want to achieve it)
- Measurable outcomes (how success is defined)
- Specific tasks needed to achieve it

Return a JSON object:
{
  "goals": [
    {
      "title": "Clear goal title",
      "description": "Detailed description",
      "category": "career|health|creative|financial|social|personal",
      "timeframe": "when they want to achieve it",
      "measurableOutcomes": ["outcome 1", "outcome 2"],
      "tasks": ["task 1", "task 2", "task 3"],
      "confidence": number (0-1)
    }
  ],
  "overallConfidence": number (0-1)
}

If no clear goals are discussed, return empty goals array.
Return ONLY the JSON object.
      `;

      const result = await this.model.invoke(prompt);
      const extracted = JSON.parse(result.content as string);

      // Parse the task strings from goals into proper ParsedTask objects
      const goalsWithParsedTasks = await Promise.all(
        extracted.goals.map(async (goal: any) => {
          const parsedTasks = await Promise.all(
            goal.tasks.map((taskStr: string) => 
              taskParsingService.parseTask(taskStr)
            )
          );
          return {
            ...goal,
            tasks: parsedTasks
          };
        })
      );

      return {
        ...state,
        goals: goalsWithParsedTasks,
        extractedTasks: goalsWithParsedTasks.flatMap((g: any) => g.tasks),
        confidence: extracted.overallConfidence,
        step: 'goals_extracted'
      };

    } catch (error) {
      console.error('❌ Error extracting goals:', error);
      return {
        ...state,
        error: 'Failed to extract goals',
        step: 'error'
      };
    }
  }

  /**
   * Step 5: Finalize the workflow
   */
  private async finalize(state: WorkflowStateType): Promise<Partial<WorkflowStateType>> {
    console.log(`✅ Finalizing workflow - Step: ${state.step}`);

    return {
      ...state,
      step: 'completed'
    };
  }

  /**
   * Process complex text input that might contain multiple tasks, goals, etc.
   */
  async processComplexText(text: string, userId: string): Promise<{
    tasks: ParsedTask[];
    potentialGoals: string[];
    summary: string;
    confidence: number;
  }> {
    try {
      console.log(`📄 Processing complex text (${text.length} characters)`);

      const initialState: WorkflowStateType = {
        input: text,
        inputType: 'complex_text',
        userId,
        step: 'starting'
      };

      const result = await this.workflow.invoke(initialState);
      
      return {
        tasks: result.extractedTasks || [],
        potentialGoals: result.goals?.map((g: any) => g.title) || [],
        summary: `Processed complex text and extracted ${result.extractedTasks?.length || 0} tasks`,
        confidence: result.confidence || 0.5
      };

    } catch (error) {
      console.error('❌ Error processing complex text:', error);
      return {
        tasks: [],
        potentialGoals: [],
        summary: 'Failed to process complex text',
        confidence: 0
      };
    }
  }

  /**
   * Batch process multiple inputs of different types
   */
  async batchProcess(inputs: Array<{
    content: string;
    type: 'email' | 'conversation' | 'complex_text';
    metadata?: any;
  }>, userId: string): Promise<{
    allTasks: ParsedTask[];
    allGoals: ExtractedGoal[];
    processingResults: Array<{
      input: string;
      success: boolean;
      taskCount: number;
      goalCount: number;
      error?: string;
    }>;
  }> {
    console.log(`🔄 Batch processing ${inputs.length} items`);

    const results = await Promise.allSettled(
      inputs.map(async (input) => {
        switch (input.type) {
          case 'email':
            const emailResult = await this.processEmail({
              subject: input.metadata?.subject || 'No subject',
              body: input.content,
              sender: input.metadata?.sender || 'Unknown',
              date: input.metadata?.date || new Date().toISOString()
            }, userId);
            return {
              tasks: emailResult.tasks,
              goals: [],
              summary: emailResult.summary,
              input: input.content.substring(0, 100) + '...'
            };

          case 'conversation':
            const convResult = await this.processConversation({
              messages: [{ role: 'user', content: input.content, timestamp: new Date().toISOString() }]
            }, userId);
            return {
              tasks: convResult.tasks,
              goals: convResult.goals,
              summary: convResult.summary,
              input: input.content.substring(0, 100) + '...'
            };

          case 'complex_text':
            const textResult = await this.processComplexText(input.content, userId);
            return {
              tasks: textResult.tasks,
              goals: [],
              summary: textResult.summary,
              input: input.content.substring(0, 100) + '...'
            };

          default:
            throw new Error(`Unknown input type: ${input.type}`);
        }
      })
    );

    const allTasks: ParsedTask[] = [];
    const allGoals: ExtractedGoal[] = [];
    const processingResults: Array<any> = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allTasks.push(...result.value.tasks);
        allGoals.push(...result.value.goals);
        processingResults.push({
          input: result.value.input,
          success: true,
          taskCount: result.value.tasks.length,
          goalCount: result.value.goals.length
        });
      } else {
        processingResults.push({
          input: inputs[index].content.substring(0, 100) + '...',
          success: false,
          taskCount: 0,
          goalCount: 0,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    console.log(`✅ Batch processing completed: ${allTasks.length} tasks, ${allGoals.length} goals`);

    return {
      allTasks,
      allGoals,
      processingResults
    };
  }
}

// Export singleton instance
export const taskWorkflowService = new TaskWorkflowService();