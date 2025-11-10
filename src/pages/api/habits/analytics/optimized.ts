// src/pages/api/habits/analytics/optimized.ts - Optimized analytics API endpoint
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../../lib/auth/simple-multi-user';
import { habitCacheService } from '../../../../lib/habits/cache-service';
import { habitPaginationService } from '../../../../lib/habits/pagination-service';
import { optimizedStreakService } from '../../../../lib/habits/optimized-streak-service';

interface AnalyticsRequest {
  days?: number;
  habitIds?: string[];
  includeStreaks?: boolean;
  includeContext?: boolean;
  includeTrends?: boolean;
  useCache?: boolean;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const startTime = Date.now();
  
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;

    const body: AnalyticsRequest = await request.json();
    const {
      days = 30,
      habitIds,
      includeStreaks = true,
      includeContext = true,
      includeTrends = false,
      useCache = true
    } = body;

    // Validate parameters
    if (days < 1 || days > 365) {
      return new Response(JSON.stringify({ 
        error: 'Days parameter must be between 1 and 365' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cacheKey = `optimized_analytics:${user.id}:${days}:${habitIds?.join(',') || 'all'}:${includeStreaks}:${includeContext}:${includeTrends}`;
    
    // Check cache if enabled
    if (useCache) {
      const cachedResult = habitCacheService.get(cacheKey);
      if (cachedResult) {
        return new Response(JSON.stringify({
          ...cachedResult,
          performance: {
            ...cachedResult.performance,
            cacheHit: true,
            totalTime: Date.now() - startTime
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Use optimized database function for analytics
    const analyticsStartTime = Date.now();
    const { data: analyticsData, error: analyticsError } = await supabase
      .rpc('get_habit_analytics', {
        p_user_id: user.id,
        p_days: days,
        p_habit_ids: habitIds || null
      });

    if (analyticsError) {
      throw new Error(`Analytics query failed: ${analyticsError.message}`);
    }

    const analyticsTime = Date.now() - analyticsStartTime;

    // Get streak data if requested
    let streakData = null;
    let streakTime = 0;
    if (includeStreaks && analyticsData?.length) {
      const streakStartTime = Date.now();
      const habitIdsForStreaks = analyticsData.map((h: any) => h.habit_id);
      
      try {
        const streakResults = await optimizedStreakService.calculateMultipleHabitStreaks(
          supabase,
          user.id,
          habitIdsForStreaks
        );
        
        streakData = Array.from(streakResults.entries()).map(([habitId, streak]) => ({
          habitId,
          currentStreak: streak.current,
          bestStreak: streak.best,
          performance: streak.performance
        }));
        
        streakTime = Date.now() - streakStartTime;
      } catch (error) {
        console.warn('Streak calculation failed:', error);
        streakData = [];
      }
    }

    // Get context analysis from materialized view if available
    let contextData = null;
    let contextTime = 0;
    if (includeContext) {
      const contextStartTime = Date.now();
      
      try {
        const { data: dailySummary, error: summaryError } = await supabase
          .from('habit_daily_summary')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('date', { ascending: false });

        if (!summaryError && dailySummary) {
          contextData = {
            dailySummary,
            aggregates: {
              avgCompletionRate: dailySummary.reduce((sum, day) => sum + (day.completion_rate || 0), 0) / dailySummary.length,
              avgEffort: dailySummary.reduce((sum, day) => sum + (day.avg_effort || 0), 0) / dailySummary.length,
              avgMood: dailySummary.reduce((sum, day) => sum + (day.avg_mood || 0), 0) / dailySummary.length,
              avgEnergy: dailySummary.reduce((sum, day) => sum + (day.avg_energy || 0), 0) / dailySummary.length,
              topLocations: this.getTopItems(dailySummary.flatMap(d => d.locations || [])),
              topTags: this.getTopItems(dailySummary.flatMap(d => d.all_tags || []))
            }
          };
        }
        
        contextTime = Date.now() - contextStartTime;
      } catch (error) {
        console.warn('Context analysis failed:', error);
        contextData = null;
      }
    }

    // Get trend data if requested
    let trendData = null;
    let trendTime = 0;
    if (includeTrends && analyticsData?.length) {
      const trendStartTime = Date.now();
      
      try {
        const { data: weeklyStats, error: weeklyError } = await supabase
          .from('habit_weekly_stats')
          .select('*')
          .eq('user_id', user.id)
          .gte('week_start', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
          .order('week_start', { ascending: true });

        if (!weeklyError && weeklyStats) {
          trendData = {
            weekly: weeklyStats,
            trends: this.calculateTrends(weeklyStats)
          };
        }
        
        trendTime = Date.now() - trendStartTime;
      } catch (error) {
        console.warn('Trend analysis failed:', error);
        trendData = null;
      }
    }

    const totalTime = Date.now() - startTime;

    const result = {
      analytics: analyticsData || [],
      streaks: streakData,
      context: contextData,
      trends: trendData,
      metadata: {
        userId: user.id,
        dateRange: {
          days,
          startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0]
        },
        filters: {
          habitIds: habitIds || null,
          includeStreaks,
          includeContext,
          includeTrends
        }
      },
      performance: {
        totalTime,
        analyticsTime,
        streakTime,
        contextTime,
        trendTime,
        cacheHit: false,
        timestamp: new Date().toISOString()
      }
    };

    // Cache the result if caching is enabled
    if (useCache) {
      habitCacheService.set(cacheKey, result, 10 * 60 * 1000); // 10 minute cache
    }

    // Log performance for monitoring
    if (totalTime > 5000) { // Log slow queries
      console.warn('Slow analytics query:', {
        userId: user.id,
        totalTime,
        days,
        habitCount: analyticsData?.length || 0,
        includeStreaks,
        includeContext,
        includeTrends
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'X-Performance-Time': totalTime.toString(),
        'X-Cache-Hit': 'false'
      }
    });

  } catch (error) {
    console.error('Optimized analytics API error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch analytics data',
      details: error instanceof Error ? error.message : 'Unknown error',
      performance: {
        totalTime: Date.now() - startTime,
        failed: true
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Helper function to get top items from arrays
function getTopItems(items: string[], limit: number = 5): Array<{ item: string; count: number }> {
  const counts = items.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([item, count]) => ({ item, count }));
}

// Helper function to calculate trends
function calculateTrends(weeklyStats: any[]): {
  completionRate: 'up' | 'down' | 'stable';
  effort: 'up' | 'down' | 'stable';
  consistency: 'up' | 'down' | 'stable';
} {
  if (weeklyStats.length < 2) {
    return { completionRate: 'stable', effort: 'stable', consistency: 'stable' };
  }

  const recent = weeklyStats.slice(-4); // Last 4 weeks
  const older = weeklyStats.slice(-8, -4); // Previous 4 weeks

  const recentAvgCompletion = recent.reduce((sum, week) => sum + (week.weekly_completion_rate || 0), 0) / recent.length;
  const olderAvgCompletion = older.length > 0 ? older.reduce((sum, week) => sum + (week.weekly_completion_rate || 0), 0) / older.length : recentAvgCompletion;

  const recentAvgEffort = recent.reduce((sum, week) => sum + (week.avg_effort || 0), 0) / recent.length;
  const olderAvgEffort = older.length > 0 ? older.reduce((sum, week) => sum + (week.avg_effort || 0), 0) / older.length : recentAvgEffort;

  const getTrend = (recent: number, older: number, threshold: number = 5): 'up' | 'down' | 'stable' => {
    const diff = recent - older;
    if (Math.abs(diff) < threshold) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  return {
    completionRate: getTrend(recentAvgCompletion, olderAvgCompletion),
    effort: getTrend(recentAvgEffort, olderAvgEffort, 0.2),
    consistency: getTrend(recentAvgCompletion, olderAvgCompletion, 3)
  };
}

// GET endpoint for simple analytics queries
export const GET: APIRoute = async ({ url, cookies }) => {
  const searchParams = new URL(url).searchParams;
  
  const request = new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      days: parseInt(searchParams.get('days') || '30'),
      habitIds: searchParams.get('habitIds')?.split(',').filter(Boolean),
      includeStreaks: searchParams.get('includeStreaks') !== 'false',
      includeContext: searchParams.get('includeContext') !== 'false',
      includeTrends: searchParams.get('includeTrends') === 'true',
      useCache: searchParams.get('useCache') !== 'false'
    })
  });

  return POST({ request, cookies } as any);
};