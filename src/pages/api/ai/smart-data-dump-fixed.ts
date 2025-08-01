// Fixed Smart Data Dumping API - Handles workout data properly
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-1.5-pro',
  temperature: 0.1,
  apiKey: process.env.GEMINI_API_KEY,
});

export const POST: APIRoute = async ({ request, cookies }) => {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
  try {
    
    const { data_dump, context } = await request.json();
    

    console.log('🗣️ Processing fixed data dump from Rahul...');
    console.log('Input:', data_dump);

    // Use manual parsing for health data (more reliable)
    const parsedData = await parseHealthDataManually(data_dump);
    
    // Store in Supabase
    const storageResults = await storeHealthData(supabase, user.id, parsedData);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Data dump processed successfully with manual parsing',
      parsed_data: parsedData,
      storage_results: storageResults,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Smart data dump error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Data dump processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Manual parsing specifically for your workout data format
async function parseHealthDataManually(text: string) {
  const data: any = { health: [], habits: [] };
  const timestamp = new Date().toISOString();
  
  console.log('Parsing text:', text);
  
  // Parse sleep duration - "Sleep - 11hrs 18 minutes"
  const sleepMatch = text.match(/Sleep\s*-\s*(\d+)hrs?\s*(\d+)?\s*min/i);
  if (sleepMatch) {
    const hours = parseInt(sleepMatch[1]);
    const minutes = sleepMatch[2] ? parseInt(sleepMatch[2]) : 0;
    const totalMinutes = hours * 60 + minutes;
    
    data.health.push({
      type: 'sleep_duration',
      value: totalMinutes,
      unit: 'minutes',
      notes: `${hours}hrs ${minutes}min`,
      timestamp
    });
    console.log('Found sleep:', totalMinutes, 'minutes');
  }
  
  // Parse heart rate range - "Heart rate - 52-142"
  const heartRateMatch = text.match(/Heart\s*rate\s*-\s*(\d+)-(\d+)/i);
  if (heartRateMatch) {
    const min = parseInt(heartRateMatch[1]);
    const max = parseInt(heartRateMatch[2]);
    
    data.health.push({
      type: 'heart_rate_min',
      value: min,
      unit: 'bpm',
      timestamp
    });
    
    data.health.push({
      type: 'heart_rate_max',
      value: max,
      unit: 'bpm',
      timestamp
    });
    
    // Also add average
    data.health.push({
      type: 'heart_rate_avg',
      value: Math.round((min + max) / 2),
      unit: 'bpm',
      timestamp
    });
    
    console.log('Found heart rate:', min, '-', max, 'bpm');
  }
  
  // Parse stress levels - "Stress 15-42 levels"
  const stressMatch = text.match(/Stress\s*(\d+)-(\d+)\s*levels/i);
  if (stressMatch) {
    const min = parseInt(stressMatch[1]);
    const max = parseInt(stressMatch[2]);
    const avg = Math.round((min + max) / 2);
    
    data.health.push({
      type: 'stress_level',
      value: avg,
      unit: 'score',
      notes: `${min}-${max} range`,
      timestamp
    });
    console.log('Found stress:', avg, 'average');
  }
  
  // Parse steps - "Walking - 3130 steps"
  const stepsMatch = text.match(/Walking\s*-\s*(\d+)\s*steps/i);
  if (stepsMatch) {
    data.health.push({
      type: 'steps',
      value: parseInt(stepsMatch[1]),
      unit: 'count',
      timestamp
    });
    console.log('Found steps:', stepsMatch[1]);
  }
  
  // Parse cycling - "Cycling - 5 minutes"
  const cyclingMatch = text.match(/Cycling\s*-\s*(\d+)\s*minutes?/i);
  if (cyclingMatch) {
    data.health.push({
      type: 'workout',
      value: parseInt(cyclingMatch[1]),
      unit: 'minutes',
      notes: 'Cycling warmup',
      timestamp
    });
    console.log('Found cycling:', cyclingMatch[1], 'minutes');
  }
  
  // Parse main workout
  if (text.toLowerCase().includes('workout') || text.toLowerCase().includes('leg') || text.toLowerCase().includes('shoulders')) {
    const workoutNotes = [];
    
    // Extract all exercise details
    const exercises = [
      'Dumbbell Overhead Press',
      'Dumbbell Lateral Raise', 
      'Leg Curls',
      'Romanian Deadlift'
    ];
    
    exercises.forEach(exercise => {
      const regex = new RegExp(exercise + '[^.]*', 'i');
      const match = text.match(regex);
      if (match) {
        workoutNotes.push(match[0]);
      }
    });
    
    // Add stretches if mentioned
    if (text.toLowerCase().includes('stretch')) {
      workoutNotes.push('Stretches: World\'s greatest stretch, sphinx stretch, lying pigeon stretch, hamstring stretch');
    }
    
    // Estimate workout duration based on exercises
    let workoutDuration = 45; // Base duration
    if (workoutNotes.length > 3) workoutDuration = 60;
    if (text.toLowerCase().includes('leg') && text.toLowerCase().includes('shoulders')) workoutDuration = 75;
    
    data.health.push({
      type: 'workout',
      value: workoutDuration,
      unit: 'minutes',
      notes: `Leg and shoulders day: ${workoutNotes.join(', ')}`,
      timestamp
    });
    console.log('Found workout:', workoutDuration, 'minutes');
  }
  
  // Add habit for completing workout
  if (data.health.some((h: any) => h.type === 'workout')) {
    data.habits.push({
      name: 'Gym workout',
      completed: true,
      value: 1,
      notes: 'Leg and shoulders day completed',
      timestamp
    });
  }
  
  console.log('Parsed data:', data);
  return data;
}

// Store health data in Supabase
async function storeHealthData(supabase: any, userId: string, data: any) {
  const results = {
    health: 0,
    habits: 0
  };

  // Store health metrics
  if (data.health && data.health.length > 0) {
    for (const health of data.health) {
      try {
        await supabase
          .from('metrics')
          .insert({
            user_id: userId,
            type: health.type,
            value: health.value,
            unit: health.unit,
            category: 'Health',
            metadata: { notes: health.notes },
            recorded_at: health.timestamp
          });
        
        results.health++;
        console.log('Stored health metric:', health.type, health.value);
      } catch (error) {
        console.error('Error storing health metric:', error);
      }
    }
  }

  // Store habits
  if (data.habits && data.habits.length > 0) {
    for (const habit of data.habits) {
      try {
        // First, ensure habit exists
        const { data: existingHabit } = await supabase
          .from('habits')
          .select('id')
          .eq('user_id', userId)
          .eq('name', habit.name)
          .single();

        let habitId = existingHabit?.id;

        if (!habitId) {
          // Create new habit
          const { data: newHabit } = await supabase
            .from('habits')
            .insert({
              user_id: userId,
              name: habit.name,
              category: 'Fitness',
              type: 'build',
              is_active: true
            })
            .select('id')
            .single();
          
          habitId = newHabit?.id;
        }

        if (habitId) {
          // Log habit entry
          await supabase
            .from('habit_entries')
            .insert({
              user_id: userId,
              habit_id: habitId,
              value: habit.value || (habit.completed ? 1 : 0),
              notes: habit.notes,
              logged_at: habit.timestamp
            });
          
          results.habits++;
          console.log('Stored habit entry:', habit.name);
        }
      } catch (error) {
        console.error('Error storing habit:', error);
      }
    }
  }

  return results;
}
