// src/pages/api/nutrition/recipes.ts - Recipes API
// Create and manage recipes

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
      name,
      description,
      cuisine_type,
      meal_type,
      servings = 1,
      prep_time_minutes,
      cook_time_minutes,
      difficulty_level,
      tags = [],
      ingredients // [{food_id, quantity, notes}]
    } = body;

    if (!name || !ingredients || ingredients.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Recipe name and ingredients are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Start transaction to create recipe and ingredients
    const { data: recipe, error: recipeError } = await serverAuth.supabase
      .from('recipes')
      .insert({
        user_id: user.id,
        name,
        description,
        cuisine_type,
        meal_type,
        servings: parseFloat(servings),
        prep_time_minutes: prep_time_minutes ? parseInt(prep_time_minutes) : null,
        cook_time_minutes: cook_time_minutes ? parseInt(cook_time_minutes) : null,
        difficulty_level,
        tags
      })
      .select()
      .single();

    if (recipeError) {
      console.error('❌ Recipe creation error:', recipeError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create recipe'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add ingredients
    const ingredientsData = ingredients.map(ing => ({
      recipe_id: recipe.id,
      food_id: ing.food_id,
      quantity: parseFloat(ing.quantity),
      notes: ing.notes || null
    }));

    const { error: ingredientsError } = await serverAuth.supabase
      .from('recipe_ingredients')
      .insert(ingredientsData);

    if (ingredientsError) {
      console.error('❌ Recipe ingredients error:', ingredientsError);
      // Cleanup: delete the recipe if ingredients failed
      await serverAuth.supabase
        .from('recipes')
        .delete()
        .eq('id', recipe.id);

      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to add recipe ingredients'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      recipe: recipe
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Recipes API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create recipe'
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

    const meal_type = url.searchParams.get('meal_type');
    const cuisine_type = url.searchParams.get('cuisine_type');
    const include_public = url.searchParams.get('include_public') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let query = serverAuth.supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (
          quantity,
          notes,
          foods (name, calories, protein, carbs, fat)
        )
      `);

    if (include_public) {
      query = query.or(`user_id.eq.${user.id},is_public.eq.true`);
    } else {
      query = query.eq('user_id', user.id);
    }

    if (meal_type) {
      query = query.eq('meal_type', meal_type);
    }

    if (cuisine_type) {
      query = query.eq('cuisine_type', cuisine_type);
    }

    query = query.limit(limit).order('created_at', { ascending: false });

    const { data: recipes, error } = await query;

    if (error) {
      console.error('❌ Recipes query error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch recipes'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      recipes: recipes || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Recipes API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch recipes'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};