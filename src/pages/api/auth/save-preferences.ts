// ==================================================
// 2. Fix Onboarding Preferences Save API
// ==================================================

// src/pages/api/auth/save-preferences.ts
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Not authenticated' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    console.log('💾 Saving preferences for user:', user.id);

    // First, check if preferences already exist
    const { data: existingPrefs } = await serverAuth.supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const preferencesData = {
  user_id: user.id,
  enabled_modules: body.enabledModules || ['habits', 'tasks', 'health', 'finance'],
  module_order: body.enabledModules || ['habits', 'tasks', 'health', 'finance'],
  theme: body.theme || 'dark',
  accent_color: body.accentColor || '#06b6d4',
  ai_personality: body.aiPersonality || 'professional',
  ai_proactivity_level: body.aiProactivity || 3,
  subscription_status: 'trial',
  trial_started: new Date().toISOString(),  // Changed from trial_start
  trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),  // Changed from trial_end_date
  updated_at: new Date().toISOString()
};

    let data, error;

    if (existingPrefs) {
      // Update existing preferences
      console.log('📝 Updating existing preferences');
      const result = await serverAuth.supabase
        .from('user_preferences')
        .update(preferencesData)
        .eq('user_id', user.id)
        .select();
      
      data = result.data;
      error = result.error;
    } else {
      // Insert new preferences
      console.log('📝 Creating new preferences');
      const result = await serverAuth.supabase
        .from('user_preferences')
        .insert(preferencesData)
        .select();
      
      data = result.data;
      error = result.error;
    }

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

    console.log('✅ Preferences saved successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Preferences saved successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
