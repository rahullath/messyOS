// src/pages/api/nutrition/log-food.ts - Food Logging API
// Log food intake for user

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
      food_id, 
      recipe_id, 
      quantity_grams, 
      meal_type, 
      recipe_portion = 1.0,
      notes,
      logged_at 
    } = body;

    // Validate required fields
    if (!quantity_grams || !meal_type) {
      return new Response(JSON.stringify({
        success: false,
        error: 'quantity_grams and meal_type are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!food_id && !recipe_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Either food_id or recipe_id is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const logData = {
      user_id: user.id,
      food_id,
      recipe_id,
      quantity_grams: parseFloat(quantity_grams),
      meal_type,
      recipe_portion: parseFloat(recipe_portion),
      notes,
      logged_at: logged_at || new Date().toISOString()
    };

    const { data, error } = await serverAuth.supabase
      .from('food_logs')
      .insert(logData)
      .select()
      .single();

    if (error) {
      console.error('❌ Food log error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to log food'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      log: data
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Food logging API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to log food'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

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
    const meal_type = url.searchParams.get('meal_type');

    let query = serverAuth.supabase
      .from('food_logs')
      .select(`
        *,
        foods (name, calories, protein, carbs, fat, fiber),
        recipes (name, servings)
      `)
      .eq('user_id', user.id)
      .gte('logged_at', `${date}T00:00:00.000Z`)
      .lt('logged_at', `${date}T23:59:59.999Z`)
      .order('logged_at', { ascending: false });

    if (meal_type) {
      query = query.eq('meal_type', meal_type);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('❌ Food logs query error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch food logs'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      logs: logs || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Food logs API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch food logs'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};