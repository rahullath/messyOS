// src/pages/api/auth/privy-sync.ts - Privy User Sync API
// Handles user creation/update when they first login with Privy

import type { APIRoute } from 'astro';
import { privyAuthService } from '../../../lib/auth/privy-auth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { user: privyUser, token } = await request.json();

    if (!privyUser || !token) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User data and token required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify the token first
    const verification = await privyAuthService.verifyAuthToken(token);
    if (!verification || verification.userId !== privyUser.id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid token or user mismatch'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract user information from Privy user object
    const email = privyUser.linkedAccounts?.find((account: any) => account.type === 'email')?.address;
    const phone = privyUser.linkedAccounts?.find((account: any) => account.type === 'phone')?.address;
    const walletAddress = privyUser.linkedAccounts?.find((account: any) => account.type === 'wallet')?.address;

    // Create or update user in our database
    const user = await privyAuthService.upsertUser({
      id: privyUser.id,
      email,
      phone,
      walletAddress,
      linkedAccounts: privyUser.linkedAccounts || []
    });

    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create/update user'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user's token balance
    const tokenBalance = await privyAuthService.getUserTokenBalance(user.id);

    // Get user's integration status
    const integrations = await privyAuthService.getUserIntegrations(user.id);

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        walletAddress: user.walletAddress,
        hasEmbeddedWallet: user.hasEmbeddedWallet,
        linkedAccounts: user.linkedAccounts
      },
      tokenBalance,
      integrations
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Privy sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};