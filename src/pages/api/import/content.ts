import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ request, cookies }) => {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
  try {
    
    // Forward the request to the specific Serializd import API route
    const response = await fetch('http://localhost:4321/api/content/import/serializd', {
      method: 'POST',
      headers: {
        // Forward cookies to maintain session/authentication
        'Cookie': request.headers.get('Cookie') || ''
      },
      body: await request.formData() // Forward the form data directly
    });

    // Return the response from the Serializd import API
    return response;

  } catch (error: any) {
    // Handle auth errors
    if (error.message === 'Authentication required') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Please sign in to continue'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.error('API Error:', error);
    console.error('❌ Content import proxy error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Content import proxy failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
