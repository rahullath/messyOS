// src/pages/api/tasks/ai-assistant.ts
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { Tables } from '../../../types/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
  try {
    
    

    const { type = 'productivity_analysis' } = await request.json();

    // Fetch comprehensive task data
    const [tasksResult, sessionsResult, habitsResult] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('task_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('started_at', { ascending: false }),
      
      supabase
        .from('habits')
        .select('name, streak_count, category')
        .eq('user_id', user.id)
        .eq('is_active', true)
    ]);

    const tasks = tasksResult.data || [];
    const sessions = sessionsResult.data || [];
    const habits = habitsResult.data || [];

    const llm = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-pro",
      temperature: 0.1,
      apiKey: process.env.GEMINI_API_KEY,
    });

    let analysisPrompt = '';
    let responseFormat = {};

    switch (type) {
      case 'productivity_analysis':
        analysisPrompt = `
        Analyze this user's task and productivity patterns:

        TASKS DATA:
        ${JSON.stringify(tasks.map((t: any) => ({
          title: t.title,
          category: t.category,
          priority: t.priority,
          status: t.status,
          estimated_duration: t.estimated_duration,
          actual_duration: t.actual_duration,
          energy_required: t.energy_required,
          complexity: t.complexity,
          created_at: t.created_at,
          completed_at: t.completed_at
        })), null, 2)}

        WORK SESSIONS DATA:
        ${JSON.stringify(sessions.map((s: any) => ({
          duration: s.duration,
          session_type: s.session_type,
          productivity_score: s.productivity_score,
          energy_level: s.energy_level,
          interruptions: s.interruptions,
          started_at: s.started_at
        })), null, 2)}

        HABITS CONTEXT:
        ${JSON.stringify(habits, null, 2)}

        Provide productivity insights in this JSON format:
        {
          "insights": [
            {
              "type": "productivity_pattern",
              "title": "Peak Productivity Hours",
              "description": "Detailed analysis with specific data",
              "recommendation": "Specific actionable advice",
              "confidence": 0.85
            }
          ],
          "optimizations": [
            {
              "area": "time_management",
              "current_issue": "Description of current problem",
              "solution": "Specific solution",
              "expected_impact": "Expected improvement",
              "difficulty": "easy"
            }
          ],
          "task_recommendations": [
            {
              "task_title": "Suggested task title",
              "category": "Suggested category",
              "priority": "medium",
              "reasoning": "Why this task is recommended",
              "optimal_time": "Best time to do this task"
            }
          ],
          "focus_suggestions": {
            "today": "What to focus on today",
            "this_week": "Weekly focus area",
            "energy_optimization": "How to optimize energy levels"
          }
        }

        Focus on:
        1. Productivity patterns and peak hours
        2. Task completion efficiency
        3. Energy management
        4. Time estimation accuracy
        5. Category-based performance
        `;
        break;

      case 'task_prioritization':
        const incompleteTasks = tasks.filter((t: Tables<'tasks'>) => t.status !== 'completed');
        analysisPrompt = `
        Help prioritize these incomplete tasks based on urgency, importance, and user patterns:

        INCOMPLETE TASKS:
        ${JSON.stringify(incompleteTasks, null, 2)}

        USER PRODUCTIVITY PATTERNS:
        ${JSON.stringify(sessions.slice(-20), null, 2)}

        Provide prioritization in this JSON format:
        {
          "prioritized_tasks": [
            {
              "task_id": "task_uuid",
              "priority_score": 95,
              "reasoning": "Why this task should be prioritized",
              "optimal_time": "Best time to work on this",
              "estimated_focus_time": "How long to focus on this"
            }
          ],
          "scheduling_suggestions": {
            "morning": ["task_id1", "task_id2"],
            "afternoon": ["task_id3"],
            "evening": ["task_id4"]
          },
          "energy_matching": [
            {
              "energy_level": "high",
              "recommended_tasks": ["task_id1"],
              "reasoning": "Why these tasks match this energy level"
            }
          ]
        }
        `;
        break;

      case 'time_blocking':
        analysisPrompt = `
        Create an optimal time-blocking schedule for today based on tasks and patterns:

        PENDING TASKS:
        ${JSON.stringify(tasks.filter((t: Tables<'tasks'>) => t.status === 'todo' || t.status === 'in_progress'), null, 2)}

        PRODUCTIVITY PATTERNS:
        ${JSON.stringify(sessions, null, 2)}

        Current time: ${new Date().toISOString()}

        Create a time-blocking schedule in this JSON format:
        {
          "schedule": [
            {
              "time": "09:00",
              "duration": 90,
              "task_id": "task_uuid",
              "task_title": "Task name",
              "reasoning": "Why this time slot",
              "energy_match": "high"
            }
          ],
          "breaks": [
            {
              "time": "10:30",
              "duration": 15,
              "type": "short_break",
              "suggestion": "Walk or stretch"
            }
          ],
          "daily_focus": "Main theme for the day",
          "energy_optimization": "How to maintain energy throughout the day"
        }
        `;
        break;

      default:
        return new Response(JSON.stringify({
          error: 'Invalid analysis type'
        }), { status: 400 });
    }

    try {
      const response = await llm.invoke(analysisPrompt);
      const analysis = JSON.parse(response.content as string);
      
      return new Response(JSON.stringify({
        success: true,
        type,
        analysis,
        generated_at: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (aiError) {
      console.error('AI analysis error:', aiError);
      
      // Fallback analysis
      const fallbackAnalysis = generateFallbackAnalysis(tasks, sessions, type);
      
      return new Response(JSON.stringify({
        success: true,
        type,
        analysis: fallbackAnalysis,
        fallback: true,
        generated_at: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
};

function generateFallbackAnalysis(tasks: any[], sessions: any[], type: string) {
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const incompleteTasks = tasks.filter(t => t.status !== 'completed');
  const avgSessionDuration = sessions.length > 0 
    ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length / 60 
    : 0;

  switch (type) {
    case 'productivity_analysis':
      return {
        insights: [
          {
            type: "task_completion",
            title: "Task Completion Rate",
            description: `You have completed ${completedTasks.length} out of ${tasks.length} tasks (${Math.round((completedTasks.length / tasks.length) * 100)}%)`,
            recommendation: completedTasks.length / tasks.length > 0.7 
              ? "Great completion rate! Keep maintaining this momentum."
              : "Focus on completing smaller tasks first to build momentum.",
            confidence: 0.9
          },
          {
            type: "session_duration",
            title: "Work Session Analysis",
            description: `Your average work session is ${Math.round(avgSessionDuration)} minutes`,
            recommendation: avgSessionDuration < 25 
              ? "Try longer focused sessions (25-45 minutes) for better deep work."
              : "Good session length! Consider the Pomodoro technique for optimization.",
            confidence: 0.8
          }
        ],
        optimizations: [
          {
            area: "task_management",
            current_issue: "Task backlog management",
            solution: "Break large tasks into smaller, actionable items",
            expected_impact: "20-30% improvement in completion rate",
            difficulty: "easy"
          }
        ],
        task_recommendations: [
          {
            task_title: "Review and organize task list",
            category: "Planning",
            priority: "medium",
            reasoning: "Regular task review improves productivity",
            optimal_time: "Morning or end of day"
          }
        ],
        focus_suggestions: {
          today: "Complete 2-3 high-priority tasks",
          this_week: "Establish consistent work rhythms",
          energy_optimization: "Match task complexity to your energy levels"
        }
      };

    case 'task_prioritization':
      return {
        prioritized_tasks: incompleteTasks.slice(0, 5).map((task, index) => ({
          task_id: task.id,
          priority_score: 90 - (index * 10),
          reasoning: `Priority based on ${task.priority} priority and ${task.category} category`,
          optimal_time: task.energy_required === 'high' ? 'Morning' : 'Afternoon',
          estimated_focus_time: `${task.estimated_duration || 60} minutes`
        })),
        scheduling_suggestions: {
          morning: incompleteTasks.filter(t => t.energy_required === 'high').slice(0, 2).map(t => t.id),
          afternoon: incompleteTasks.filter(t => t.energy_required === 'medium').slice(0, 2).map(t => t.id),
          evening: incompleteTasks.filter(t => t.energy_required === 'low').slice(0, 1).map(t => t.id)
        },
        energy_matching: [
          {
            energy_level: "high",
            recommended_tasks: incompleteTasks.filter(t => t.complexity === 'complex').slice(0, 2).map(t => t.id),
            reasoning: "Complex tasks require high energy and focus"
          }
        ]
      };

    case 'time_blocking':
      const now = new Date();
      const startHour = now.getHours() < 9 ? 9 : now.getHours() + 1;
      
      return {
        schedule: incompleteTasks.slice(0, 4).map((task, index) => ({
          time: `${String(startHour + (index * 2)).padStart(2, '0')}:00`,
          duration: task.estimated_duration || 60,
          task_id: task.id,
          task_title: task.title,
          reasoning: `Scheduled based on ${task.priority} priority`,
          energy_match: task.energy_required
        })),
        breaks: [
          {
            time: `${String(startHour + 1).padStart(2, '0')}:30`,
            duration: 15,
            type: "short_break",
            suggestion: "Take a walk or do light stretching"
          }
        ],
        daily_focus: "Complete high-priority tasks with focused work sessions",
        energy_optimization: "Start with high-energy tasks, then move to lighter work"
      };

    default:
      return { message: "Analysis type not supported in fallback mode" };
  }
}
