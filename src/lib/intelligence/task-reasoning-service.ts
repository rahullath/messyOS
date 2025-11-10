// TaskReasoningService - Uses Gemini for advanced reasoning about tasks
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ParsedTask } from './task-parsing-service';
import type { Task } from '../../types/task-management';

interface UserTaskContext {
  recentTasks: Task[];
  completionPatterns: {
    avgCompletionTime: { [category: string]: number };
    priorityAccuracy: { [priority: string]: number };
    complexityAccuracy: { [complexity: string]: number };
  };
  preferences: {
    preferredCategories: string[];
    workingHours: { start: string; end: string };
    productiveTime: string[]; // e.g., ['morning', 'afternoon']
  };
  currentSchedule?: {
    busySlots: Array<{ start: string; end: string }>;
    freeSlots: Array<{ start: string; end: string; duration: number }>;
  };
}

interface ReasoningResult {
  suggestedPriority: 'low' | 'medium' | 'high' | 'urgent';
  suggestedDuration: number; // minutes
  suggestedComplexity: 'simple' | 'moderate' | 'complex';
  suggestedEnergyLevel: 'low' | 'medium' | 'high';
  reasoningExplanation: string;
  confidence: number;
  schedulingSuggestions: {
    bestTimeSlots: Array<{ start: string; end: string; reason: string }>;
    shouldScheduleToday: boolean;
    urgencyReason?: string;
  };
}

interface TaskBreakdown {
  subtasks: Array<{
    title: string;
    description: string;
    estimatedDuration: number;
    order: number;
  }>;
  totalEstimatedDuration: number;
  complexity: 'simple' | 'moderate' | 'complex';
  reasoning: string;
}

