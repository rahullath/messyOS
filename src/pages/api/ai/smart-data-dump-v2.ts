// Enhanced Smart Data Dumping API - Better parsing for workout and health data
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/multi-user';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';

// Enhanced schemas for Rahul's specific data types
const DataDumpSchema = z.object({
  habits: z.array(z.object({
    name: z.string(),
    completed: z.boolean(),
    value: z.number().optional(),
    notes: z.string().optional(),
    timestamp: z.string()
  })).optional(),
  
  health: z.array(z.object({
    type: z.enum(['sleep_duration', 'heart_rate_avg', 'heart_rate_min', 'heart_rate_max', 'stress_level', 'steps', 'weight', 'workout', 'protein', 'water', 'medication']),
    value: z.number(),
    unit: z.string().optional(),
    notes: z.string().optional(),
    timestamp: z.string()
  })).optional(),
  
  finance: z.array(z.object({
    type: z.enum(['expense', 'income', 'crypto_value', 'subscription']),
    amount: z.number(),
    category: z.string(),
    description: z.string(),
    merchant: z.string().optional(),
    timestamp: z.string()
  })).optional(),
  
  tasks: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    category: z.enum(['work', 'university', 'visa', 'cat', 'personal', 'coding', 'streaming_platform', 'crypto_bot']),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    due_date: z.string().optional(),
    project: z.string().optional()
  })).optional(),
  
  content: z.array(z.object({
    title: z.string(),
    type: z.enum(['movie', 'series', 'book', 'anime']),
    status: z.enum(['watching', 'completed', 'planned', 'dropped']),
    rating: z.number().min(1).max(10).optional(),
    review: z.string().optional(),
    genre: z.array(z.string()).optional(),
    platform: z.string().optional()
  })).optional(),
  
  groceries: z.array(z.object({
    item: z.string(),
    quantity: z.number().optional(),
    status: z.enum(['have', 'need', 'running_low']),
    category: z.enum(['cat_food', 'cat_litter', 'protein', 'vegetables', 'staples', 'snacks'])
  })).optional(),
  
  crypto: z.array(z.object({
    symbol: z.string(),
    amount: z.number(),
    action: z.enum(['buy', 'sell', 'hold', 'stake']),
    price: z.number().optional(),
    notes: z.string().optional()
  })).optional()
});

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-1.5-pro',
  temperature: 0.1,
  apiKey: process.env.GEMINI_API_KEY,
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Get authenticated user
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const { data_dump, context } = await request.json();
    
    // Get authenticated user
    const supabase = serverAuth.supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), { status: 401 });
    }

    console.log('🗣️ Processing enhanced data dump from Rahul...');

    // Try smart parsing first, then fallback to manual parsing
    let parsedData;
    
    try {
      parsedData = await smartParseWithLLM(data_dump, context);
      console.log('✅ LLM parsing successful');
    } catch (error) {
      console.log('❌ LLM parsing failed, using manual parser');
      parsedData = await manualParseHealthData(data_dump);
    }
    
    // Validate with Zod
    const validatedData = DataDumpSchema.parse(parsedData);
    
    // Store in Supabase
    const storageResults = await storeStructuredData(validatedData, supabase, user.id);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Data dump processed successfully',
      parsed_data: validatedData,
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

// Smart parsing with LLM
async function smartParseWithLLM(data_dump: string, context: string) {
  const prompt = `
  You are Rahul's personal AI assistant. Parse his workout and health data dump into structured JSON.
  
  CONTEXT: ${context || 'Health and workout data entry'}
  
  DATA DUMP: "${data_dump}"
  
  CRITICAL PARSING RULES:
  1. DO NOT treat workout weights (kg) as money amounts
  2. Parse health metrics carefully:
     - "Sleep - 11hrs 18 minutes" → sleep_duration: 678 minutes
     - "Heart rate - 52-142" → heart_rate_min: 52, heart_rate_max: 142
     - "Stress 15-42 levels" → stress_level: 28.5 (average)
     - "Walking - 3130 steps" → steps: 3130
     - "Cycling - 5 minutes" → workout with notes about cycling
  
  3. Parse workout details:
     - "Dumbbell Overhead Press - 5kg * 3 sets" → workout with detailed notes
     - "Leg Curls - 23kgs * 3 sets machine" → workout exercise
     - Extract exercise names, weights, sets, reps
  
  4. Only treat actual money symbols (₹, $) as finance data
  
  Return ONLY valid JSON:
  {
    "health": [
      {"type": "sleep_duration", "value": 678, "unit": "minutes", "notes": "11hrs 18min from 3:42am to 15:02pm", "timestamp": "2025-01-15T10:00:00Z"},
      {"type": "heart_rate_min", "value": 52, "unit": "bpm", "timestamp": "2025-01-15T10:00:00Z"},
      {"type": "heart_rate_max", "value": 142, "unit": "bpm", "timestamp": "2025-01-15T10:00:00Z"},
      {"type": "stress_level", "value": 28.5, "unit": "score", "notes": "15-42 range", "timestamp": "2025-01-15T10:00:00Z"},
      {"type": "steps", "value": 3130, "unit": "count", "timestamp": "2025-01-15T10:00:00Z"},
      {"type": "workout", "value": 60, "unit": "minutes", "notes": "Leg and shoulders day: Cycling 5min, Dumbbell Overhead Press 5kg*3sets + 7.5kg*1set, Lateral Raise 3sets 2.5kg + half set 5kg, Leg Curls 23kg*3sets, Romanian Deadlift 7.5kg*3sets, Stretches", "timestamp": "2025-01-15T10:00:00Z"}
    ]
  }
  `;

  const response = await llm.invoke(prompt);
  return JSON.parse(response.content as string);
}

