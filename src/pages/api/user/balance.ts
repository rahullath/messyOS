// src/pages/api/user/balance.ts - Real Token Balance API
// Get current user's token balance and check expiry

import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    console.log('📊 Real token balance API called');
    
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Looking up token balance for user:', user.id);

    // Get real token balance from Supabase
    const tokenBalance = await serverAuth.getUserTokenBalance(user.id);

    if (!tokenBalance) {
      console.log('❌ Failed to get token balance');
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch token balance'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Found token balance:', tokenBalance.balance);

    return new Response(JSON.stringify({
      success: true,
      balance: tokenBalance.balance,
      total_earned: tokenBalance.total_earned,
      total_spent: tokenBalance.total_spent
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Token balance API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch token balance'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};