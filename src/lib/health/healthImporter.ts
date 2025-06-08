// src/lib/health/healthImporter.ts - FIXED FOR REAL HUAWEI FORMAT
import { createServerClient } from '../supabase/server';
import type { AstroCookies } from 'astro';

export interface HealthData {
  sleep: Array<{
    date: string;
    duration: number; // minutes
    quality: 'poor' | 'fair' | 'good' | 'excellent';
  }>;
  heartRate: Array<{
    date: string;
    minRate: number;
    maxRate: number;
    avgRate: number;
    restingRate?: number;
  }>;
  stress: Array<{
    date: string;
    avgStress: number;
    status: 'low' | 'normal' | 'high';
    maxStress?: number;
  }>;
  steps: Array<{
    date: string;
    stepCount: number;
    target: number;
  }>;
}

export async function importHealthData(
  files: { sleep: string; heartRate: string; stress: string; steps?: string },
  userId: string,
  cookies: AstroCookies
): Promise<{ success: boolean; message: string; imported: { sleep: number; heartRate: number; stress: number; steps: number } }> {
  
  console.log('🏥 Starting health data import for user:', userId);
  
  const supabase = createServerClient(cookies);
  
  try {
    // Parse all health data with the correct format
    const sleepData = parseSleepDataReal(files.sleep);
    const heartRateData = parseHeartRateDataReal(files.heartRate);
    const stressData = parseStressDataReal(files.stress);
    const stepsData = files.steps ? parseStepsDataReal(files.steps) : [];
    
    console.log('📊 Parsed data:', {
      sleep: sleepData.length,
      heartRate: heartRateData.length,
      stress: stressData.length,
      steps: stepsData.length
    });
    
    // Clear existing health metrics to avoid duplicates
    await supabase
      .from('metrics')
      .delete()
      .eq('user_id', userId)
      .in('type', [
        'sleep_duration', 'sleep_quality', 
        'heart_rate_avg', 'heart_rate_min', 'heart_rate_max', 
        'stress_level', 'steps_count'
      ]);
    
    // Convert to metrics format
    const allMetrics = [
      // Sleep metrics
      ...sleepData.map(entry => ({
        user_id: userId,
        type: 'sleep_duration',
        value: entry.duration,
        unit: 'minutes',
        metadata: { 
          quality: entry.quality,
          hours: Math.round(entry.duration / 60 * 10) / 10
        },
        recorded_at: new Date(entry.date).toISOString()
      })),
      
      // Heart rate metrics
      ...heartRateData.flatMap(entry => [
        {
          user_id: userId,
          type: 'heart_rate_avg',
          value: entry.avgRate,
          unit: 'bpm',
          metadata: { min: entry.minRate, max: entry.maxRate },
          recorded_at: new Date(entry.date).toISOString()
        },
        {
          user_id: userId,
          type: 'heart_rate_min',
          value: entry.minRate,
          unit: 'bpm',
          metadata: { avg: entry.avgRate, max: entry.maxRate },
          recorded_at: new Date(entry.date).toISOString()
        },
        {
          user_id: userId,
          type: 'heart_rate_max',
          value: entry.maxRate,
          unit: 'bpm',
          metadata: { avg: entry.avgRate, min: entry.minRate },
          recorded_at: new Date(entry.date).toISOString()
        }
      ]),
      
      // Stress metrics
      ...stressData.map(entry => ({
        user_id: userId,
        type: 'stress_level',
        value: entry.avgStress,
        unit: 'points',
        metadata: { 
          status: entry.status,
          maxStress: entry.maxStress || entry.avgStress
        },
        recorded_at: new Date(entry.date).toISOString()
      })),
      
      // Steps metrics
      ...stepsData.map(entry => ({
        user_id: userId,
        type: 'steps_count',
        value: entry.stepCount,
        unit: 'steps',
        metadata: { 
          target: entry.target,
          achievement: Math.round((entry.stepCount / entry.target) * 100)
        },
        recorded_at: new Date(entry.date).toISOString()
      }))
    ];
    
    // Batch insert all metrics
    console.log(`📥 Inserting ${allMetrics.length} health metrics...`);
    const { error } = await supabase
      .from('metrics')
      .insert(allMetrics);
    
    if (error) {
      throw new Error(`Database insert failed: ${error.message}`);
    }
    
    // Calculate health insights
    await calculateHealthInsights(userId, cookies);
    
    return {
      success: true,
      message: `Successfully imported ${sleepData.length} sleep, ${heartRateData.length} heart rate, ${stressData.length} stress, and ${stepsData.length} step entries`,
      imported: {
        sleep: sleepData.length,
        heartRate: heartRateData.length,
        stress: stressData.length,
        steps: stepsData.length
      }
    };
    
  } catch (error: any) {
    console.error('❌ Health import error:', error);
    return {
      success: false,
      message: `Health import failed: ${error.message}`,
      imported: { sleep: 0, heartRate: 0, stress: 0, steps: 0 }
    };
  }
}

