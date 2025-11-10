// API endpoint for data export functionality
import type { APIRoute } from 'astro';
import { crossModuleService } from '../../../lib/cross-module/integration-service';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../types/supabase';
import type { ExportData } from '../../../types/cross-module';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const exportRequest: ExportData = await request.json();
    const { format, modules, date_range, include_insights, include_achievements, include_correlations } = exportRequest;

    // Collect data based on requested modules
    const exportData: any = {
      user_id: user.id,
      export_date: new Date().toISOString(),
      date_range,
      modules: {}
    };

    // Export habits data
    if (modules.includes('habits')) {
      const { data: habits } = await supabase
        .from('habits')
        .select(`
          *,
          habit_entries(*)
        `)
        .eq('user_id', user.id);

      const { data: habitEntries } = await supabase
        .from('habit_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', date_range.start)
        .lte('date', date_range.end);

      exportData.modules.habits = {
        habits: habits || [],
        entries: habitEntries || []
      };
    }

    // Export tasks data
    if (modules.includes('tasks')) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', date_range.start)
        .lte('created_at', date_range.end);

      exportData.modules.tasks = tasks || [];
    }

    // Export health metrics
    if (modules.includes('health')) {
      const { data: metrics } = await supabase
        .from('metrics')
        .select('*')
        .eq('user_id', user.id)
        .eq('category', 'health')
        .gte('recorded_at', date_range.start)
        .lte('recorded_at', date_range.end);

      exportData.modules.health = metrics || [];
    }

    // Export content data
    if (modules.includes('content')) {
      const { data: content } = await supabase
        .from('content_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', date_range.start)
        .lte('created_at', date_range.end);

      exportData.modules.content = content || [];
    }

    // Add life optimization scores
    const scores = await crossModuleService.getLifeScoreHistory(
      user.id, 
      Math.ceil((new Date(date_range.end).getTime() - new Date(date_range.start).getTime()) / (1000 * 60 * 60 * 24))
    );
    exportData.life_scores = scores.filter(s => 
      s.score_date >= date_range.start && s.score_date <= date_range.end
    );

    // Add achievements if requested
    if (include_achievements) {
      const achievements = await crossModuleService.getUserAchievements(user.id);
      exportData.achievements = achievements.filter(a => 
        a.earned_at >= date_range.start && a.earned_at <= date_range.end
      );
    }

    // Add correlations if requested
    if (include_correlations) {
      const correlations = await crossModuleService.getCorrelations(user.id);
      exportData.correlations = correlations;
    }

    // Add insights if requested
    if (include_insights) {
      const correlationAnalysis = await crossModuleService.calculateCorrelations(user.id);
      exportData.insights = correlationAnalysis.insights;
    }

    // Format data based on requested format
    let responseData: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'json':
        responseData = JSON.stringify(exportData, null, 2);
        contentType = 'application/json';
        filename = `messyos-export-${date_range.start}-to-${date_range.end}.json`;
        break;

      case 'csv':
        responseData = convertToCSV(exportData);
        contentType = 'text/csv';
        filename = `messyos-export-${date_range.start}-to-${date_range.end}.csv`;
        break;

      default:
        throw new Error('Unsupported export format');
    }

    // Return the file directly
    return new Response(responseData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Export API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

function convertToCSV(data: any): string {
  const csvRows: string[] = [];
  
  // Add header
  csvRows.push('Module,Type,Date,Name,Value,Details');

  // Process habits data
  if (data.modules.habits) {
    data.modules.habits.entries.forEach((entry: any) => {
      const habit = data.modules.habits.habits.find((h: any) => h.id === entry.habit_id);
      csvRows.push([
        'habits',
        'entry',
        entry.date,
        habit?.name || 'Unknown',
        entry.value,
        JSON.stringify({
          effort: entry.effort,
          mood: entry.mood,
          energy_level: entry.energy_level,
          location: entry.location,
          notes: entry.notes
        })
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
    });
  }

  // Process tasks data
  if (data.modules.tasks) {
    data.modules.tasks.forEach((task: any) => {
      csvRows.push([
        'tasks',
        'task',
        task.created_at.split('T')[0],
        task.title,
        task.status,
        JSON.stringify({
          priority: task.priority,
          category: task.category,
          due_date: task.due_date,
          completed_at: task.completed_at
        })
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
    });
  }

  // Process life scores
  data.life_scores.forEach((score: any) => {
    csvRows.push([
      'life_scores',
      'score',
      score.score_date,
      'Overall Score',
      score.overall_score,
      JSON.stringify({
        habits_score: score.habits_score,
        tasks_score: score.tasks_score,
        health_score: score.health_score,
        productivity_score: score.productivity_score,
        content_score: score.content_score
      })
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
  });

  // Process achievements
  if (data.achievements) {
    data.achievements.forEach((achievement: any) => {
      csvRows.push([
        'achievements',
        'earned',
        achievement.earned_at.split('T')[0],
        achievement.achievement?.name || 'Unknown',
        achievement.achievement?.reward_tokens || 0,
        JSON.stringify({
          category: achievement.achievement?.category,
          rarity: achievement.achievement?.rarity,
          description: achievement.achievement?.description
        })
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));
    });
  }

  return csvRows.join('\n');
}