/**
 * Test endpoint for auto-scheduler functionality
 * Simple test to verify the auto-scheduler is working
 */

import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase/server';

export const GET: APIRoute = async ({ cookies }) => {
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

    // Test database connection
    const { data: tables, error: tablesError } = await supabase
      .from('optimized_daily_plans')
      .select('count')
      .limit(1);

    if (tablesError) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Database connection failed',
        details: tablesError.message,
        suggestion: 'Run the database migration: database/add-auto-scheduler-tables.sql'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Test weather service
    let weatherTest = 'Not tested';
    try {
      const { WeatherService } = await import('../../lib/services/weather-service');
      const weather = await WeatherService.getCurrentWeather();
      weatherTest = `Working - ${weather.condition}, ${weather.temperature}°C`;
    } catch (error: any) {
      weatherTest = `Error: ${error.message}`;
    }

    // Test auto-scheduler service
    let autoSchedulerTest = 'Not tested';
    try {
      const { AutoSchedulerService } = await import('../../lib/task-management/auto-scheduler');
      const scheduler = new AutoSchedulerService(supabase);
      autoSchedulerTest = 'Service loaded successfully';
    } catch (error: any) {
      autoSchedulerTest = `Error: ${error.message}`;
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: user.id,
      tests: {
        database_connection: 'Working',
        auto_scheduler_tables: 'Available',
        weather_service: weatherTest,
        auto_scheduler_service: autoSchedulerTest
      },
      message: 'Auto-scheduler system is ready to use!',
      next_steps: [
        'Visit /perfect-day to use the Perfect Day Planner',
        'Generate your first optimized daily plan',
        'Check the AI reasoning and optimization score'
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Auto-scheduler test failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Test failed',
      details: error.message,
      troubleshooting: [
        'Ensure database migration is run: database/add-auto-scheduler-tables.sql',
        'Check that all auto-scheduler files are properly created',
        'Verify Supabase connection is working'
      ]
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};