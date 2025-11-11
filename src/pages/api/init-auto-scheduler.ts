/**
 * Initialize Auto-Scheduler Database Tables
 * Creates the necessary tables for auto-scheduler functionality
 */

import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase/server';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🔧 Initializing auto-scheduler for user:', user.id);

    // Initialize Birmingham locations for the user
    const locations = [
      {
        user_id: user.id,
        name: 'University of Birmingham',
        address: 'Edgbaston, Birmingham B15 2TT',
        location_type: 'university',
        cycling_distance_from_home: 2.5,
        cycling_time_estimate: 18,
        train_time_estimate: 15,
        walking_time_estimate: 45,
        cost_considerations: { cycling: 0, train: 3.20, walking: 0 },
        specialties: ['Lectures', 'Library', 'Dining', 'Sports']
      },
      {
        user_id: user.id,
        name: 'Local Gym',
        address: '3.7 miles from home',
        location_type: 'gym',
        cycling_distance_from_home: 3.7,
        cycling_time_estimate: 34,
        train_time_estimate: 25,
        walking_time_estimate: 75,
        cost_considerations: { cycling: 0, train: 4.50, walking: 0 },
        specialties: ['Weights', 'Cardio', 'Classes', 'Shower facilities']
      },
      {
        user_id: user.id,
        name: 'Tesco Express',
        address: 'Selly Oak',
        location_type: 'supermarket',
        cycling_distance_from_home: 0.8,
        cycling_time_estimate: 6,
        train_time_estimate: 10,
        walking_time_estimate: 12,
        cost_considerations: { cycling: 0, train: 2.50, walking: 0 },
        specialties: ['Quick essentials', 'Ready meals', 'Fresh produce']
      }
    ];

    // Insert locations (ignore conflicts)
    const { error: locationsError } = await supabase
      .from('birmingham_locations')
      .upsert(locations, { onConflict: 'user_id,name' });

    if (locationsError) {
      console.error('❌ Failed to insert locations:', locationsError);
    } else {
      console.log('✅ Birmingham locations initialized');
    }

    // Initialize auto-scheduler preferences
    const { error: preferencesError } = await supabase
      .from('auto_scheduler_preferences')
      .upsert({
        user_id: user.id,
        preferred_wake_time: '06:00:00',
        preferred_bedtime: '22:00:00',
        minimum_sleep_duration: 480,
        gym_frequency: 4,
        preferred_gym_times: ['morning', 'evening'],
        workout_duration_preference: 60,
        travel_method_preference: 'cycling',
        daily_calorie_target: 2200,
        daily_protein_target: 120,
        meal_budget_limit: 15.00
      }, { onConflict: 'user_id' });

    if (preferencesError) {
      console.error('❌ Failed to insert preferences:', preferencesError);
    } else {
      console.log('✅ Auto-scheduler preferences initialized');
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Auto-scheduler initialized successfully',
      data: {
        locations_added: locations.length,
        preferences_set: true,
        user_id: user.id
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Auto-scheduler initialization failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Initialization failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};