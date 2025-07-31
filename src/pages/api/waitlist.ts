// src/pages/api/waitlist.ts
import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { email, interest } = await request.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Please provide a valid email address'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createServerClient(cookies);

    // Check if email already exists
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return new Response(JSON.stringify({
        success: false,
        error: 'This email is already on the waitlist'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add to waitlist
    const { data, error } = await supabase
      .from('waitlist')
      .insert({
        email: email.toLowerCase(),
        interest_area: interest || 'everything',
        referrer: request.headers.get('referer') || 'direct',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })
      .select()
      .single();

    if (error) {
      console.error('Waitlist insert error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to join waitlist. Please try again.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // TODO: Send welcome email (implement with your email service)
    // await sendWelcomeEmail(email);

    return new Response(JSON.stringify({
      success: true,
      message: 'Successfully joined the waitlist!',
      position: data.id // Could calculate actual position later
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Waitlist API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Something went wrong. Please try again.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};