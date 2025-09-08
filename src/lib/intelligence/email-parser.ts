import type { CreateTaskRequest, Task } from '../../types/task-management';
import { TaskService } from '../task-management/task-service';

interface EmailContent {
  from: string;
  subject: string;
  body: string;
}

// This is a placeholder for a real AI service integration
const mockAIService = {
  async parseTaskFromEmail(email: EmailContent): Promise<Partial<CreateTaskRequest>> {
    console.log(`Parsing task from email with subject: "${email.subject}"`);
    const task: Partial<CreateTaskRequest> = {
      title: email.subject,
      description: `From: ${email.from}\n\n${email.body}`,
      category: 'email',
      priority: 'medium',
    };

    // Simple keyword-based parsing for demonstration
    const lowerBody = email.body.toLowerCase();
    if (lowerBody.includes('urgent') || lowerBody.includes('asap')) {
      task.priority = 'urgent';
    }

    return task;
  },
};

export class EmailParser {
  /**
   * Creates a task from an email by parsing its content with an AI service.
   */
  static async createTaskFromEmail(userId: string, email: EmailContent): Promise<Task> {
    const parsedTaskData = await mockAIService.parseTaskFromEmail(email);

    if (!parsedTaskData.title) {
      throw new Error('Could not parse a title from the email subject.');
    }

    const createTaskRequest: CreateTaskRequest = {
      title: parsedTaskData.title,
      description: parsedTaskData.description,
      category: parsedTaskData.category || 'email',
      priority: parsedTaskData.priority || 'medium',
      created_from: 'email',
    };

    return TaskService.createTask(userId, createTaskRequest);
  }
}
