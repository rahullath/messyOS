// src/lib/auth/simple-multi-user.ts
// Simplified multi-user auth that works with existing supabase setup
import { createServerClient } from '../supabase/server';
import type { User } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
}

/**
 * Server-side authentication utilities
 */
export class ServerAuth {
  public supabase: any;

  constructor(cookies: any) {
    this.supabase = createServerClient(cookies);
  }

  /**
   * Get authenticated user on server side
   */
  async getUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Server auth error:', error);
      return null;
    }
  }

  /**
   * Require authentication (throws if not authenticated)
   */
  async requireAuth(): Promise<User> {
    const user = await this.getUser();
    if (!user) {
      throw new Error('Authentication required');
    }
    return user;
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('subscriptions')
        .select('plan_type, status, trial_end')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (!data) return false;

      // Check trial expiry
      if (data.plan_type === 'trial') {
        return new Date(data.trial_end) > new Date();
      }

      return data.status === 'active';
    } catch (error) {
      console.error('Subscription check error:', error);
      return false;
    }
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string) {
    try {
      const { data } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      return data;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return null;
    }
  }
}

// Helper to create server auth instance
export function createServerAuth(cookies: any) {
  return new ServerAuth(cookies);
}