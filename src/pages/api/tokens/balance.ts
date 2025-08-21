// src/pages/api/tokens/balance.ts - Token Balance API for Privy users
// Get user's token balance by Privy user ID

import type { APIRoute } from 'astro';
import { privyAuthService } from '../../../lib/auth/privy-auth';

export const GET: APIRoute = async ({ url, request }) => {
  try {
    const privyUserId = url.searchParams.get('privy_user_id');

    if (!privyUserId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'privy_user_id parameter required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Optional: Verify the request is authenticated (check Authorization header)
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const verification = await privyAuthService.verifyAuthToken(token);
      
      if (!verification || verification.userId !== privyUserId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Unauthorized access to user data'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Get user's token balance
    const balance = await privyAuthService.getUserTokenBalance(privyUserId);

    if (!balance) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User not found or no token balance available'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      balance: {
        balance: balance.balance,
        total_earned: balance.total_earned,
        total_spent: balance.total_spent,
        balance_inr: Math.floor(balance.balance / 100), // Convert paise to rupees
        formatted_balance: `₹${Math.floor(balance.balance / 100)}`
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Token balance API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { privy_user_id, action, amount, description } = await request.json();

    if (!privy_user_id || !action) {
      return new Response(JSON.stringify({
        success: false,
        error: 'privy_user_id and action required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify the request is authenticated
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const verification = await privyAuthService.verifyAuthToken(token);
      
      if (!verification || verification.userId !== privy_user_id) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Unauthorized access to user data'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Handle different token actions
    switch (action) {
      case 'refresh':
        // Just return current balance
        const balance = await privyAuthService.getUserTokenBalance(privy_user_id);
        return new Response(JSON.stringify({
          success: true,
          balance,
          message: 'Balance refreshed'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      case 'add':
      case 'spend':
        // TODO: Implement token transactions
        return new Response(JSON.stringify({
          success: false,
          error: 'Token transactions not yet implemented'
        }), {
          status: 501,
          headers: { 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid action. Supported actions: refresh, add, spend'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('Token action API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};