// src/pages/api/skip-onboarding.ts - Quick bypass for onboarding issues
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ cookies }) => {
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

    console.log('Skipping onboarding for user:', user.id);

    // Check if user already has preferences
    const existingPrefs = await serverAuth.getUserPreferences(user.id);
    if (existingPrefs) {
      console.log('User already has preferences');
      return new Response(JSON.stringify({
        success: true,
        message: 'Onboarding already completed'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const created = await serverAuth.createDefaultPreferences(user.id, user.email);

    if (!created) {
      console.error('Failed to create default preferences for onboarding bypass');
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to initialize user preferences'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Onboarding bypassed using default preferences');

    return new Response(JSON.stringify({
      success: true,
      message: 'Onboarding skipped successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Skip onboarding error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
