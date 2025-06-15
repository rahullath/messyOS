import type { APIRoute } from 'astro';
export const POST: APIRoute = async ({ request, cookies }) => {
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
