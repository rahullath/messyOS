/**
 * Proactive Auto-Scheduling Service
 * AI-powered task scheduling that considers user context, energy patterns, and calendar conflicts
 * This replaces manual time management with intelligent automated planning
 */

import { z } from 'zod';
import { TaskReasoningService } from './task-reasoning-service';
import { supabase } from '../supabase/client';
import type { Task, CalendarEvent } from '../../types/task-management';

// Schema for optimal scheduling suggestions
const SchedulingSuggestionSchema = z.object({
  task_id: z.string(),
  suggested_slots: z.array(z.object({
    start_time: z.string(),
    end_time: z.string(),
    confidence_score: z.number().min(0).max(1),
    reasoning: z.string(),
    energy_alignment: z.enum(['low', 'medium', 'high']),
    conflict_risk: z.enum(['none', 'minor', 'major']),
    optimal_factors: z.array(z.string())
  })),
  decomposed_sessions: z.array(z.object({
    session_title: z.string(),
    duration_minutes: z.number(),
    sequence_order: z.number(),
    dependencies: z.array(z.string()),
    energy_requirement: z.enum(['low', 'medium', 'high'])
  })).optional()
});

type SchedulingSuggestion = z.infer<typeof SchedulingSuggestionSchema>;

export class AutoSchedulerService {
  /**
   * Main entry point: Analyze a task and provide intelligent scheduling suggestions
   */
  static async suggestOptimalScheduling(
    userId: string, 
    task: Task,
    contextOptions: {
      considerEnergyPatterns?: boolean;
      considerHabits?: boolean;
      decomposeComplexTasks?: boolean;
      lookAheadDays?: number;
    } = {}
  ): Promise<SchedulingSuggestion> {
    
    // Set defaults
    const options = {
      considerEnergyPatterns: true,
      considerHabits: true,
      decomposeComplexTasks: true,
      lookAheadDays: 7,
      ...contextOptions
    };

    try {
      // 1. Gather comprehensive context
      const context = await this.gatherUserContext(userId, options.lookAheadDays);
      
      // 2. Use AI to analyze and suggest optimal scheduling
      const suggestion = await this.generateSchedulingSuggestion(task, context, options);
      
      // 3. Validate and return
      return SchedulingSuggestionSchema.parse(suggestion);
      
    } catch (error) {
      console.error('Auto-scheduling failed:', error);
      
      // Fallback: Basic scheduling without AI
      return this.generateBasicScheduling(task);
    }
  }

