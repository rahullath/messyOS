// Health Data OCR Processor for Huawei Watch Screenshots
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

interface HealthDataExtraction {
  sleep?: {
    duration_hours: number;
    quality?: string;
    deep_sleep?: number;
    light_sleep?: number;
    rem_sleep?: number;
  };
  heart_rate?: {
    avg: number;
    min: number;
    max: number;
    resting?: number;
  };
  stress?: {
    level: number;
    status: string; // "Low", "Normal", "High"
  };
  steps?: {
    count: number;
    distance?: number;
    calories?: number;
  };
  workout?: {
    type: string;
    duration_minutes: number;
    calories?: number;
    avg_heart_rate?: number;
  };
  other?: {
    metric: string;
    value: number;
    unit: string;
  }[];
}

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
    
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const dataType = formData.get('data_type') as string; // 'sleep', 'heart_rate', 'stress', 'steps', 'workout'
    const textData = formData.get('text_data') as string; // If user provides OCR text directly
    
    // Get authenticated user
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), { status: 401 });
    }

    let extractedData: HealthDataExtraction;

    if (textData) {
      // Process provided text data
      extractedData = await processHealthText(textData, dataType);
    } else if (image) {
      // Process image with OCR
      extractedData = await processHealthImage(image, dataType);
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Either image or text_data is required'
      }), { status: 400 });
    }

    // Store extracted data in Supabase
    const storageResults = await storeHealthData(supabase, user.id, extractedData);

    return new Response(JSON.stringify({
      success: true,
      extracted_data: extractedData,
      storage_results: storageResults,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Health OCR processor error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Health data processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Process health data from text (OCR output or manual input)
async function processHealthText(text: string, dataType: string): Promise<HealthDataExtraction> {
  const prompt = `
  Extract health data from this Huawei Health app text. The data type is: ${dataType}

  Text: "${text}"

  Extract relevant health metrics and return as JSON. Be smart about parsing different formats:

  For SLEEP data, look for:
  - Sleep duration (hours and minutes)
  - Sleep quality ratings
  - Deep sleep, light sleep, REM sleep percentages or times
  - Sleep efficiency

  For HEART RATE data, look for:
  - Average heart rate (bpm)
  - Minimum heart rate
  - Maximum heart rate
  - Resting heart rate

  For STRESS data, look for:
  - Stress level (0-100 scale)
  - Stress status (Low/Normal/High)

  For STEPS data, look for:
  - Step count
  - Distance walked
  - Calories burned

  For WORKOUT data, look for:
  - Exercise type
  - Duration
  - Calories burned
  - Average heart rate during workout

  Return JSON in this format:
  {
    "sleep": {
      "duration_hours": number,
      "quality": string,
      "deep_sleep": number,
      "light_sleep": number,
      "rem_sleep": number
    },
    "heart_rate": {
      "avg": number,
      "min": number,
      "max": number,
      "resting": number
    },
    "stress": {
      "level": number,
      "status": string
    },
    "steps": {
      "count": number,
      "distance": number,
      "calories": number
    },
    "workout": {
      "type": string,
      "duration_minutes": number,
      "calories": number,
      "avg_heart_rate": number
    },
    "other": [
      {
        "metric": string,
        "value": number,
        "unit": string
      }
    ]
  }

  Only include sections that have data. Convert all time durations to appropriate units.

  Examples:
  - "6h 30min" → 6.5 hours
  - "72 bpm" → 72
  - "8,547 steps" → 8547
  - "Stress: 27 Low" → level: 27, status: "Low"
  `;

  const response = await llm.invoke(prompt);
  
  try {
    return JSON.parse(response.content as string);
  } catch (error) {
    console.error('Failed to parse health data:', error);
    return {};
  }
}

// Process health data from image using Gemini Vision
async function processHealthImage(image: File, dataType: string): Promise<HealthDataExtraction> {
  // Convert image to base64
  const arrayBuffer = await image.arrayBuffer();
  const base64Image = Buffer.from(arrayBuffer).toString('base64');
  
  const prompt = `
  This is a screenshot from Huawei Health app showing ${dataType} data. 
  
  Extract all visible health metrics and return as structured JSON.
  
  Look for:
  - Numbers with units (bpm, hours, minutes, steps, calories, etc.)
  - Status indicators (Low/Normal/High stress, Good/Poor sleep quality)
  - Percentages and ratios
  - Time durations
  - Any other health-related metrics visible

  Return the data in the same JSON format as specified in the text processing function.
  Be precise with number extraction and unit conversion.
  `;

  // Note: This would require Gemini Vision API which might need different setup
  // For now, we'll return a placeholder that suggests manual text input
  console.log('Image processing would require Gemini Vision API setup');
  
  return {
    other: [{
      metric: 'image_processing_note',
      value: 0,
      unit: 'Please use text input for now - image processing requires additional setup'
    }]
  };
}

// Store extracted health data in Supabase
async function storeHealthData(supabase: any, userId: string, data: HealthDataExtraction) {
  const results = {
    sleep: 0,
    heart_rate: 0,
    stress: 0,
    steps: 0,
    workout: 0,
    other: 0
  };

  const timestamp = new Date().toISOString();

  // Store sleep data
  if (data.sleep) {
    await supabase.from('metrics').insert({
      user_id: userId,
      type: 'sleep_duration',
      value: data.sleep.duration_hours * 60, // Convert to minutes
      unit: 'minutes',
      category: 'Health',
      metadata: {
        quality: data.sleep.quality,
        deep_sleep: data.sleep.deep_sleep,
        light_sleep: data.sleep.light_sleep,
        rem_sleep: data.sleep.rem_sleep
      },
      recorded_at: timestamp
    });
    results.sleep++;
  }

  // Store heart rate data
  if (data.heart_rate) {
    const heartRateMetrics = [
      { type: 'heart_rate_avg', value: data.heart_rate.avg },
      { type: 'heart_rate_min', value: data.heart_rate.min },
      { type: 'heart_rate_max', value: data.heart_rate.max }
    ];

    if (data.heart_rate.resting) {
      heartRateMetrics.push({ type: 'heart_rate_resting', value: data.heart_rate.resting });
    }

    for (const metric of heartRateMetrics) {
      if (metric.value) {
        await supabase.from('metrics').insert({
          user_id: userId,
          type: metric.type,
          value: metric.value,
          unit: 'bpm',
          category: 'Health',
          recorded_at: timestamp
        });
        results.heart_rate++;
      }
    }
  }

  // Store stress data
  if (data.stress) {
    await supabase.from('metrics').insert({
      user_id: userId,
      type: 'stress_level',
      value: data.stress.level,
      unit: 'score',
      category: 'Health',
      metadata: {
        status: data.stress.status
      },
      recorded_at: timestamp
    });
    results.stress++;
  }

  // Store steps data
  if (data.steps) {
    const stepsMetrics = [
      { type: 'steps', value: data.steps.count, unit: 'count' }
    ];

    if (data.steps.distance) {
      stepsMetrics.push({ type: 'distance_walked', value: data.steps.distance, unit: 'km' });
    }

    if (data.steps.calories) {
      stepsMetrics.push({ type: 'calories_burned', value: data.steps.calories, unit: 'kcal' });
    }

    for (const metric of stepsMetrics) {
      if (metric.value) {
        await supabase.from('metrics').insert({
          user_id: userId,
          type: metric.type,
          value: metric.value,
          unit: metric.unit,
          category: 'Health',
          recorded_at: timestamp
        });
        results.steps++;
      }
    }
  }

  // Store workout data
  if (data.workout) {
    await supabase.from('metrics').insert({
      user_id: userId,
      type: 'workout',
      value: data.workout.duration_minutes,
      unit: 'minutes',
      category: 'Health',
      metadata: {
        workout_type: data.workout.type,
        calories: data.workout.calories,
        avg_heart_rate: data.workout.avg_heart_rate
      },
      recorded_at: timestamp
    });
    results.workout++;
  }

  // Store other metrics
  if (data.other && data.other.length > 0) {
    for (const metric of data.other) {
      await supabase.from('metrics').insert({
        user_id: userId,
        type: metric.metric,
        value: metric.value,
        unit: metric.unit,
        category: 'Health',
        recorded_at: timestamp
      });
      results.other++;
    }
  }

  return results;
}

// GET endpoint for health data analysis
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'recent';
    
    // Get authenticated user
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), { status: 401 });
    }

    switch (action) {
      case 'recent':
        // Get recent health data
        const { data: recentData } = await supabase
          .from('metrics')
          .select('*')
          .eq('user_id', user.id)
          .eq('category', 'Health')
          .gte('recorded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order('recorded_at', { ascending: false });

        return new Response(JSON.stringify({
          success: true,
          recent_data: recentData || [],
          count: recentData?.length || 0
        }), { status: 200 });

      case 'summary':
        // Get health data summary
        const summary = await getHealthSummary(supabase, user.id);
        return new Response(JSON.stringify({
          success: true,
          summary
        }), { status: 200 });

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid action'
        }), { status: 400 });
    }

  } catch (error) {
    console.error('Health data GET error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch health data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Get health data summary
async function getHealthSummary(supabase: any, userId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: healthData } = await supabase
    .from('metrics')
    .select('*')
    .eq('user_id', userId)
    .eq('category', 'Health')
    .gte('recorded_at', sevenDaysAgo);

  if (!healthData || healthData.length === 0) {
    return {
      message: 'No health data available',
      suggestions: [
        'Start logging health data using the OCR processor',
        'Take screenshots of your Huawei Health app',
        'Use the text input method for quick data entry'
      ]
    };
  }

  // Group by type and calculate averages
  const grouped = healthData.reduce((acc: any, item: any) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item.value);
    return acc;
  }, {});

  const summary: any = {};
  
  Object.entries(grouped).forEach(([type, values]: [string, any]) => {
    const avg = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
    summary[type] = {
      average: Math.round(avg * 100) / 100,
      count: values.length,
      latest: values[values.length - 1]
    };
  });

  return {
    period: 'Last 7 days',
    metrics: summary,
    total_entries: healthData.length,
    data_quality: healthData.length > 10 ? 'Good' : 'Needs more data'
  };
}