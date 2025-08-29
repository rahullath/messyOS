// src/lib/auth/middleware.ts - Pure Supabase Authentication Middleware
// Simple, clean Supabase-only authentication

import type { APIContext } from 'astro';
import { authService } from './supabase-auth';

export interface AuthUser {
  id: string;
  email: string;
  profile: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    simulated_wallet_address?: string;
    wallet_created_at?: string;
  };
}

export class AuthError extends Error {
  constructor(message: string, public statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Pure Supabase authentication middleware
 */
export async function authenticateRequest(context: APIContext): Promise<AuthUser | null> {
  const { cookies } = context;

  try {
    const auth = authService.createServerAuth(cookies);
    const user = await auth.getUser();
    
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      profile: user.profile
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
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
 * Get user ID for database queries (Supabase-only)
 */
export function getUserIdForDb(user: AuthUser): string {
  return user.id;
}