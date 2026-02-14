/**
 * GET /api/context/today
 * 
 * Returns daily context aggregated from yesterday's habits and recent patterns.
 * Implements 60s caching with automatic invalidation on new habit entries.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.6, 6.7
 * 
 * Response: DailyContext object with wake time, substances, meds, hygiene, meals,
 * day_flags, and duration_priors.
 * 
 * Temporal Semantics: Uses yesterday's data (D-1) + trailing window, never same-day data.
 */

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { generateDailyContext } from '../../../lib/context/daily-context';
import { habitCacheService } from '../../../lib/habits/cache-service';

/**
 * Generate cache key for daily context
 */
function getDailyContextCacheKey(userId: string, date: string): string {
  return `daily-context:${userId}:${date}`;
}

/**
 * GET handler for /api/context/today
 * 
 * Returns cached DailyContext if available (60s TTL), otherwise generates fresh.
 * Requires authentication.
 */
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // Step 1: Authentication check
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Step 2: Parse date parameter (default to today)
    const url = new URL(request.url);
    const dateParam = url.searchParams.get('date');
    
    let date: Date;
    if (dateParam) {
      date = new Date(dateParam);
      if (isNaN(date.getTime())) {
        return new Response(JSON.stringify({ 
          error: 'Invalid date format',
          details: 'date must be a valid ISO date string (YYYY-MM-DD)'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      date = new Date();
    }

    const dateString = date.toISOString().split('T')[0];
    const cacheKey = getDailyContextCacheKey(user.id, dateString);

    // Step 3: Check cache (60s TTL)
    const cached = habitCacheService['get'](cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'X-Cache': 'HIT'
        }
      });
    }

    // Step 4: Generate fresh DailyContext
    let context;
    try {
      // Get Supabase credentials from environment
      const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
      
      context = await generateDailyContext(user.id, date, supabaseUrl, supabaseKey);
    } catch (error) {
      console.error('Failed to generate daily context:', error);
      
      // Determine appropriate error code
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          return new Response(JSON.stringify({ 
            error: 'Gateway timeout',
            details: 'Database query timed out'
          }), {
            status: 504,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        if (error.message.includes('connection')) {
          return new Response(JSON.stringify({ 
            error: 'Service unavailable',
            details: 'Database connection failed'
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Generic server error
      return new Response(JSON.stringify({ 
        error: 'Failed to generate daily context',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Step 5: Cache the result (60s TTL)
    habitCacheService['set'](cacheKey, context, 60 * 1000);

    // Step 6: Return response
    return new Response(JSON.stringify(context), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache': 'MISS'
      }
    });

  } catch (error) {
    console.error('Unexpected error in /api/context/today:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * Invalidate daily context cache for a user
 * 
 * Called when new habit entries or wake events are created.
 * Invalidates cache for today and yesterday to ensure fresh data.
 * 
 * Requirements: 6.4, 6.5
 * 
 * Note: Wake events integration is pending. When wake_events table is implemented,
 * the wake event logging endpoints should also call this function.
 */
export function invalidateDailyContextCache(userId: string): void {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const todayKey = getDailyContextCacheKey(userId, today);
  const yesterdayKey = getDailyContextCacheKey(userId, yesterday);
  
  habitCacheService['cache'].delete(todayKey);
  habitCacheService['cache'].delete(yesterdayKey);
}
