// src/pages/api/waitlist.ts - Waitlist API with graceful schema errors
import type { APIRoute } from 'astro';
import { createServerClient } from '../../lib/supabase/server';
import { sendWaitlistConfirmationEmail } from '../../lib/notifications/email';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { email, interest, referrer } = body ?? {};

    if (!email) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(String(email))) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Please enter a valid email address',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createServerClient(cookies);
    const waitlistId = crypto.randomUUID();
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    const { error } = await supabase
      .from('waitlist')
      .insert({
        id: waitlistId,
        email: String(email).toLowerCase(),
        interest_area: typeof interest === 'string' ? interest : 'everything',
        referrer: typeof referrer === 'string' ? referrer : 'direct',
        user_agent: userAgent,
        signup_date: new Date().toISOString(),
      })
      ;

    if (error) {
      console.error('Waitlist database error:', error);

      if (error.code === '23505') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'This email is already on our waitlist!',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      if (error.code === '42P01') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Waitlist is not configured yet. Please contact support.',
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to join waitlist. Please try again.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    await sendWaitlistConfirmationEmail(String(email).toLowerCase());

    return new Response(
      JSON.stringify({
        success: true,
        message: "Successfully joined the waitlist! We'll notify you when meshOS is ready.",
        data: {
          id: waitlistId,
          position: "We'll let you know your position soon!",
        },
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Waitlist API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Something went wrong. Please try again.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
