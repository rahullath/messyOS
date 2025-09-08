import type { CreateTaskRequest, Task } from '../../types/task-management';
import { TaskService } from '../task-management/task-service';

// This is a placeholder for a real AI service integration
// In a real application, this would call an external AI API (e.g., OpenAI, Anthropic)
const mockAIService = {
  async parseTaskFromString(input: string): Promise<Partial<CreateTaskRequest>> {
    console.log(`Parsing task from string: "${input}"`);
    // Simple keyword-based parsing for demonstration
    const lowerInput = input.toLowerCase();
    const task: Partial<CreateTaskRequest> = {
      title: input,
      description: `Parsed from natural language: "${input}"`,
      category: 'general',
      priority: 'medium',
    };

    // Deadline extraction
    const deadlineKeywords = ['due', 'by', 'on'];
    for (const keyword of deadlineKeywords) {
      if (lowerInput.includes(keyword)) {
        const parts = lowerInput.split(keyword);
        if (parts.length > 1) {
          const dateString = parts[1].trim();
          // This is a very basic date parser, a more robust one would be needed
          try {
            task.deadline = new Date(dateString).toISOString();
          } catch (e) {
            console.warn(`Could not parse date from "${dateString}"`);
          }
        }
      }
    }

    // Priority extraction
    if (lowerInput.includes('urgent') || lowerInput.includes('asap')) {
      task.priority = 'urgent';
    } else if (lowerInput.includes('high priority')) {
      task.priority = 'high';
    } else if (lowerInput.includes('low priority')) {
      task.priority = 'low';
    }

    return task;
  },
};

export class NaturalLanguageParser {
  /**
   * Creates a task from a natural language string by parsing it with an AI service.
   */
  static async createTaskFromNaturalLanguage(userId: string, input: string): Promise<Task> {
    const parsedTaskData = await mockAIService.parseTaskFromString(input);

    if (!parsedTaskData.title) {
      throw new Error('Could not parse a title from the input string.');
    }

    const createTaskRequest: CreateTaskRequest = {
      title: parsedTaskData.title,
      description: parsedTaskData.description,
      category: parsedTaskData.category || 'general',
      priority: parsedTaskData.priority || 'medium',
      deadline: parsedTaskData.deadline,
      created_from: 'natural_language',
    };

    return TaskService.createTask(userId, createTaskRequest);
  }
}
