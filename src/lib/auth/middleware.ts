// src/lib/auth/middleware.ts - Hybrid Authentication Middleware
// Supports both Supabase and Privy authentication

import type { APIContext } from 'astro';
import { privyAuthService } from './privy-auth';
// Temporarily removed Supabase SSR import to avoid compatibility issues

export interface AuthUser {
  id: string;
  email?: string;
  provider: 'supabase' | 'privy';
  privyUserId?: string;
  supabaseUserId?: string;
}

export class AuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Hybrid authentication middleware that supports both Supabase and Privy
 */
export async function authenticateRequest(context: APIContext): Promise<AuthUser | null> {
  const { request, cookies } = context;

  // Try Privy authentication first
  const privyUser = await authenticatePrivy(request, cookies);
  if (privyUser) {
    return privyUser;
  }

  // Fallback to Supabase authentication
  const supabaseUser = await authenticateSupabase(context);
  if (supabaseUser) {
    return supabaseUser;
  }

  return null;
}

/**
 * Require authentication - throws AuthError if not authenticated
 */
export async function requireAuth(context: APIContext): Promise<AuthUser> {
  const user = await authenticateRequest(context);
  if (!user) {
    throw new AuthError('Authentication required', 401);
  }
  return user;
}

/**
 * Authenticate using Privy token
 */
async function authenticatePrivy(request: Request, cookies: any): Promise<AuthUser | null> {
  try {
    // Get token from Authorization header or cookies
    let token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      token = cookies.get('privy-auth-token')?.value;
    }

    if (!token) {
      return null;
    }

    // Verify token
    const verification = await privyAuthService.verifyAuthToken(token);
    if (!verification) {
      return null;
    }

    // Get user data
    const privyUser = await privyAuthService.getUserByPrivyId(verification.userId);
    if (!privyUser) {
      return null;
    }

    // Set Privy user context for RLS
    // This is used by the database RLS policies
    process.env.APP_CURRENT_USER_PRIVY_ID = verification.userId;

    return {
      id: verification.userId,
      email: privyUser.email,
      provider: 'privy',
      privyUserId: verification.userId
    };
  } catch (error) {
    console.error('Privy authentication error:', error);
    return null;
  }
}

/**
 * Authenticate using Supabase session (simplified for compatibility)
 */
async function authenticateSupabase(context: APIContext): Promise<AuthUser | null> {
  try {
    // For now, skip Supabase auth in middleware to avoid import issues
    // This will be handled by the old auth system during transition
    return null;
  } catch (error) {
    console.error('Supabase authentication error:', error);
    return null;
  }
}

/**
 * Middleware factory for API routes
 */
export function withAuth(handler: (context: APIContext, user: AuthUser) => Promise<Response>) {
  return async (context: APIContext): Promise<Response> => {
    try {
      const user = await requireAuth(context);
      return await handler(context, user);
    } catch (error) {
      if (error instanceof AuthError) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      console.error('Auth middleware error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

/**
 * Optional auth middleware - doesn't require authentication but provides user if available
 */
export function withOptionalAuth(handler: (context: APIContext, user?: AuthUser) => Promise<Response>) {
  return async (context: APIContext): Promise<Response> => {
    try {
      const user = await authenticateRequest(context);
      return await handler(context, user || undefined);
    } catch (error) {
      console.error('Optional auth middleware error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

/**
 * Get user ID for database queries (handles both auth systems)
 */
export function getUserIdForDb(user: AuthUser): string {
  if (user.provider === 'privy') {
    return user.privyUserId!;
  } else {
    return user.supabaseUserId!;
  }
}

/**
 * Set database context for RLS policies
 */
export async function setDbContext(user: AuthUser, supabase: any) {
  if (user.provider === 'privy') {
    // Set Privy user context for RLS
    await supabase.rpc('set_config', {
      parameter: 'app.current_user_privy_id',
      value: user.privyUserId
    });
  }
  // Supabase context is automatically set via auth.uid()
}