// TaskParsingService - Uses LangChain to convert natural language to structured task data
import { z } from 'zod';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import type { CreateTaskRequest } from '../../types/task-management';

// Define the exact structure we want the AI to return
const ParsedTaskSchema = z.object({
  title: z.string().describe('The main task title, cleaned up and concise'),
  description: z.string().optional().nullable().describe('Detailed description if the input provides context'),
  category: z.enum(['work', 'personal', 'health', 'learning', 'creative', 'social', 'finance', 'general'])
    .describe('Most appropriate category based on task content'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'])
    .describe('Priority level based on urgency words, deadlines, and context'),
  complexity: z.enum(['simple', 'moderate', 'complex'])
    .describe('How complex the task appears to be'),
  energy_required: z.enum(['low', 'medium', 'high'])
    .describe('Mental/physical energy needed'),
  estimated_duration: z.number().optional()
    .describe('Estimated minutes needed, if determinable from context'),
  deadline: z.string().optional()
    .describe('ISO date string if a deadline is mentioned'),
  confidence: z.number().min(0).max(1)
    .describe('How confident the AI is in this parsing (0-1)')
});

export type ParsedTask = z.infer<typeof ParsedTaskSchema>;

export class TaskParsingService {
  private model: ChatGoogleGenerativeAI;
  private parser: StructuredOutputParser<ParsedTask>;
  private prompt: PromptTemplate;

  constructor() {
    // Initialize the AI model (using Gemini via LangChain)
    this.model = new ChatGoogleGenerativeAI({
      modelName: 'gemini-1.5-flash', // Updated to current model name
      apiKey: import.meta.env.GEMINI_API_KEY,
      temperature: 0.3, // Lower temperature for more consistent parsing
    });

    // Create a parser that enforces our schema
    this.parser = StructuredOutputParser.fromZodSchema(ParsedTaskSchema);

    // Create the prompt template
    this.prompt = PromptTemplate.fromTemplate(`
You are an expert task parsing assistant. Convert natural language input into structured task data.

Current date and time: {currentDate}
User timezone: {timezone}

Instructions:
- Extract the core task from the user's input
- Clean up and clarify the title (remove filler words like "I need to", "I should", etc.)
- Infer category, priority, complexity, and energy level from context
- Parse any mentioned deadlines into ISO format
- If deadline words like "today", "tomorrow", "next week" are used, convert to actual dates
- Be conservative with complexity and energy estimates
- Set confidence based on how clear the input is

Input to parse: "{input}"

{format_instructions}

Remember: Return ONLY the JSON object, no additional text.
`);
  }

  /**
   * Parse a natural language string into a structured task
   */
  async parseTask(input: string, userContext?: {
    timezone?: string;
    preferredCategories?: string[];
  }): Promise<ParsedTask> {
    try {
      console.log(`🤖 Parsing task: "${input}"`);

      // Get current date for deadline parsing
      const currentDate = new Date().toISOString();
      const timezone = userContext?.timezone || 'UTC';

      // Get format instructions from the parser
      const formatInstructions = this.parser.getFormatInstructions();

      // Create the full prompt
      const fullPrompt = await this.prompt.format({
        input,
        currentDate,
        timezone,
        format_instructions: formatInstructions
      });

      // Call the AI model
      const response = await this.model.invoke(fullPrompt);
      
      // Parse the response using our structured parser
      const parsedTask = await this.parser.parse(response.content as string);

      console.log(`✅ Successfully parsed task:`, {
        title: parsedTask.title,
        category: parsedTask.category,
        priority: parsedTask.priority,
        confidence: parsedTask.confidence
      });

      return parsedTask;

    } catch (error) {
      console.error('❌ Error parsing task:', error);
      
      // Return a fallback parsed task
      return await this.createFallbackTask(input);
    }
  }

  /**
   * Parse multiple tasks from a single input (e.g., "I need to buy groceries, call mom, and finish homework")
   */
  async parseMultipleTasks(input: string, userContext?: {
    timezone?: string;
    preferredCategories?: string[];
  }): Promise<ParsedTask[]> {
    try {
      console.log(`🤖 Parsing multiple tasks from: "${input}"`);

      // First, ask AI to split the input into individual tasks
      const splittingPrompt = `
        Break down this input into individual, separate tasks. Return as a simple array of strings.
        
        Input: "${input}"
        
        Return format: ["task 1", "task 2", "task 3"]
        
        Only return the JSON array, no other text.
      `;

      const splittingResponse = await this.model.invoke(splittingPrompt);
      let individualTasks: string[];

      try {
        individualTasks = JSON.parse(splittingResponse.content as string);
      } catch {
        // Fallback: split by common separators
        individualTasks = input.split(/[,;]|and(?=\s)|then(?=\s)/).map(t => t.trim()).filter(t => t.length > 0);
      }

      // Parse each individual task
      const parsedTasks = await Promise.all(
        individualTasks.map(task => this.parseTask(task, userContext))
      );

      console.log(`✅ Successfully parsed ${parsedTasks.length} tasks`);
      return parsedTasks;

    } catch (error) {
      console.error('❌ Error parsing multiple tasks:', error);
      
      // Return a single fallback task
      return [await this.createFallbackTask(input)];
    }
  }

  /**
   * Convert ParsedTask to CreateTaskRequest format for the database
   */
  convertToCreateRequest(parsedTask: ParsedTask, userId: string): CreateTaskRequest {
    return {
      title: parsedTask.title,
      description: parsedTask.description || `Generated from: "${parsedTask.title}"`,
      category: parsedTask.category,
      priority: parsedTask.priority,
      complexity: parsedTask.complexity,
      energy_required: parsedTask.energy_required,
      estimated_duration: parsedTask.estimated_duration,
      deadline: parsedTask.deadline,
      created_from: 'ai'
    };
  }

  /**
   * Clean title using AI when possible, fallback to rules
   */
  private async cleanTaskTitle(input: string): Promise<string> {
    try {
      // Quick AI call to clean the title
      const cleaningPrompt = `Convert this task description into a concise 2-4 word title:

Input: "${input}"

Rules:
- Remove time references ("today", "tomorrow", "by Friday")
- Remove action words ("I need to", "do", "get") 
- Remove articles ("my", "the")
- Keep essential action if needed ("Call mom", "Book appointment")
- Capitalize properly
- Be concise but clear

Examples:
"I need to do laundry by tomorrow" → "Laundry"
"Need to order skincare products today" → "Order Skincare Products"
"I should call mom this evening" → "Call Mom"
"Get groceries from the store" → "Grocery Shopping"

Return ONLY the cleaned title, nothing else.`;

      const response = await this.model.invoke(cleaningPrompt);
      const cleanedTitle = response.content.toString().trim().replace(/^["']|["']$/g, '');
      
      if (cleanedTitle && cleanedTitle.length > 0 && cleanedTitle.length < 50) {
        console.log(`🤖 AI cleaned title: "${input}" → "${cleanedTitle}"`);
        return cleanedTitle;
      }
    } catch (error) {
      console.warn('Failed to clean title with AI, using fallback:', error);
    }

    // Fallback to rule-based cleaning
    return this.ruleBasedTitleCleaning(input);
  }

  /**
   * Rule-based title cleaning as fallback
   */
  private ruleBasedTitleCleaning(input: string): string {
    let cleanTitle = input
      .replace(/^(I need to|I should|I want to|I have to|I must|Please|Can you|Help me)\s+/i, '')
      .replace(/\s+(please|thanks?|thank you)\.?$/i, '')
      .replace(/\s+(by|on|before)\s+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2}).*$/i, '') // Remove deadline part
      .replace(/^(do|doing|get|getting|need to|order)\s+(my|the|some)?\s*/i, '') // Remove action words + articles
      .replace(/^(my|the|some)\s+/i, '') // Remove remaining articles
      .trim();
    
    // Capitalize first letter and make more concise
    if (cleanTitle) {
      cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
      // Handle common patterns
      cleanTitle = cleanTitle.replace(/^Laundry.*$/i, 'Laundry');
      cleanTitle = cleanTitle.replace(/^Grocery.*$/i, 'Grocery Shopping');
      cleanTitle = cleanTitle.replace(/^Skincare.*$/i, 'Order Skincare Products');
      cleanTitle = cleanTitle.replace(/^Homework.*$/i, 'Homework');
      cleanTitle = cleanTitle.replace(/^Call.*$/i, match => match); // Keep "Call mom", etc.
    }
    
    return cleanTitle || input;
  }

  /**
   * Create a fallback task when AI parsing fails
   */
  private async createFallbackTask(input: string): Promise<ParsedTask> {
    // Use AI to clean the title
    const cleanTitle = await this.cleanTaskTitle(input);

    // Simple deadline detection
    let deadline: string | undefined;
    const deadlineMatches = input.match(/(by|on|before)\s+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2})/i);
    if (deadlineMatches) {
      const timeRef = deadlineMatches[2].toLowerCase();
      if (timeRef === 'today') {
        deadline = new Date().toISOString();
      } else if (timeRef === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        deadline = tomorrow.toISOString();
      }
    }

    // Simple priority detection
    let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    if (/urgent|asap|immediately|critical|important/i.test(input)) {
      priority = 'high';
    } else if (/sometime|later|eventually|when I can/i.test(input)) {
      priority = 'low';
    }

    // Simple category detection
    let category: any = 'general';
    if (/work|job|meeting|presentation|report/i.test(input)) category = 'work';
    else if (/buy|grocery|shop|purchase/i.test(input)) category = 'personal';
    else if (/call|email|text|message/i.test(input)) category = 'social';
    else if (/exercise|workout|gym|run/i.test(input)) category = 'health';
    else if (/learn|study|read|research/i.test(input)) category = 'learning';
    else if (/clean|laundry|dishes|organize/i.test(input)) category = 'personal';

    return {
      title: cleanTitle,
      description: `Parsed from: "${input}"`,
      category,
      priority,
      complexity: 'moderate',
      energy_required: 'medium',
      deadline,
      confidence: 0.7 // Higher confidence for fallback since we did some basic parsing
    };
  }

  /**
   * Validate and clean user input before processing
   */
  validateInput(input: string): { isValid: boolean; error?: string; cleanedInput?: string } {
    const cleaned = input.trim();
    
    if (!cleaned) {
      return { isValid: false, error: 'Input cannot be empty' };
    }
    
    if (cleaned.length < 3) {
      return { isValid: false, error: 'Task description too short' };
    }
    
    if (cleaned.length > 500) {
      return { isValid: false, error: 'Task description too long (max 500 characters)' };
    }
    
    // Remove common filler phrases
    const cleanedInput = cleaned
      .replace(/^(I need to|I should|I want to|I have to|I must|Please|Can you|Help me)\s+/i, '')
      .replace(/\s+(please|thanks?|thank you)\.?$/i, '')
      .trim();
    
    return { isValid: true, cleanedInput };
  }
}

// Export a singleton instance
export const taskParsingService = new TaskParsingService();