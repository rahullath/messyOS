// src/pages/api/nutrition/goals.ts - Nutrition Goals API
// Manage user nutrition goals and targets

import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ cookies, request }) => {
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

    const body = await request.json();
    const {
      daily_calories,
      daily_protein,
      daily_carbs,
      daily_fat,
      daily_fiber = 25,
      goal_type = 'maintain',
      activity_level = 'moderate',
      height_cm,
      weight_kg,
      age,
      gender
    } = body;

    // Validate required fields
    if (!daily_calories || !daily_protein || !daily_carbs || !daily_fat) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Daily nutrition targets are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // First, deactivate existing active goals
    await serverAuth.supabase
      .from('nutrition_goals')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Create new active goal
    const { data, error } = await serverAuth.supabase
      .from('nutrition_goals')
      .insert({
        user_id: user.id,
        daily_calories: parseFloat(daily_calories),
        daily_protein: parseFloat(daily_protein),
        daily_carbs: parseFloat(daily_carbs),
        daily_fat: parseFloat(daily_fat),
        daily_fiber: parseFloat(daily_fiber),
        goal_type,
        activity_level,
        height_cm: height_cm ? parseFloat(height_cm) : null,
        weight_kg: weight_kg ? parseFloat(weight_kg) : null,
        age: age ? parseInt(age) : null,
        gender,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Nutrition goals error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to set nutrition goals'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      goal: data
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Nutrition goals API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to set nutrition goals'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ cookies }) => {
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

    const { data: goal, error } = await serverAuth.supabase
      .from('nutrition_goals')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Nutrition goals query error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch nutrition goals'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      goal: goal || null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Nutrition goals API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch nutrition goals'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};