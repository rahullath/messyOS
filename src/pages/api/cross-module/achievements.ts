// API endpoint for achievement management
import type { APIRoute } from 'astro';
import { crossModuleService } from '../../../lib/cross-module/integration-service';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../types/supabase';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const searchParams = url.searchParams;
    const type = searchParams.get('type');

    if (type === 'available') {
      // Get all available achievements
      const achievements = await crossModuleService.getAvailableAchievements();
      
      return new Response(JSON.stringify({
        success: true,
        data: achievements
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Get user's earned achievements
      const userAchievements = await crossModuleService.getUserAchievements(user.id);
      
      return new Response(JSON.stringify({
        success: true,
        data: userAchievements
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Achievements API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { action, achievement_id } = body;

    if (action === 'check') {
      // Check for new achievements
      const result = await crossModuleService.checkAchievements(user.id);
      
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (action === 'celebrate' && achievement_id) {
      // Mark achievement as celebrated
      await crossModuleService.celebrateAchievement(user.id, achievement_id);
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Achievement marked as celebrated'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid action'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Achievement action error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};