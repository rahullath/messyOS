// src/pages/api/auth/subscription.ts - User Subscription Management API
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

function parsePreferencePayload(raw: unknown) {
  return raw && typeof raw === 'object' ? (raw as Record<string, any>) : {};
}

export const GET: APIRoute = async ({ cookies }) => {
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

    // Get subscription info from user preferences
    const preferences = await serverAuth.getUserPreferences(user.id);
    
    if (!preferences) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'User preferences not found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Calculate trial status
    const trialEndDate = preferences.trial_end_date ? new Date(preferences.trial_end_date) : null;
    const now = new Date();
    const daysLeft = trialEndDate ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

    const subscriptionStatus = {
      status: preferences.subscription_status || 'trial',
      trialEndDate: preferences.trial_end_date,
      daysLeft: daysLeft,
      isTrialActive: daysLeft > 0 && preferences.subscription_status === 'trial',
      isExpired: daysLeft <= 0 && preferences.subscription_status === 'trial'
    };

    return new Response(JSON.stringify({ 
      success: true, 
      data: subscriptionStatus
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Get subscription error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Failed to get subscription info' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
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

    const { action, subscriptionData } = await request.json();
    console.log('🔄 Subscription action:', action, 'for user:', user.id);

    const { data: existingRow, error: existingError } = await serverAuth.supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingError) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to load subscription preferences',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const nextPreferences = {
      ...parsePreferencePayload(existingRow?.preferences),
    };

    switch (action) {
      case 'extend_trial':
        // Extend trial by 7 days (for testing purposes)
        const currentPrefs = await serverAuth.getUserPreferences(user.id);
        if (currentPrefs) {
          const currentEndDate = new Date(currentPrefs.trial_end_date || Date.now());
          const newEndDate = new Date(currentEndDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          nextPreferences.trial_end_date = newEndDate.toISOString();
          nextPreferences.subscription_status = 'trial';
        }
        break;
        
      case 'activate_premium':
        nextPreferences.subscription_status = 'premium';
        nextPreferences.subscription_id = subscriptionData?.subscriptionId;
        break;
        
      case 'cancel_subscription':
        nextPreferences.subscription_status = 'cancelled';
        break;
        
      case 'reactivate':
        nextPreferences.subscription_status = 'premium';
        break;
        
      default:
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid action' 
        }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    const { data, error } = await serverAuth.supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: user.id,
          preferences: nextPreferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('❌ Update subscription error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to update subscription' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Subscription updated successfully:', action);

    return new Response(JSON.stringify({ 
      success: true, 
      data: data,
      message: `Subscription ${action.replace('_', ' ')} successful`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Subscription update error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Failed to update subscription' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