export class TaskReasoningService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(import.meta.env.GEMINI_API_KEY);
  }

  private cleanJsonResponse(text: string): string {
    // Remove markdown code blocks
    return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  }

  /**
   * Enhance a parsed task with intelligent reasoning
   */
  async enhanceTaskWithReasoning(
    parsedTask: ParsedTask, 
    userContext: Partial<UserTaskContext>
  ): Promise<ParsedTask & { reasoning: ReasoningResult }> {
    try {
      console.log(`🧠 Enhancing task with reasoning: "${parsedTask.title}"`);

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
You are an expert task management consultant. Analyze this task and provide intelligent reasoning.

TASK TO ANALYZE:
Title: "${parsedTask.title}"
Description: "${parsedTask.description || 'None provided'}"
Current category: ${parsedTask.category}
Current priority: ${parsedTask.priority}
Current complexity: ${parsedTask.complexity}
Current energy required: ${parsedTask.energy_required}
Current duration estimate: ${parsedTask.estimated_duration || 'None'}

USER CONTEXT:
${userContext.recentTasks ? `Recent tasks: ${userContext.recentTasks.map(t => `${t.title} (${t.category}, ${t.priority})`).join(', ')}` : 'No recent tasks'}
${userContext.preferences ? `Preferred categories: ${userContext.preferences.preferredCategories?.join(', ')}` : ''}
${userContext.preferences?.workingHours ? `Working hours: ${userContext.preferences.workingHours.start}-${userContext.preferences.workingHours.end}` : ''}

Current date: ${new Date().toISOString()}

Please analyze this task and return a JSON object with the following structure:
{
  "suggestedPriority": "low|medium|high|urgent",
  "suggestedDuration": number (in minutes),
  "suggestedComplexity": "simple|moderate|complex",
  "suggestedEnergyLevel": "low|medium|high",
  "reasoningExplanation": "Explain why you made these suggestions",
  "confidence": number between 0-1,
  "schedulingSuggestions": {
    "bestTimeSlots": [{"start": "HH:MM", "end": "HH:MM", "reason": "why this time"}],
    "shouldScheduleToday": boolean,
    "urgencyReason": "explanation if urgent"
  }
}

Consider:
- Keywords indicating urgency ("urgent", "asap", "deadline", etc.)
- Task complexity (research, creative work = complex; simple admin = simple)
- Typical duration for similar tasks
- Energy requirements (deep work = high, admin = low)
- Time sensitivity and deadlines
- Best times of day for different task types

Return ONLY the JSON object, no other text.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const reasoning = JSON.parse(this.cleanJsonResponse(response.text())) as ReasoningResult;

      console.log(`✅ Task reasoning completed with confidence: ${reasoning.confidence}`);

      // Return enhanced task with reasoning
      return {
        ...parsedTask,
        // Update fields if reasoning has higher confidence
        priority: reasoning.confidence > 0.7 ? reasoning.suggestedPriority : parsedTask.priority,
        estimated_duration: reasoning.confidence > 0.6 ? reasoning.suggestedDuration : parsedTask.estimated_duration,
        complexity: reasoning.confidence > 0.7 ? reasoning.suggestedComplexity : parsedTask.complexity,
        energy_required: reasoning.confidence > 0.7 ? reasoning.suggestedEnergyLevel : parsedTask.energy_required,
        reasoning
      };

    } catch (error) {
      console.error('❌ Error in task reasoning:', error);
      
      // Return original task with basic reasoning
      return {
        ...parsedTask,
        reasoning: this.createBasicReasoning(parsedTask)
      };
    }
  }

  /**
   * Break down a complex task into subtasks
   */
  async breakdownComplexTask(task: ParsedTask | Task): Promise<TaskBreakdown> {
    try {
      console.log(`🔧 Breaking down complex task: "${task.title}"`);

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
You are an expert at breaking down complex tasks into manageable subtasks.

TASK TO BREAK DOWN:
Title: "${task.title}"
Description: "${task.description || 'None provided'}"
Category: ${task.category}
Estimated duration: ${task.estimated_duration || 'Unknown'} minutes

Break this task into logical, actionable subtasks that can be completed individually.

Requirements:
- Each subtask should be specific and actionable
- Subtasks should be in logical order
- Each subtask should take 15-90 minutes
- Include realistic duration estimates
- Provide clear descriptions

Return a JSON object with this structure:
{
  "subtasks": [
    {
      "title": "Clear, actionable subtask title",
      "description": "Detailed description of what to do",
      "estimatedDuration": number (in minutes),
      "order": number (1, 2, 3...)
    }
  ],
  "totalEstimatedDuration": number (sum of all subtask durations),
  "complexity": "simple|moderate|complex",
  "reasoning": "Explanation of how you broke down the task"
}

Return ONLY the JSON object, no other text.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const breakdown = JSON.parse(this.cleanJsonResponse(response.text())) as TaskBreakdown;

      console.log(`✅ Task breakdown completed: ${breakdown.subtasks.length} subtasks`);
      return breakdown;

    } catch (error) {
      console.error('❌ Error in task breakdown:', error);
      
      // Return a basic breakdown
      return {
        subtasks: [
          {
            title: task.title,
            description: task.description || 'Complete the main task',
            estimatedDuration: task.estimated_duration || 60,
            order: 1
          }
        ],
        totalEstimatedDuration: task.estimated_duration || 60,
        complexity: task.complexity || 'moderate',
        reasoning: 'Unable to break down further - treating as single task'
      };
    }
  }

  /**
   * Suggest optimal scheduling for a task based on user patterns and current schedule
   */
  async suggestOptimalScheduling(
    task: ParsedTask | Task,
    userContext: UserTaskContext
  ): Promise<{
    recommendedSlots: Array<{
      start: string;
      end: string;
      day: string;
      reason: string;
      confidence: number;
    }>;
    reasoning: string;
  }> {
    try {
      console.log(`📅 Suggesting optimal scheduling for: "${task.title}"`);

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
You are a scheduling optimization expert. Suggest the best times to schedule this task.

TASK:
Title: "${task.title}"
Category: ${task.category}
Priority: ${task.priority}
Complexity: ${task.complexity}
Energy required: ${task.energy_required}
Duration: ${task.estimated_duration || 60} minutes
Deadline: ${task.deadline || 'No specific deadline'}

USER CONTEXT:
Working hours: ${userContext.preferences.workingHours.start}-${userContext.preferences.workingHours.end}
Productive times: ${userContext.preferences.productiveTime.join(', ')}
${userContext.currentSchedule?.freeSlots ? `Available slots: ${JSON.stringify(userContext.currentSchedule.freeSlots)}` : ''}

Consider:
- Task energy requirements vs. user's productive times
- Task category and appropriate scheduling (e.g., creative work in morning, admin anytime)
- Priority level and urgency
- Available time slots
- Task duration requirements

Return JSON:
{
  "recommendedSlots": [
    {
      "start": "HH:MM",
      "end": "HH:MM", 
      "day": "today|tomorrow|day_name",
      "reason": "why this slot is optimal",
      "confidence": number (0-1)
    }
  ],
  "reasoning": "Overall explanation of scheduling strategy"
}

Return ONLY the JSON object.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const scheduling = JSON.parse(this.cleanJsonResponse(response.text()));

      console.log(`✅ Scheduling suggestions generated: ${scheduling.recommendedSlots.length} slots`);
      return scheduling;

    } catch (error) {
      console.error('❌ Error in scheduling suggestions:', error);
      
      // Return basic scheduling
      return {
        recommendedSlots: [
          {
            start: "09:00",
            end: "10:00",
            day: "today",
            reason: "Default morning slot",
            confidence: 0.5
          }
        ],
        reasoning: "Unable to analyze optimal scheduling - suggesting default slot"
      };
    }
  }

  /**
   * Create basic reasoning when AI fails
   */
  private createBasicReasoning(task: ParsedTask): ReasoningResult {
    return {
      suggestedPriority: task.priority,
      suggestedDuration: task.estimated_duration || 60,
      suggestedComplexity: task.complexity,
      suggestedEnergyLevel: task.energy_required,
      reasoningExplanation: 'Basic reasoning applied - AI enhancement unavailable',
      confidence: 0.3,
      schedulingSuggestions: {
        bestTimeSlots: [
          { start: '09:00', end: '10:00', reason: 'Default morning slot' }
        ],
        shouldScheduleToday: false
      }
    };
  }

  /**
   * Analyze user's task completion patterns to improve future suggestions
   */
  async analyzeUserPatterns(
    userId: string,
    completedTasks: Task[]
  ): Promise<{
    patterns: UserTaskContext['completionPatterns'];
    insights: string[];
    suggestions: string[];
  }> {
    try {
      console.log(`📊 Analyzing patterns for ${completedTasks.length} completed tasks`);

      // Calculate basic patterns
      const patterns: UserTaskContext['completionPatterns'] = {
        avgCompletionTime: {},
        priorityAccuracy: {},
        complexityAccuracy: {}
      };

      // Group by category
      const tasksByCategory = completedTasks.reduce((acc, task) => {
        if (!acc[task.category]) acc[task.category] = [];
        acc[task.category].push(task);
        return acc;
      }, {} as Record<string, Task[]>);

      // Calculate average completion times by category
      Object.entries(tasksByCategory).forEach(([category, tasks]) => {
        const completedTasksWithDuration = tasks.filter(t => t.actual_duration);
        if (completedTasksWithDuration.length > 0) {
          patterns.avgCompletionTime[category] = 
            completedTasksWithDuration.reduce((sum, t) => sum + (t.actual_duration || 0), 0) / 
            completedTasksWithDuration.length;
        }
      });

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const prompt = `
Analyze these task completion patterns and provide insights:

TASK DATA:
${JSON.stringify(patterns, null, 2)}

Number of completed tasks: ${completedTasks.length}
Categories: ${Object.keys(tasksByCategory).join(', ')}

Provide insights about the user's:
- Task completion efficiency
- Category preferences and performance
- Time estimation accuracy
- Areas for improvement

Return JSON:
{
  "insights": ["insight 1", "insight 2", ...],
  "suggestions": ["suggestion 1", "suggestion 2", ...]
}
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const analysis = JSON.parse(this.cleanJsonResponse(response.text()));

      console.log(`✅ Pattern analysis complete: ${analysis.insights.length} insights`);

      return {
        patterns,
        insights: analysis.insights,
        suggestions: analysis.suggestions
      };

    } catch (error) {
      console.error('❌ Error analyzing user patterns:', error);
      
      return {
        patterns: {
          avgCompletionTime: {},
          priorityAccuracy: {},
          complexityAccuracy: {}
        },
        insights: ['Unable to analyze patterns - need more completion data'],
        suggestions: ['Complete more tasks to enable pattern analysis']
      };
    }
  }
}

// Export singleton instance
export const taskReasoningService = new TaskReasoningService();