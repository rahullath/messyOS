// Smart Data Dumping API - Let Rahul "yap" his data and AI will structure it
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
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
    type: z.enum(['sleep', 'heart_rate', 'stress', 'steps', 'weight', 'workout', 'protein', 'water', 'medication']),
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
    const { data_dump, context } = await request.json();
    
    // Get authenticated user
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;

    console.log('🗣️ Processing data dump from Rahul...');

    // Enhanced prompt for Rahul's specific use case
    const prompt = `
    You are Rahul's personal AI assistant. Parse his unstructured data dump into structured JSON.
    
    CONTEXT: Rahul is a developer building a streaming platform, applying to UK universities, managing his cat's visa, tracking crypto, and optimizing his life.
    
    CURRENT CONTEXT: ${context || 'General data entry'}
    
    DATA DUMP: "${data_dump}"
    
    Parse this into structured data. Be smart about inferring:
    - If he mentions "gym" or workout duration → health/workout
    - If he mentions money/₹/$ → finance/expense
    - If he mentions university/visa/cat → tasks with appropriate categories
    - If he mentions shows/movies → content
    - If he mentions groceries/cat food → groceries
    - If he mentions crypto coins → crypto
    - If he mentions habits like "woke up early", "showered" → habits
    - If he mentions medication (bupropion/melatonin) → health/medication
    
    IMPORTANT RULES:
    1. Use today's date if no date specified
    2. Infer reasonable categories and priorities
    3. For crypto, recognize common symbols (BTC, ETH, SOL, etc.)
    4. For tasks, categorize as: work, university, visa, cat, personal, coding, streaming_platform, crypto_bot
    5. For content, try to identify if it's a movie/series/book/anime
    6. For groceries, categorize as: cat_food, cat_litter, protein, vegetables, staples, snacks
    
    Return ONLY valid JSON matching this schema:
    {
      "habits": [{"name": string, "completed": boolean, "value"?: number, "notes"?: string, "timestamp": string}],
      "health": [{"type": "sleep|heart_rate|stress|steps|weight|workout|protein|water|medication", "value": number, "unit"?: string, "notes"?: string, "timestamp": string}],
      "finance": [{"type": "expense|income|crypto_value|subscription", "amount": number, "category": string, "description": string, "merchant"?: string, "timestamp": string}],
      "tasks": [{"title": string, "description"?: string, "category": "work|university|visa|cat|personal|coding|streaming_platform|crypto_bot", "priority": "low|medium|high|urgent", "due_date"?: string, "project"?: string}],
      "content": [{"title": string, "type": "movie|series|book|anime", "status": "watching|completed|planned|dropped", "rating"?: number, "review"?: string, "genre"?: string[], "platform"?: string}],
      "groceries": [{"item": string, "quantity"?: number, "status": "have|need|running_low", "category": "cat_food|cat_litter|protein|vegetables|staples|snacks"}],
      "crypto": [{"symbol": string, "amount": number, "action": "buy|sell|hold|stake", "price"?: number, "notes"?: string}]
    }
    
    Example:
    Input: "Spent ₹500 on cat food, worked out 45 mins, need to apply for visa, watched Friends episode, bought 0.1 BTC"
    Output: {
      "finance": [{"type": "expense", "amount": 500, "category": "Pet Care", "description": "cat food", "timestamp": "2024-01-15T10:00:00Z"}],
      "health": [{"type": "workout", "value": 45, "unit": "minutes", "timestamp": "2024-01-15T10:00:00Z"}],
      "tasks": [{"title": "Apply for visa", "category": "visa", "priority": "high", "timestamp": "2024-01-15T10:00:00Z"}],
      "content": [{"title": "Friends", "type": "series", "status": "watching", "timestamp": "2024-01-15T10:00:00Z"}],
      "crypto": [{"symbol": "BTC", "amount": 0.1, "action": "buy", "timestamp": "2024-01-15T10:00:00Z"}]
    }
    `;

    const response = await llm.invoke(prompt);
    let parsedData;
    
    try {
      parsedData = JSON.parse(response.content as string);
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
      
    } catch (parseError) {
      console.error('Failed to parse LLM response:', parseError);
      
      // Fallback: try to extract partial data
      const fallbackData = await extractPartialData(data_dump);
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Parsing failed, used fallback extraction',
        fallback_data: fallbackData,
        raw_response: response.content
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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

  // Store habits
  if (data.habits && data.habits.length > 0) {
    for (const habit of data.habits) {
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
            category: inferHabitCategory(habit.name),
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
      }
    }
  }

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

  // Store finance data
  if (data.finance && data.finance.length > 0) {
    for (const finance of data.finance) {
      await supabase
        .from('metrics')
        .insert({
          user_id: userId,
          type: finance.type,
          value: finance.amount,
          category: finance.category,
          metadata: {
            description: finance.description,
            merchant: finance.merchant
          },
          recorded_at: finance.timestamp
        });
      
      results.finance++;
    }
  }

  // Store tasks
  if (data.tasks && data.tasks.length > 0) {
    for (const task of data.tasks) {
      await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title: task.title,
          description: task.description,
          category: task.category,
          priority: task.priority,
          status: 'todo',
          due_date: task.due_date,
          created_at: task.timestamp || new Date().toISOString()
        });
      
      results.tasks++;
    }
  }

  // Store content
  if (data.content && data.content.length > 0) {
    for (const content of data.content) {
      await supabase
        .from('content_entries')
        .insert({
          user_id: userId,
          title: content.title,
          type: content.type,
          status: content.status,
          rating: content.rating,
          genre: content.genre,
          metadata: {
            review: content.review,
            platform: content.platform
          },
          created_at: new Date().toISOString()
        });
      
      results.content++;
    }
  }

  // Store groceries (you might need to create this table)
  if (data.groceries && data.groceries.length > 0) {
    for (const grocery of data.groceries) {
      await supabase
        .from('groceries')
        .upsert({
          user_id: userId,
          item: grocery.item,
          quantity: grocery.quantity,
          status: grocery.status,
          category: grocery.category,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,item'
        });
      
      results.groceries++;
    }
  }

  // Store crypto data
  if (data.crypto && data.crypto.length > 0) {
    for (const crypto of data.crypto) {
      await supabase
        .from('metrics')
        .insert({
          user_id: userId,
          type: 'crypto_transaction',
          value: crypto.amount,
          category: 'Crypto',
          metadata: {
            symbol: crypto.symbol,
            action: crypto.action,
            price: crypto.price,
            notes: crypto.notes
          },
          recorded_at: new Date().toISOString()
        });
      
      results.crypto++;
    }
  }

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

async function extractPartialData(text: string) {
  // Simple keyword-based extraction as fallback
  const data: any = {};
  
  // Look for money amounts
  const moneyRegex = /₹?(\d+)/g;
  const moneyMatches = text.match(moneyRegex);
  if (moneyMatches) {
    data.finance = moneyMatches.map(amount => ({
      type: 'expense',
      amount: parseInt(amount.replace('₹', '')),
      category: 'Other',
      description: 'Extracted from text',
      timestamp: new Date().toISOString()
    }));
  }
  
  // Look for workout mentions
  if (text.toLowerCase().includes('gym') || text.toLowerCase().includes('workout')) {
    data.health = [{
      type: 'workout',
      value: 30, // default
      timestamp: new Date().toISOString()
    }];
  }
  
  return data;
}