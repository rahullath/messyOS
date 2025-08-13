// src/pages/api/auth/complete-signup.ts - Complete New User Signup Process
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

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

    console.log('🔄 Completing signup for user:', user.email);

    // Check if user already has preferences (existing user)
    const existingPrefs = await serverAuth.getUserPreferences(user.id);
    
    if (existingPrefs) {
      console.log('✅ Existing user with preferences, redirecting to dashboard');
      return new Response(JSON.stringify({ 
        success: true, 
        isNewUser: false,
        message: 'Welcome back!',
        redirectTo: '/dashboard'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // New user - create default preferences and guide to onboarding
    const newPrefs = await serverAuth.createDefaultPreferences(user.id, user.email);
    
    if (!newPrefs) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to set up your account. Please try again.' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ New user setup completed:', user.email);

    return new Response(JSON.stringify({ 
      success: true, 
      isNewUser: true,
      message: 'Welcome to meshOS! Let\'s get you set up.',
      redirectTo: '/onboarding'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Signup completion error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Failed to complete signup' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};