// src/pages/api/habits/analytics/export.ts - Export analytics data
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    
    // Get the user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { format = 'csv', dateRange = 90 } = body;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    // Fetch habits
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (habitsError) {
      throw new Error('Failed to fetch habits');
    }

    // Fetch habit entries with all context data
    const { data: entries, error: entriesError } = await supabase
      .from('habit_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (entriesError) {
      throw new Error('Failed to fetch habit entries');
    }

    if (format === 'csv') {
      const csvData = generateCSV(habits || [], entries || []);
      
      return new Response(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="habits-analytics-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else if (format === 'json') {
      const jsonData = {
        exportDate: new Date().toISOString(),
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        habits: habits || [],
        entries: entries || [],
        summary: generateSummary(habits || [], entries || [])
      };

      return new Response(JSON.stringify(jsonData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="habits-analytics-${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    }

    return new Response(JSON.stringify({ error: 'Unsupported format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({ error: 'Export failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

function generateCSV(habits: any[], entries: any[]): string {
  // Create habit lookup
  const habitLookup = new Map(habits.map(h => [h.id, h]));

  // CSV headers
  const headers = [
    'Date',
    'Habit Name',
    'Habit Category',
    'Habit Type',
    'Value',
    'Completed',
    'Effort',
    'Mood',
    'Energy Level',
    'Location',
    'Weather',
    'Context Tags',
    'Duration Minutes',
    'Completion Time',
    'Notes'
  ];

  // Generate CSV rows
  const rows = entries.map(entry => {
    const habit = habitLookup.get(entry.habit_id);
    return [
      entry.date,
      habit?.name || 'Unknown',
      habit?.category || '',
      habit?.type || '',
      entry.value,
      entry.value === 1 ? 'Yes' : 'No',
      entry.effort || '',
      entry.mood || '',
      entry.energy_level || '',
      entry.location || '',
      entry.weather || '',
      entry.context_tags ? entry.context_tags.join(';') : '',
      entry.duration_minutes || '',
      entry.completion_time || '',
      entry.notes || ''
    ];
  });

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
}

function generateSummary(habits: any[], entries: any[]) {
  const totalHabits = habits.length;
  const totalEntries = entries.length;
  const successfulEntries = entries.filter(e => e.value === 1).length;
  const avgCompletionRate = totalEntries > 0 ? successfulEntries / totalEntries : 0;

  // Calculate streaks
  const habitStreaks = habits.map(habit => {
    const habitEntries = entries
      .filter(e => e.habit_id === habit.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let maxStreak = 0;
    let currentStreak = 0;
    
    habitEntries.forEach(entry => {
      if (entry.value === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });
    
    return { habitName: habit.name, maxStreak };
  });

  const longestStreak = Math.max(...habitStreaks.map(h => h.maxStreak), 0);
  const bestStreakHabit = habitStreaks.find(h => h.maxStreak === longestStreak);

  // Calculate completion rates by habit
  const habitCompletionRates = habits.map(habit => {
    const habitEntries = entries.filter(e => e.habit_id === habit.id);
    const rate = habitEntries.length > 0 ? 
      habitEntries.filter(e => e.value === 1).length / habitEntries.length : 0;
    return { habitName: habit.name, completionRate: rate, totalEntries: habitEntries.length };
  });

  const mostConsistentHabit = habitCompletionRates.reduce((prev, current) => 
    current.completionRate > prev.completionRate ? current : prev, 
    { habitName: 'None', completionRate: 0, totalEntries: 0 }
  );

  return {
    totalHabits,
    totalEntries,
    successfulEntries,
    avgCompletionRate: Math.round(avgCompletionRate * 100),
    longestStreak,
    bestStreakHabit: bestStreakHabit?.habitName || 'None',
    mostConsistentHabit: mostConsistentHabit.habitName,
    mostConsistentRate: Math.round(mostConsistentHabit.completionRate * 100),
    habitCompletionRates: habitCompletionRates.map(h => ({
      ...h,
      completionRate: Math.round(h.completionRate * 100)
    }))
  };
}