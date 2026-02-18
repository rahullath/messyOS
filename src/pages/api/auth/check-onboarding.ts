// src/pages/api/auth/check-onboarding.ts
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ 
        completed: false, 
        error: 'Not authenticated' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user has preferences (completed onboarding)
    const preferences = await serverAuth.getUserPreferences(user.id);

    return new Response(JSON.stringify({ 
      completed: !!preferences,
      user: { id: user.id, email: user.email }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Onboarding check error:', error);
    return new Response(JSON.stringify({ 
      completed: false, 
      error: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 
