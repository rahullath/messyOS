// src/pages/api/onboarding/complete.ts - Complete onboarding process
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

function normalizeModules(value: unknown): string[] {
  if (!Array.isArray(value)) return ['habits', 'tasks', 'health', 'finance'];
  const modules = value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  return modules.length > 0 ? modules : ['habits', 'tasks', 'health', 'finance'];
}

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

    const body = await request.json().catch(() => ({}));
    const profile = body?.profile || {};
    const preferences = body?.preferences || {};

    if (!profile.fullName || !profile.timezone) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Profile data is incomplete'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Ensure preference row exists first.
    const existingPrefs = await serverAuth.getUserPreferences(user.id);
    if (!existingPrefs) {
      const created = await serverAuth.createDefaultPreferences(user.id, user.email);
      if (!created) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to initialize preferences'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const enabledModules = normalizeModules(preferences.enabledModules ?? profile.preferredModules);

    const { data: preferenceRow } = await serverAuth.supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', user.id)
      .maybeSingle();

    const mergedPreferences = {
      ...((preferenceRow?.preferences && typeof preferenceRow.preferences === 'object') ? preferenceRow.preferences : {}),
      enabled_modules: enabledModules,
      module_order: enabledModules,
      theme: typeof preferences.theme === 'string' ? preferences.theme : 'dark',
      accent_color: typeof preferences.accentColor === 'string' ? preferences.accentColor : '#06b6d4',
      ai_personality: typeof preferences.aiPersonality === 'string' ? preferences.aiPersonality : 'professional',
      ai_proactivity_level: typeof preferences.aiProactivity === 'number' ? preferences.aiProactivity : 3,
      onboarding_completed_at: new Date().toISOString(),
      timezone: profile.timezone,
    };

    const { error: preferenceError } = await serverAuth.supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        preferences: mergedPreferences,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (preferenceError) {
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to save onboarding preferences: ${preferenceError.message}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Keep profile write to supported columns only.
    const { error: profileError } = await serverAuth.supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        full_name: profile.fullName,
        preferred_theme: typeof preferences.theme === 'string' ? preferences.theme : 'dark',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (profileError) {
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to save profile: ${profileError.message}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Onboarding completed successfully',
      redirectTo: '/dashboard'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Onboarding completion error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
