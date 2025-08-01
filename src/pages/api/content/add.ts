// src/pages/api/content/add.ts
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Get authenticated user
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const USER_ID = user.id;
    
    const body = await request.json();
    console.log('📝 Content add request:', body);
    
    const { title, content_type, status, rating, platform, genre, language, completed_at } = body;

    // Validate required fields
    if (!title || !content_type) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Title and content type are required'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create supabase client
    const supabase = serverAuth.supabase;

    // Create content entry in metrics table
    const { data, error } = await supabase
      .from('metrics')
      .insert({
        user_id: USER_ID,
        type: 'content',
        value: rating || 0,
        unit: 'rating',
        metadata: {
          title,
          content_type,
          status: status || 'completed',
          rating,
          platform,
          genre: genre || [],
          language: language || 'English',
          completed_at: completed_at || new Date().toISOString(),
          added_manually: true,
          imported_from: 'manual_entry',
          imported_at: new Date().toISOString()
        },
        recorded_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('❌ Database error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: `Database error: ${error.message}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Content added successfully:', data[0]);

    return new Response(JSON.stringify({
      success: true,
      data: data[0],
      message: `Successfully added "${title}"`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Add content error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to add content'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};