  /**
   * Automatically schedule a task by selecting the best suggested slot
   */
  static async autoScheduleTask(
    userId: string,
    task: Task,
    approvalThreshold: number = 0.7
  ): Promise<{ scheduled: boolean; reasoning: string; slot?: any }> {
    
    const suggestions = await this.suggestOptimalScheduling(userId, task);
    
    // Find the highest confidence slot above threshold
    const bestSlot = suggestions.suggested_slots
      .filter(slot => slot.confidence_score >= approvalThreshold)
      .sort((a, b) => b.confidence_score - a.confidence_score)[0];

    if (!bestSlot) {
      return {
        scheduled: false,
        reasoning: `No high-confidence slots found (threshold: ${approvalThreshold}). Manual review suggested.`
      };
    }

    try {
      // Schedule the task using existing calendar integration
      const response = await fetch('/api/tasks/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: task.id,
          start_time: bestSlot.start_time,
          end_time: bestSlot.end_time,
          title: task.title,
          description: `AI-scheduled: ${bestSlot.reasoning}`
        })
      });

      if (response.ok) {
        return {
          scheduled: true,
          reasoning: bestSlot.reasoning,
          slot: bestSlot
        };
      } else {
        throw new Error('Failed to schedule via API');
      }
    } catch (error) {
      return {
        scheduled: false,
        reasoning: `Scheduling failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Gather comprehensive context from all available data sources
   */
  private static async gatherUserContext(userId: string, lookAheadDays: number) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + lookAheadDays);

    const [calendarData, energyData, habitsData, tasksData] = await Promise.allSettled([
      // Calendar events
      supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('start_time', new Date().toISOString())
        .lte('start_time', endDate.toISOString()),
        
      // Energy patterns (if available)
      supabase
        .from('energy_patterns')
        .select('*')
        .eq('user_id', userId),
        
      // Habits data (basic integration for now)
      supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .limit(10),
        
      // Existing tasks for context
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'in_progress'])
        .limit(20)
    ]);

    return {
      calendar_events: calendarData.status === 'fulfilled' ? calendarData.value.data || [] : [],
      energy_patterns: energyData.status === 'fulfilled' ? energyData.value.data || [] : [],
      habits: habitsData.status === 'fulfilled' ? habitsData.value.data || [] : [],
      existing_tasks: tasksData.status === 'fulfilled' ? tasksData.value.data || [] : [],
      time_window: { start: new Date().toISOString(), end: endDate.toISOString() }
    };
  }

  /**
   * Use AI to generate intelligent scheduling suggestions
   */
  private static async generateSchedulingSuggestion(
    task: Task, 
    context: any, 
    options: any
  ): Promise<SchedulingSuggestion> {
    
    const prompt = `
You are an intelligent scheduling assistant. Analyze this task and provide optimal scheduling suggestions.

TASK TO SCHEDULE:
- Title: ${task.title}
- Description: ${task.description || 'None provided'}
- Category: ${task.category}
- Priority: ${task.priority}
- Complexity: ${task.complexity}
- Energy Required: ${task.energy_required}
- Estimated Duration: ${task.estimated_duration || 60} minutes
- Deadline: ${task.deadline || 'None specified'}

USER CONTEXT:
- Calendar Events: ${context.calendar_events.length} events in next 7 days
- Energy Patterns: ${context.energy_patterns.length} recorded patterns
- Existing Tasks: ${context.existing_tasks.length} pending tasks
- Time Window: ${context.time_window.start} to ${context.time_window.end}

SCHEDULING REQUIREMENTS:
${options.decomposeComplexTasks && task.complexity === 'complex' ? 
  '- COMPLEX TASK: Break into smaller focused sessions' : 
  '- Schedule as single session'
}
${options.considerEnergyPatterns ? 
  '- Match energy requirements to optimal times' : 
  '- Standard time preferences'
}

CALENDAR CONFLICTS TO AVOID:
${context.calendar_events.map((event: any) => 
  `- ${event.title}: ${event.start_time} to ${event.end_time}`
).join('\n')}

Please provide scheduling suggestions with the following JSON structure:
{
  "task_id": "${task.id}",
  "suggested_slots": [
    {
      "start_time": "2024-XX-XXTXX:XX:XX.XXXZ",
      "end_time": "2024-XX-XXTXX:XX:XX.XXXZ", 
      "confidence_score": 0.85,
      "reasoning": "Optimal slot because...",
      "energy_alignment": "high",
      "conflict_risk": "none",
      "optimal_factors": ["morning focus time", "no conflicts", "pre-deadline"]
    }
  ]
  ${options.decomposeComplexTasks && task.complexity === 'complex' ? `,
  "decomposed_sessions": [
    {
      "session_title": "Research Phase",
      "duration_minutes": 90,
      "sequence_order": 1,
      "dependencies": [],
      "energy_requirement": "high"
    }
  ]` : ''}
}

Provide 2-3 high-quality suggestions ranked by confidence. Focus on HELPING THE USER ACTUALLY COMPLETE THIS TASK.
`;

    try {
      const aiResponse = await TaskReasoningService.reasonAboutTask(task, prompt);
      
      // Extract JSON from AI response (handle potential markdown formatting)
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)\n```/) || aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      
      const suggestion = JSON.parse(jsonStr);
      
      // Ensure we have valid time slots
      if (!suggestion.suggested_slots || suggestion.suggested_slots.length === 0) {
        throw new Error('No scheduling slots provided by AI');
      }

      return suggestion;
      
    } catch (error) {
      console.error('AI scheduling failed:', error);
      throw error;
    }
  }

  /**
   * Fallback scheduling when AI fails
   */
  private static generateBasicScheduling(task: Task): SchedulingSuggestion {
    const now = new Date();
    const tomorrow9am = new Date(now);
    tomorrow9am.setDate(now.getDate() + 1);
    tomorrow9am.setHours(9, 0, 0, 0);
    
    const endTime = new Date(tomorrow9am);
    endTime.setMinutes(endTime.getMinutes() + (task.estimated_duration || 60));

    return {
      task_id: task.id,
      suggested_slots: [{
        start_time: tomorrow9am.toISOString(),
        end_time: endTime.toISOString(),
        confidence_score: 0.6,
        reasoning: 'Fallback scheduling: Tomorrow morning (no AI analysis)',
        energy_alignment: 'medium' as const,
        conflict_risk: 'minor' as const,
        optimal_factors: ['morning time', 'fallback option']
      }]
    };
  }

  /**
   * Batch auto-schedule multiple tasks intelligently  
   */
  static async batchAutoSchedule(
    userId: string, 
    tasks: Task[],
    options: { approvalThreshold?: number; prioritizeBy?: 'deadline' | 'priority' | 'ai_ranking' } = {}
  ): Promise<Array<{ task: Task; result: any }>> {
    
    // Sort tasks by the specified criteria
    const sortedTasks = this.sortTasksForScheduling(tasks, options.prioritizeBy || 'ai_ranking');
    
    const results = [];
    
    for (const task of sortedTasks) {
      try {
        const result = await this.autoScheduleTask(userId, task, options.approvalThreshold);
        results.push({ task, result });
        
        // Add delay to prevent overwhelming the AI service
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        results.push({ 
          task, 
          result: { 
            scheduled: false, 
            reasoning: `Batch scheduling failed: ${error}` 
          }
        });
      }
    }
    
    return results;
  }

  /**
   * Sort tasks for optimal batch scheduling
   */
  private static sortTasksForScheduling(tasks: Task[], prioritizeBy: string): Task[] {
    switch (prioritizeBy) {
      case 'deadline':
        return tasks.sort((a, b) => {
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        });
        
      case 'priority':
        const priorityOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3 };
        return tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        
      default: // ai_ranking
        return tasks.sort((a, b) => {
          // Complex urgent tasks first, then by priority and deadline
          const aScore = (a.complexity === 'complex' ? 10 : 0) + 
                        (a.priority === 'urgent' ? 8 : a.priority === 'high' ? 6 : 4) +
                        (a.deadline ? 2 : 0);
          const bScore = (b.complexity === 'complex' ? 10 : 0) + 
                        (b.priority === 'urgent' ? 8 : b.priority === 'high' ? 6 : 4) +
                        (b.deadline ? 2 : 0);
          return bScore - aScore;
        });
    }
  }
}