// Manual parsing for health data as fallback
async function manualParseHealthData(text: string) {
  const data: any = { health: [] };
  const timestamp = new Date().toISOString();
  
  // Parse sleep duration
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
  }
  
  // Parse heart rate range
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
  }
  
  // Parse stress levels
  const stressMatch = text.match(/Stress\s*(\d+)-(\d+)\s*levels/i);
  if (stressMatch) {
    const min = parseInt(stressMatch[1]);
    const max = parseInt(stressMatch[2]);
    const avg = (min + max) / 2;
    
    data.health.push({
      type: 'stress_level',
      value: avg,
      unit: 'score',
      notes: `${min}-${max} range`,
      timestamp
    });
  }
  
  // Parse steps
  const stepsMatch = text.match(/Walking\s*-\s*(\d+)\s*steps/i);
  if (stepsMatch) {
    data.health.push({
      type: 'steps',
      value: parseInt(stepsMatch[1]),
      unit: 'count',
      timestamp
    });
  }
  
  // Parse workout (general)
  if (text.toLowerCase().includes('workout') || text.toLowerCase().includes('leg day') || text.toLowerCase().includes('shoulders day')) {
    // Extract workout details
    const workoutNotes = [];
    
    // Cycling
    const cyclingMatch = text.match(/Cycling\s*-\s*(\d+)\s*minutes?/i);
    if (cyclingMatch) {
      workoutNotes.push(`Cycling ${cyclingMatch[1]}min`);
    }
    
    // Dumbbell exercises
    const dumbbellMatches = text.match(/Dumbbell\s+[\w\s]+\s*-\s*[\d.]+kg[^,.]*/gi);
    if (dumbbellMatches) {
      workoutNotes.push(...dumbbellMatches);
    }
    
    // Leg exercises
    const legMatches = text.match(/Leg\s+[\w\s]+\s*-\s*[\d.]+kgs?[^,.]*/gi);
    if (legMatches) {
      workoutNotes.push(...legMatches);
    }
    
    // Romanian Deadlift
    const rdlMatch = text.match(/Romanian\s+Deadlift[^,.]*/i);
    if (rdlMatch) {
      workoutNotes.push(rdlMatch[0]);
    }
    
    // Stretches
    if (text.toLowerCase().includes('stretch')) {
      workoutNotes.push('Various stretches');
    }
    
    data.health.push({
      type: 'workout',
      value: 60, // Estimate 60 minutes for a full workout
      unit: 'minutes',
      notes: workoutNotes.join(', '),
      timestamp
    });
  }
  
  return data;
}

// Store structured data in appropriate Supabase tables
async function storeStructuredData(data: z.infer<typeof DataDumpSchema>, supabase: any, userId: string) {
  const results = {
    habits: 0,
    health: 0,
    finance: 0,
    tasks: 0,
    content: 0,
    groceries: 0,
    crypto: 0
  };

  // Store health metrics
  if (data.health && data.health.length > 0) {
    for (const health of data.health) {
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
    }
  }

  // Store other data types (habits, finance, tasks, etc.)
  // ... (same as before)

  return results;
}

// Helper functions
function inferHabitCategory(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('gym') || lower.includes('workout') || lower.includes('exercise')) return 'Fitness';
  if (lower.includes('shower') || lower.includes('hygiene')) return 'Health';
  if (lower.includes('wake') || lower.includes('sleep')) return 'Health';
  if (lower.includes('walk')) return 'Fitness';
  if (lower.includes('smoke') || lower.includes('weed') || lower.includes('energy')) return 'Health';
  return 'Personal';
}