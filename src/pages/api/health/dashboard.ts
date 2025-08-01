// src/pages/api/health/dashboard.ts
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import type { Tables } from '../../../types/supabase';

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
    const urlParams = new URLSearchParams(url.search);
    const range = urlParams.get('range') || '30d';
    
    // Calculate date range
    const daysAgo = range === '7d' ? 7 : range === '90d' ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Fetch health metrics
    const { data: healthMetrics, error } = await supabase
      .from('metrics')
      .select('type, value, unit, metadata, recorded_at')
      .eq('user_id', user.id)
      .in('type', [
        'sleep_duration', 'heart_rate_avg', 'heart_rate_min', 'heart_rate_max', 
        'stress_level', 'health_score',
        'medication_bupropion_morning', 'medication_bupropion_afternoon', 'medication_melatonin_evening'
      ])
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: false });

    if (error) throw error;

    const metrics: Tables<'metrics'>[] = healthMetrics || [];

    // Group metrics by type
    const sleepData = metrics.filter(m => m.type === 'sleep_duration');
    const heartRateData = metrics.filter(m => m.type === 'heart_rate_avg');
    const stressData = metrics.filter(m => m.type === 'stress_level');
    const healthScores = metrics.filter(m => m.type === 'health_score');
    
    // Medication data
    const medicationData = metrics.filter(m => m.type.startsWith('medication_'));

    // Calculate averages
    const avgSleep = sleepData.length > 0 
      ? Math.round(sleepData.reduce((sum, m) => sum + m.value, 0) / sleepData.length / 60 * 10) / 10 
      : 0;

    const avgHeartRate = heartRateData.length > 0
      ? Math.round(heartRateData.reduce((sum, m) => sum + m.value, 0) / heartRateData.length)
      : 0;

    const avgStress = stressData.length > 0
      ? Math.round(stressData.reduce((sum, m) => sum + m.value, 0) / stressData.length)
      : 0;

    // Calculate heart rate variability
    const heartRateVariability = heartRateData.length > 1
      ? Math.round(Math.sqrt(heartRateData.reduce((sum, m, i, arr) => {
          if (i === 0) return 0;
          const diff = m.value - arr[i - 1].value;
          return sum + (diff * diff);
        }, 0) / (heartRateData.length - 1)))
      : 0;

    // Determine statuses
    const sleepQuality = avgSleep >= 8 ? 'Excellent' : avgSleep >= 7 ? 'Good' : avgSleep >= 6 ? 'Fair' : avgSleep > 0 ? 'Poor' : 'No Data';
    const stressStatus = avgStress <= 30 ? 'Low' : avgStress <= 50 ? 'Normal' : 'High';
    const latestHealthScore = healthScores.length > 0 ? healthScores[0].value : 0;

    // Prepare chart data for last 30 days
    const chartData = [];
    for (let i = daysAgo - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayMetrics = metrics.filter(m => 
        m.recorded_at!.split('T')[0] === dateStr
      );
      
      const sleepMetric = dayMetrics.find(m => m.type === 'sleep_duration');
      const heartRateMetric = dayMetrics.find(m => m.type === 'heart_rate_avg');
      const stressMetric = dayMetrics.find(m => m.type === 'stress_level');
      
      chartData.push({
        date: dateStr,
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
        sleepDuration: sleepMetric?.value || 0,
        sleepHours: sleepMetric ? Math.round(sleepMetric.value / 60 * 10) / 10 : 0,
        avgHeartRate: heartRateMetric?.value || 0,
        stressLevel: stressMetric?.value || 0
      });
    }

    // Calculate medication adherence (last 30 days)
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
    
    const recentMedication = medicationData.filter(m => 
      new Date(m.recorded_at!) >= last30Days
    );

    const bupropionEntries = recentMedication.filter(m => 
      m.type.includes('bupropion')
    );
    const melatoninEntries = recentMedication.filter(m => 
      m.type.includes('melatonin')
    );

    const bupropionTaken = bupropionEntries.filter(m => m.value === 1).length;
    const bupropionTotal = Math.max(bupropionEntries.length, 60); // 2 doses per day * 30 days
    const bupropionAdherence = bupropionTotal > 0 ? Math.round((bupropionTaken / bupropionTotal) * 100) : 0;

    const melatoninTaken = melatoninEntries.filter(m => m.value === 1).length;
    const melatoninTotal = Math.max(melatoninEntries.length, 30); // 1 dose per day * 30 days
    const melatoninAdherence = melatoninTotal > 0 ? Math.round((melatoninTaken / melatoninTotal) * 100) : 0;

    // Prepare response
    const healthStats = {
      avgSleep,
      sleepQuality,
      avgHeartRate,
      heartRateVariability,
      avgStress,
      stressStatus,
      healthScore: latestHealthScore,
      last7Days: chartData.slice(-7),
      last30Days: chartData,
      medicationAdherence: {
        bupropion: bupropionAdherence,
        melatonin: melatoninAdherence
      },
      dataQuality: {
        sleepDays: sleepData.length,
        heartRateDays: heartRateData.length,
        stressDays: stressData.length,
        totalDays: daysAgo
      }
    };

    return new Response(JSON.stringify(healthStats), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    // Handle auth errors
    if (error.message === 'Authentication required') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Please sign in to continue'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.error('API Error:', error);
    console.error('Health dashboard API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch health data', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
