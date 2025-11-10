// src/pages/api/skip-onboarding.ts - Quick bypass for onboarding issues
import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase/server';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Not authenticated' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🚀 Skipping onboarding for user:', user.id);

    // Check if user already has preferences
    const { data: existingPrefs } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingPrefs) {
      console.log('✅ User already has preferences');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Onboarding already completed'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create minimal preferences to bypass onboarding (only user_id)
    const minimalPreferences = {
      user_id: user.id
    };

    const { error } = await supabase
      .from('user_preferences')
      .insert(minimalPreferences);

    if (error) {
      console.error('❌ Database error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Database error: ${error.message}` 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Minimal preferences created, onboarding bypassed');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Onboarding skipped successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Skip onboarding error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Unknown error occurred'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};