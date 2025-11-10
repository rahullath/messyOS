// src/pages/api/onboarding/complete.ts - Complete onboarding process
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import { onboardingService } from '../../../lib/onboarding/service';

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
    const { profile, preferences } = body;

    console.log('🔄 Completing onboarding for user:', user.id);

    // Validate required data
    if (!profile || !profile.fullName || !profile.timezone) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Profile data is incomplete' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Save onboarding preferences using the service
    const success = await onboardingService.saveOnboardingPreferences(user.id, {
      enabledModules: preferences?.enabledModules || profile.preferredModules || ['habits', 'tasks', 'health', 'finance'],
      theme: preferences?.theme || 'dark',
      accentColor: preferences?.accentColor || '#06b6d4',
      aiPersonality: preferences?.aiPersonality || 'professional',
      aiProactivity: preferences?.aiProactivity || 3,
      selectedIntegrations: preferences?.selectedIntegrations || []
    });

    if (!success) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to save onboarding data' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create user profile
    const userProfile = await onboardingService.createUserProfile(user.id, {
      fullName: profile.fullName,
      timezone: profile.timezone,
      preferredModules: profile.preferredModules || ['habits', 'tasks', 'health', 'finance']
    });

    if (!userProfile) {
      console.warn('Failed to create user profile, but continuing...');
    }

    console.log('✅ Onboarding completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Onboarding completed successfully',
      redirectTo: '/dashboard'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Onboarding completion error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Unknown error occurred'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};