// Parse REAL sleep data format: "6 h 30 min (08/06)"
function parseSleepDataReal(content: string): HealthData['sleep'] {
  const lines = content.split('\n');
  const data: HealthData['sleep'] = [];
  
  let currentYear = new Date().getFullYear();
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Check for year headers
    if (line.includes('2025') || line.includes('2024')) {
      const yearMatch = line.match(/(\d{4})/);
      if (yearMatch) {
        currentYear = parseInt(yearMatch[1]);
      }
      continue;
    }
    
    // Parse sleep entry: "6 h 30 min (08/06)"
    const sleepMatch = line.match(/(\d+)\s*h\s*(\d+)\s*min\s*\((\d{2})\/(\d{2})\)/);
    if (sleepMatch) {
      const [, hours, minutes, day, month] = sleepMatch;
      const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
      
      // Construct ISO date
      const isoDate = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      // Determine quality based on duration
      let quality: 'poor' | 'fair' | 'good' | 'excellent';
      if (totalMinutes >= 480) quality = 'excellent';      // 8+ hours
      else if (totalMinutes >= 420) quality = 'good';      // 7+ hours
      else if (totalMinutes >= 360) quality = 'fair';      // 6+ hours
      else quality = 'poor';                               // <6 hours
      
      data.push({
        date: isoDate,
        duration: totalMinutes,
        quality
      });
    }
  }
  
  console.log('😴 Sleep data sample:', data.slice(0, 3));
  console.log('😴 Total sleep entries:', data.length);
  return data;
}

// Parse REAL heart rate format: "June 8: 55-130 bpm"
function parseHeartRateDataReal(content: string): HealthData['heartRate'] {
  const lines = content.split('\n');
  const data: HealthData['heartRate'] = [];
  
  let currentYear = new Date().getFullYear();
  let currentMonth = '';
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    console.log('🔍 Processing HR line:', line); // Debug log
    
    // Check for year headers
    if (line.includes('2025') || line.includes('2024')) {
      const yearMatch = line.match(/(\d{4})/);
      if (yearMatch) {
        currentYear = parseInt(yearMatch[1]);
        console.log('📅 Found year:', currentYear);
      }
      continue;
    }
    
    // Check for month headers (standalone month lines)
    const monthMatch = line.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{4}$/);
    if (monthMatch) {
      currentMonth = monthMatch[1];
      console.log('📅 Found month header:', currentMonth);
      continue;
    }
    
    // Parse heart rate entry: "June 8: 55-130 bpm"
    const hrMatch = line.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{1,2}):\s*(\d+)-(\d+)\s*bpm/);
    if (hrMatch) {
      const [, month, day, minRate, maxRate] = hrMatch;
      
      console.log('💓 Found HR entry:', { month, day, minRate, maxRate });
      
      // Convert month name to number
      const monthNum = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
      }[month] || '01';
      
      const isoDate = `${currentYear}-${monthNum}-${day.padStart(2, '0')}`;
      const minRateNum = parseInt(minRate);
      const maxRateNum = parseInt(maxRate);
      const avgRate = Math.round((minRateNum + maxRateNum) / 2);
      
      data.push({
        date: isoDate,
        minRate: minRateNum,
        maxRate: maxRateNum,
        avgRate,
        restingRate: minRateNum // Assuming min is resting rate
      });
      
      console.log('✅ Added HR entry:', { date: isoDate, minRate: minRateNum, maxRate: maxRateNum, avgRate });
    } else {
      console.log('❌ HR line did not match pattern:', line);
    }
  }
  
  console.log('❤️ Heart rate sample:', data.slice(0, 3));
  console.log('❤️ Total heart rate entries:', data.length);
  return data;
}

