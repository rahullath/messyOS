// src/pages/api/user/complete-onboarding.ts
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/privy-auth';

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create or update user preferences to mark onboarding as complete
    const { error } = await serverAuth.supabase
      .from('user_preferences')
      .upsert({
        privy_user_id: user.id,
        theme: 'dark',
        timezone: 'UTC',
        notifications: {
          email: true,
          push: true,
          ai_insights: true,
          weekly_summary: true
        },
        privacy: {
          analytics: true,
          personalization: true,
          data_export: false
        },
        ai_settings: {
          autonomous_actions: true,
          confidence_threshold: 0.8,
          max_actions_per_session: 5
        },
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error completing onboarding:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to complete onboarding' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Onboarding completed successfully'
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Exception in complete-onboarding API:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};