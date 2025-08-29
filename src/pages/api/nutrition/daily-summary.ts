// src/pages/api/nutrition/daily-summary.ts - Daily Nutrition Summary
// Get comprehensive daily nutrition data using database function

import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

    // Call the database function to get comprehensive daily summary
    const { data, error } = await serverAuth.supabase
      .rpc('get_daily_nutrition_summary', {
        user_id_param: user.id,
        date_param: date
      });

    if (error) {
      console.error('❌ Daily summary error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch daily nutrition summary'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const summary = data?.[0] || {
      total_calories: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fat: 0,
      total_fiber: 0,
      meal_breakdown: {},
      goal_progress: {}
    };

    return new Response(JSON.stringify({
      success: true,
      date,
      summary
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Daily summary API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch daily nutrition summary'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};