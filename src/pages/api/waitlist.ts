// src/pages/api/waitlist.ts - Enhanced Waitlist API with Database Integration
import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { email, interest, referrer } = body;

    if (!email) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Email is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Please enter a valid email address' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createServerClient(cookies);
    
    // Check if email already exists
    const { data: existingEntry } = await supabase
      .from('waitlist')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingEntry) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'This email is already on our waitlist!' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user agent for analytics
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    
    // Save to database
    const { data, error } = await supabase
      .from('waitlist')
      .insert({
        email: email.toLowerCase(),
        interest_area: interest || 'everything',
        referrer: referrer || 'direct',
        user_agent: userAgent,
        signup_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Waitlist database error:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to join waitlist. Please try again.' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ New waitlist signup:', { 
      email: email.toLowerCase(), 
      interest: interest || 'everything',
      id: data.id 
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Successfully joined the waitlist! We\'ll notify you when meshOS is ready.',
      data: {
        id: data.id,
        position: 'We\'ll let you know your position soon!'
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Waitlist API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Something went wrong. Please try again.' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
