// src/pages/api/habits/create.ts
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createServerClient(cookies);

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const body = await request.json();
    const {
      name,
      description,
      category,
      type = 'build',
      measurement_type = 'boolean',
      target_value,
      target_unit,
      color = '#3B82F6',
      reminder_time,
      allows_skips = false
    } = body;

    // Validation
    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ error: 'Habit name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!category || !category.trim()) {
      return new Response(JSON.stringify({ error: 'Category is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate measurement type requirements
    if ((measurement_type === 'count' || measurement_type === 'duration') && (!target_value || target_value <= 0)) {
      return new Response(JSON.stringify({ error: 'Target value is required for count and duration habits' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if ((measurement_type === 'count' || measurement_type === 'duration') && (!target_unit || !target_unit.trim())) {
      return new Response(JSON.stringify({ error: 'Target unit is required for count and duration habits' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if habit with same name already exists for this user
    const { data: existingHabit } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .eq('is_active', true)
      .single();

    if (existingHabit) {
      return new Response(JSON.stringify({ error: 'A habit with this name already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the highest position for ordering
    const { data: maxPositionResult } = await supabase
      .from('habits')
      .select('position')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (maxPositionResult?.position || 0) + 1;

    // Create the habit
    const habitData: any = {
      user_id: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      category: category.trim(),
      type,
      measurement_type,
      color,
      allows_skips,
      position: nextPosition,
      streak_count: 0,
      best_streak: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add measurement-specific fields
    if (measurement_type === 'count' || measurement_type === 'duration') {
      habitData.target_value = target_value;
      habitData.target_unit = target_unit.trim();
    }

    // Add reminder time if provided
    if (reminder_time) {
      habitData.reminder_time = reminder_time;
    }

    const { data: habit, error } = await supabase
      .from('habits')
      .insert([habitData])
      .select()
      .single();

    if (error) {
      console.error('Database error creating habit:', error);
      throw error;
    }

    return new Response(JSON.stringify({
      success: true,
      habit,
      message: 'Habit created successfully'
    }), {
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
    
    console.error('API Error creating habit:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
