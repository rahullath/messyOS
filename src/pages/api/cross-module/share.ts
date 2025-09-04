// API endpoint for progress sharing and summary generation
import type { APIRoute } from 'astro';
import { crossModuleService } from '../../../lib/cross-module/integration-service';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../../types/supabase';
import { nanoid } from 'nanoid';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { type, start_date, end_date, title, make_public } = body;

    // Create progress summary
    const summary = await crossModuleService.createProgressSummary(
      user.id,
      type,
      start_date,
      end_date,
      title
    );

    // If making public, generate share token
    let shareToken: string | undefined;
    let shareUrl: string | undefined;

    if (make_public) {
      shareToken = nanoid(16);
      
      const { error: updateError } = await supabase
        .from('progress_summaries')
        .update({
          is_public: true,
          share_token: shareToken
        })
        .eq('id', summary.id);

      if (updateError) {
        throw new Error(`Failed to make summary public: ${updateError.message}`);
      }

      shareUrl = `${new URL(request.url).origin}/share/progress/${shareToken}`;
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        summary,
        share_url: shareUrl,
        share_token: shareToken
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Share API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const searchParams = url.searchParams;
    const shareToken = searchParams.get('token');

    if (!shareToken) {
      return new Response(JSON.stringify({ error: 'Share token required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get public progress summary
    const { data: summary, error } = await supabase
      .from('progress_summaries')
      .select('*')
      .eq('share_token', shareToken)
      .eq('is_public', true)
      .single();

    if (error || !summary) {
      return new Response(JSON.stringify({ error: 'Progress summary not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user profile for display name (without sensitive data)
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, full_name')
      .eq('id', summary.user_id)
      .single();

    const displayName = profile?.full_name || profile?.username || 'Anonymous User';

    return new Response(JSON.stringify({
      success: true,
      data: {
        ...summary,
        user_display_name: displayName,
        user_id: undefined // Remove sensitive user ID
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Share retrieval error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};