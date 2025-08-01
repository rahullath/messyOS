import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ cookies }) => {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
  try {
    
    

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