// Parse REAL stress format: "AVG 27 Low - 08/06"
function parseStressDataReal(content: string): HealthData['stress'] {
  const lines = content.split('\n');
  const data: HealthData['stress'] = [];
  
  let currentYear = new Date().getFullYear();
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Check for year headers
    if (line.includes('2025') || line.includes('2024')) {
      const yearMatch = line.match(/(\d{4})/);
      if (yearMatch) {
        currentYear = parseInt(yearMatch[1]);
      }
      continue;
    }
    
    // Parse stress entry: "AVG 27 Low - 08/06"
    const stressMatch = line.match(/AVG\s*(\d+)\s*(Low|Normal|High)\s*-\s*(\d{2})\/(\d{2})/);
    if (stressMatch) {
      const [, avgStress, status, day, month] = stressMatch;
      
      const isoDate = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      
      data.push({
        date: isoDate,
        avgStress: parseInt(avgStress),
        status: status.toLowerCase() as 'low' | 'normal' | 'high',
        maxStress: parseInt(avgStress) + 10 // Estimate max stress
      });
    }
  }
  
  console.log('😰 Stress data sample:', data.slice(0, 3));
  console.log('😰 Total stress entries:', data.length);
  return data;
}

// Parse REAL steps format: "June 8: 3,337 steps"
function parseStepsDataReal(content: string): HealthData['steps'] {
  const lines = content.split('\n');
  const data: HealthData['steps'] = [];
  
  let currentYear = new Date().getFullYear();
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Check for year headers
    if (line.includes('2025') || line.includes('2024')) {
      const yearMatch = line.match(/(\d{4})/);
      if (yearMatch) {
        currentYear = parseInt(yearMatch[1]);
      }
      continue;
    }
    
    // Parse steps entry: "June 8: 3,337 steps"
    const stepsMatch = line.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{1,2}):\s*([\d,]+)\s*steps/);
    if (stepsMatch) {
      const [, month, day, stepsStr] = stepsMatch;
      
      // Convert month name to number
      const monthNum = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
      }[month] || '01';
      
      const isoDate = `${currentYear}-${monthNum}-${day.padStart(2, '0')}`;
      const stepCount = parseInt(stepsStr.replace(/,/g, ''));
      
      data.push({
        date: isoDate,
        stepCount,
        target: 10000 // Standard step goal
      });
    }
  }
  
  console.log('🚶 Steps data sample:', data.slice(0, 3));
  console.log('🚶 Total step entries:', data.length);
  return data;
}

