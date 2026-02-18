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

    const body = await request.json().catch(() => ({}));

    // Ensure user has a preferences row first.
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

    const enabledModules = Array.isArray(body.enabledModules)
      ? body.enabledModules.filter((value: unknown) => typeof value === 'string')
      : ['habits', 'tasks', 'health', 'finance'];

    const { data: currentRow } = await serverAuth.supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', user.id)
      .maybeSingle();

    const mergedPreferences = {
      ...((currentRow?.preferences && typeof currentRow.preferences === 'object') ? currentRow.preferences : {}),
      enabled_modules: enabledModules,
      module_order: enabledModules,
      theme: typeof body.theme === 'string' ? body.theme : 'dark',
      accent_color: typeof body.accentColor === 'string' ? body.accentColor : '#06b6d4',
      ai_personality: typeof body.aiPersonality === 'string' ? body.aiPersonality : 'professional',
      ai_proactivity_level: typeof body.aiProactivity === 'number' ? body.aiProactivity : 3,
      onboarding_completed_at: new Date().toISOString(),
    };

    const { error } = await serverAuth.supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        preferences: mergedPreferences,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      return new Response(JSON.stringify({
        success: false,
        error: `Database error: ${error.message}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Preferences saved successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
