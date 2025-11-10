// src/pages/api/auth/session.ts - Session synchronization endpoint
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('🔄 Session sync request received');
    
    const body = await request.json();
    const { access_token, refresh_token, expires_at, expires_in, token_type, user } = body;
    
    if (!access_token || !refresh_token || !user) {
      console.error('❌ Missing required session data');
      return new Response(JSON.stringify({ error: 'Missing session data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Create server client to set cookies properly
    const supabase = createServerClient(cookies);
    
    // Set the session on the server client
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token
    });
    
    if (error) {
      console.error('❌ Failed to set server session:', error);
      return new Response(JSON.stringify({ error: 'Failed to set session', details: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (data.session && data.user) {
      console.log('✅ Server session established for user:', data.user.email);
      return new Response(JSON.stringify({ 
        success: true, 
        user: data.user.email,
        expires_at: data.session.expires_at
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      console.error('❌ No session created on server');
      return new Response(JSON.stringify({ error: 'No session created' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
  } catch (error) {
    console.error('❌ Session sync error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ cookies }) => {
  try {
    console.log('🧹 Session clear request received');
    
    // Create server client to clear cookies properly
    const supabase = createServerClient(cookies);
    
    // Sign out on server side
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Failed to clear server session:', error);
      return new Response(JSON.stringify({ error: 'Failed to clear session' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Server session cleared successfully');
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Session clear error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};