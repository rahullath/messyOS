// src/pages/api/user/transactions.ts - Get user transaction history

import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const limit = parseInt(url.searchParams.get('limit') || '20');
    const transactions = await serverAuth.getTransactionHistory(user.id, limit);

    return new Response(JSON.stringify(transactions), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Transaction history API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch transaction history'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};