// src/pages/api/content/add.ts
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Hardcoded user ID for single-user system
    const USER_ID = '368deac7-8526-45eb-927a-6a373c95d8c6';
    
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

    // Create supabase client with service role to bypass RLS
    const supabase = createServerClient(cookies);

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