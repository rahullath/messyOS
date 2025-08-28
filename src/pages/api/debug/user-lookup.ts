import type { APIRoute } from 'astro';
import { privyAuthService } from '../../../lib/auth/privy-auth';

export const GET: APIRoute = async ({ url }) => {
  const privyId = url.searchParams.get('id');
  
  if (!privyId) {
    return new Response('Missing privy ID', { status: 400 });
  }

  try {
    console.log('🔍 Looking up user:', privyId);
    
    // Try to find user
    const user = await privyAuthService.getUserByPrivyId(privyId);
    
    console.log('📊 User lookup result:', user);
    
    return new Response(JSON.stringify({
      privyId,
      user,
      found: !!user
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ User lookup error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      privyId
    }, null, 2), { status: 500 });
  }
};