// src/pages/api/user/complete-onboarding.ts - Simple onboarding completion for existing flow
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

    console.log('🔄 Marking onboarding as complete for user:', user.id);

    // Check if user already has preferences (onboarding completed)
    const { data: existingPrefs } = await serverAuth.supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingPrefs) {
      // User already has preferences, just mark as complete
      console.log('✅ User already has preferences, onboarding complete');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Onboarding already completed'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create default preferences for users who skip the detailed onboarding
    const defaultPreferences = {
      user_id: user.id,
      theme: 'dark',
      timezone: 'UTC',
      language: 'en',
      notifications: {
        email: true,
        push: true,
        marketing: false
      },
      dashboard: {
        layout: 'default',
        modules: ['habits', 'tasks', 'health', 'finance']
      },
      enabled_modules: ['habits', 'tasks', 'health', 'finance'],
      module_order: ['habits', 'tasks', 'health', 'finance'],
      accent_color: '#06b6d4',
      ai_personality: 'professional',
      ai_proactivity_level: 3,
      subscription_status: 'trial',
      trial_started: new Date().toISOString(),
      trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await serverAuth.supabase
      .from('user_preferences')
      .insert(defaultPreferences);

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

    console.log('✅ Default preferences created, onboarding complete');

    // Check if this is a form submission (redirect) or API call (JSON)
    const contentType = request.headers.get('content-type') || '';
    const isFormSubmission = !contentType.includes('application/json');
    
    if (isFormSubmission) {
      // Form submission - redirect to tasks page
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/tasks'
        }
      });
    } else {
      // API call - return JSON
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Onboarding completed successfully'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    console.error('❌ Complete onboarding error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Unknown error occurred'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};