// Calculate health insights and correlations (same as before)
async function calculateHealthInsights(userId: string, cookies: AstroCookies) {
  console.log('🧠 Calculating health insights...');
  
  const supabase = createServerClient(cookies);
  
  // Get recent health data
  const { data: healthMetrics } = await supabase
    .from('metrics')
    .select('type, value, recorded_at, metadata')
    .eq('user_id', userId)
    .in('type', ['sleep_duration', 'heart_rate_avg', 'stress_level', 'steps_count'])
    .order('recorded_at', { ascending: false })
    .limit(90); // Last 90 days
  
  if (!healthMetrics || healthMetrics.length === 0) return;
  
  // Calculate averages and trends
  const sleepData = healthMetrics.filter(m => m.type === 'sleep_duration');
  const heartRateData = healthMetrics.filter(m => m.type === 'heart_rate_avg');
  const stressData = healthMetrics.filter(m => m.type === 'stress_level');
  const stepsData = healthMetrics.filter(m => m.type === 'steps_count');
  
  console.log('📊 Health data counts:', {
    sleep: sleepData.length,
    heartRate: heartRateData.length,
    stress: stressData.length,
    steps: stepsData.length
  });
  
  const avgSleep = sleepData.length > 0 
    ? sleepData.reduce((sum, m) => sum + m.value, 0) / sleepData.length / 60 
    : 0; // hours
    
  const avgHeartRate = heartRateData.length > 0
    ? heartRateData.reduce((sum, m) => sum + m.value, 0) / heartRateData.length
    : 0;
    
  const avgStress = stressData.length > 0
    ? stressData.reduce((sum, m) => sum + m.value, 0) / stressData.length
    : 0;
    
  const avgSteps = stepsData.length > 0
    ? stepsData.reduce((sum, m) => sum + m.value, 0) / stepsData.length
    : 0;
  
  // Store calculated insights as special metrics
  const insights = [
    {
      user_id: userId,
      type: 'health_score',
      value: calculateHealthScore(avgSleep, avgHeartRate, avgStress, avgSteps),
      unit: 'score',
      metadata: { 
        avgSleep: Math.round(avgSleep * 10) / 10,
        avgHeartRate: Math.round(avgHeartRate),
        avgStress: Math.round(avgStress),
        avgSteps: Math.round(avgSteps),
        calculatedAt: new Date().toISOString()
      },
      recorded_at: new Date().toISOString()
    }
  ];
  
  await supabase.from('metrics').insert(insights);
  
  console.log('✅ Health insights calculated:', {
    avgSleep: Math.round(avgSleep * 10) / 10 + 'h',
    avgHeartRate: Math.round(avgHeartRate) + 'bpm',
    avgStress: Math.round(avgStress),
    avgSteps: Math.round(avgSteps),
    healthScore: calculateHealthScore(avgSleep, avgHeartRate, avgStress, avgSteps)
  });
}

function calculateHealthScore(avgSleep: number, avgHeartRate: number, avgStress: number, avgSteps: number): number {
  // Handle NaN values gracefully
  const safeSleep = isNaN(avgSleep) ? 0 : avgSleep;
  const safeHeartRate = isNaN(avgHeartRate) ? 70 : avgHeartRate; // Use default if no data
  const safeStress = isNaN(avgStress) ? 30 : avgStress;
  const safeSteps = isNaN(avgSteps) ? 0 : avgSteps;
  
  // Sleep score (0-30 points): 8 hours = 30, 6 hours = 15, 4 hours = 0
  const sleepScore = Math.max(0, Math.min(30, (safeSleep - 4) * 7.5));
  
  // Heart rate score (0-25 points): 60-80 = 25, outside range = lower score
  // If no heart rate data, give neutral score
  const heartRateScore = avgHeartRate > 0 ? (() => {
    const idealHR = 70;
    const hrDiff = Math.abs(safeHeartRate - idealHR);
    return Math.max(0, 25 - hrDiff * 0.5);
  })() : 15; // Neutral score if no HR data
  
  // Stress score (0-25 points): low stress = 25, high stress = 0
  const stressScore = Math.max(0, 25 - safeStress * 0.5);
  
  // Steps score (0-20 points): 10k steps = 20, 5k steps = 10
  const stepsScore = Math.max(0, Math.min(20, safeSteps / 500));
  
  const totalScore = sleepScore + heartRateScore + stressScore + stepsScore;
  
  console.log('🔢 Health score calculation:', {
    sleepScore: Math.round(sleepScore),
    heartRateScore: Math.round(heartRateScore),
    stressScore: Math.round(stressScore),
    stepsScore: Math.round(stepsScore),
    totalScore: Math.round(totalScore)
  });
  
  return Math.round(totalScore);
}