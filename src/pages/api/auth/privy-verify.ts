// src/pages/api/auth/privy-verify.ts - Privy Token Verification API
// Handles Privy authentication token verification for server-side auth

import type { APIRoute } from 'astro';
import { privyAuthService } from '../../../lib/auth/privy-auth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { token } = await request.json();

    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication token required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify the Privy token
    const verification = await privyAuthService.verifyAuthToken(token);
    
    if (!verification) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid or expired token'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user from database
    const user = await privyAuthService.getUserByPrivyId(verification.userId);
    
    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update last login
    await privyAuthService.updateLastLogin(verification.userId);

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        hasEmbeddedWallet: user.hasEmbeddedWallet
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Privy verification error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};