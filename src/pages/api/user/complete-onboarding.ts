// src/pages/api/user/complete-onboarding.ts - Simple onboarding completion for existing flow
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import { sendWelcomeEmail } from '../../../lib/notifications/email';

function getDefaultPreferencePatch() {
  return {
    enabled_modules: ['habits', 'tasks', 'health', 'finance'],
    module_order: ['habits', 'tasks', 'health', 'finance'],
    accent_color: '#06b6d4',
    ai_personality: 'professional',
    ai_proactivity_level: 3,
  };
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

    console.log('Marking onboarding as complete for user:', user.id);

    // Ensure preferences row exists (signals onboarding completion in middleware).
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

    const contentType = request.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const requestPayload = isJson
      ? await request.json().catch(() => ({}))
      : Object.fromEntries((await request.formData()).entries());

    const onboardingProfile = {
      commitments: typeof requestPayload.commitments === 'string' ? requestPayload.commitments : null,
      starting_difficulty: typeof requestPayload.starting_difficulty === 'string' ? requestPayload.starting_difficulty : null,
      structure_style: typeof requestPayload.structure_style === 'string' ? requestPayload.structure_style : null,
      usual_wake_time: typeof requestPayload.usual_wake_time === 'string' ? requestPayload.usual_wake_time : null,
      collected_at: new Date().toISOString(),
    };

    // Apply an onboarding defaults patch to keep behavior deterministic.
    const { data: existingRow } = await serverAuth.supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', user.id)
      .maybeSingle();

    const existingPreferences =
      (existingRow?.preferences && typeof existingRow.preferences === 'object')
        ? existingRow.preferences as Record<string, any>
        : {};
    const firstCompletion = !existingPreferences.onboarding_completed_at;

    const mergedPreferences = {
      ...existingPreferences,
      ...getDefaultPreferencePatch(),
      onboarding_profile: onboardingProfile,
      onboarding_completed_at: new Date().toISOString(),
    };

    const { error: upsertError } = await serverAuth.supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        preferences: mergedPreferences,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (upsertError) {
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to persist onboarding completion: ${upsertError.message}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (firstCompletion && user.email) {
      await sendWelcomeEmail(user.email);
    }

    // Optional form submission redirect for onboarding.astro.
    const isFormSubmission = !isJson;

    if (isFormSubmission) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/dashboard'
        }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Onboarding completed successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Complete onboarding error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
