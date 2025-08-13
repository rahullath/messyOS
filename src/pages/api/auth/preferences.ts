// src/pages/api/auth/preferences.ts - User Preferences Management API
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

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

    const preferences = await serverAuth.getUserPreferences(user.id);
    
    if (!preferences) {
      // Create default preferences for new user
      const defaultPrefs = await serverAuth.createDefaultPreferences(user.id, user.email);
      
      return new Response(JSON.stringify({ 
        success: true, 
        data: defaultPrefs,
        isNewUser: true
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      data: preferences,
      isNewUser: false
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Get preferences error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Failed to get preferences' 
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

    const updates = await request.json();
    console.log('🔄 Updating preferences for user:', user.id);

    // Validate and sanitize updates
    const allowedFields = [
      'theme', 'accent_color', 'enabled_modules', 'module_order',
      'dashboard_layout', 'ai_personality', 'ai_proactivity_level',
      'data_retention_days', 'share_analytics'
    ];

    const sanitizedUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {} as any);

    // Add updated timestamp
    sanitizedUpdates.updated_at = new Date().toISOString();

    const { data, error } = await serverAuth.supabase
      .from('user_preferences')
      .update(sanitizedUpdates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Update preferences error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to update preferences' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Preferences updated successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      data: data,
      message: 'Preferences updated successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Update preferences error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Failed to update preferences' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ cookies }) => {
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

    console.log('🗑️ Resetting preferences to defaults for user:', user.id);

    // Reset to default preferences
    const defaultPrefs = {
      theme: 'dark',
      accent_color: '#8b5cf6',
      enabled_modules: ['habits', 'tasks', 'health', 'finance'],
      module_order: ['habits', 'tasks', 'health', 'finance'],
      dashboard_layout: {},
      ai_personality: 'professional',
      ai_proactivity_level: 3,
      data_retention_days: 365,
      share_analytics: false,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await serverAuth.supabase
      .from('user_preferences')
      .update(defaultPrefs)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Reset preferences error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to reset preferences' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Preferences reset to defaults');

    return new Response(JSON.stringify({ 
      success: true, 
      data: data,
      message: 'Preferences reset to defaults'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Reset preferences error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Failed to reset preferences' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};