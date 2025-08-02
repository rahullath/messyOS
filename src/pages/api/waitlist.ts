// src/pages/api/waitlist.ts
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, interest } = body;

    if (!email) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Email is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For now, just log the waitlist entry
    // In production, you'd save this to a database
    console.log('Waitlist signup:', { email, interest, timestamp: new Date().toISOString() });

    // TODO: Save to database
    // const { error } = await supabase
    //   .from('waitlist')
    //   .insert({ email, interest, created_at: new Date().toISOString() });

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Successfully joined waitlist!' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Waitlist error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to join waitlist' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
