import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ cookies }) => {
  const supabase = createServerClient(cookies);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Delete all finance metrics for the user
    const { error } = await supabase
      .from('metrics')
      .delete()
      .eq('user_id', user.id)
      .in('type', ['expense', 'income', 'crypto_value']);

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      message: 'All finance data cleaned successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Clean error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
