// src/pages/api/auth/migrate-user.ts - API endpoint for user migration
import type { APIRoute } from 'astro';
import { privyAuthService } from '../../../lib/auth/privy-auth';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { email, privyUserId, phone, walletAddress, linkedAccounts } = body;

    if (!email || !privyUserId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email and Privy user ID are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user needs migration
    const existingUser = await privyAuthService.getUserByEmail(email);
    
    if (!existingUser) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No existing user found with this email'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (existingUser.already_linked) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User is already linked to a Privy account'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Perform migration
    const migratedUser = await privyAuthService.upsertUser({
      id: privyUserId,
      email,
      phone,
      walletAddress,
      linkedAccounts: linkedAccounts || []
    });

    if (!migratedUser) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to migrate user'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'User successfully migrated to Privy',
      user: migratedUser
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Migration API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error during migration'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// GET endpoint to check migration status
export const GET: APIRoute = async ({ url }) => {
  try {
    const email = url.searchParams.get('email');
    
    if (!email) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email parameter is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const existingUser = await privyAuthService.getUserByEmail(email);
    
    return new Response(JSON.stringify({
      success: true,
      needsMigration: existingUser && !existingUser.already_linked,
      alreadyLinked: existingUser?.already_linked || false,
      userExists: !!existingUser
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Migration check API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};