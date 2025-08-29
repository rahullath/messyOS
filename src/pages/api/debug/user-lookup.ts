import type { APIRoute } from 'astro';
import { authService } from '../../../lib/auth/supabase-auth';

export const GET: APIRoute = async ({ url, cookies }) => {
  const userId = url.searchParams.get('id');
  
  if (!userId) {
    return new Response('Missing user ID', { status: 400 });
  }

  try {
    console.log('🔍 Looking up user:', userId);
    
    // Check if current user is authenticated (security check for debug endpoint)
    const auth = authService.createServerAuth(cookies);
    const currentUser = await auth.getUser();
    
    if (!currentUser) {
      return new Response('Authentication required for debug endpoint', { status: 401 });
    }
    
    // Get user token balance and other info
    const tokenBalance = await authService.getUserTokenBalance(userId);
    const integrations = await authService.getUserIntegrations(userId);
    
    console.log('📊 User lookup result:', { userId, tokenBalance, integrations });
    
    return new Response(JSON.stringify({
      userId,
      tokenBalance,
      integrations,
      found: !!tokenBalance
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ User lookup error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      userId
    }, null, 2), { status: 500 });
  }
};