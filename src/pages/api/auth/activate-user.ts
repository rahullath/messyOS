// src/pages/api/auth/activate-user.ts - New User Activation API
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

    const { email } = await request.json();
    const userEmail = email || user.email;

    console.log('🔄 Activating new user:', userEmail);

    // Check if user is in waitlist
    const { data: waitlistEntry } = await serverAuth.supabase
      .from('waitlist')
      .select('*')
      .eq('email', userEmail.toLowerCase())
      .single();

    let waitlistMessage = '';
    
    if (waitlistEntry) {
      // Mark as activated in waitlist
      const { error: updateError } = await serverAuth.supabase
        .from('waitlist')
        .update({ 
          activated: true, 
          activation_date: new Date().toISOString() 
        })
        .eq('id', waitlistEntry.id);

      if (updateError) {
        console.error('❌ Failed to update waitlist:', updateError);
      } else {
        waitlistMessage = 'Welcome! You\'ve been activated from the waitlist.';
      }
    }

    // Check if user preferences already exist
    const existingPrefs = await serverAuth.getUserPreferences(user.id);
    
    if (existingPrefs) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: waitlistMessage || 'User already activated',
        isNewUser: false,
        redirectTo: '/dashboard'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create default preferences for new user
    const { data: newPrefs, error: prefsError } = await serverAuth.supabase
      .from('user_preferences')
      .insert({
        user_id: user.id,
        theme: 'dark',
        accent_color: '#8b5cf6',
        enabled_modules: ['habits', 'tasks', 'health', 'finance'],
        module_order: ['habits', 'tasks', 'health', 'finance'],
        ai_personality: 'professional',
        ai_proactivity_level: 3,
        subscription_status: 'trial',
        trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (prefsError) {
      console.error('❌ Failed to create user preferences:', prefsError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to activate user account' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ New user activated:', { userId: user.id, email: userEmail });

    return new Response(JSON.stringify({ 
      success: true, 
      message: waitlistMessage || 'Account activated successfully!',
      isNewUser: true,
      redirectTo: '/onboarding'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ User activation error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Failed to activate user' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};