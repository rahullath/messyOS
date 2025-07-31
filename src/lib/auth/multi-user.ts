// src/lib/auth/multi-user.ts
import { createBrowserClient, createServerClient } from '../supabase/client';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  preferences?: UserPreferences;
  subscription?: UserSubscription;
}

export interface UserPreferences {
  theme: string;
  accent_color: string;
  enabled_modules: string[];
  module_order: string[];
  ai_personality: string;
  ai_proactivity_level: number;
}

export interface UserSubscription {
  plan_type: 'trial' | 'premium' | 'free';
  status: 'active' | 'cancelled' | 'suspended' | 'expired';
  trial_end: string;
  next_billing_date?: string;
}

export class MultiUserAuth {
  private supabase = createBrowserClient();
  
  /**
   * Get current authenticated user with preferences and subscription
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error || !user) {
        return null;
      }

      // Fetch user preferences and subscription
      const [preferencesResult, subscriptionResult] = await Promise.all([
        this.supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single(),
        this.supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single()
      ]);

      return {
        id: user.id,
        email: user.email || '',
        preferences: preferencesResult.data || undefined,
        subscription: subscriptionResult.data || undefined
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  }

  /**
   * Check if user has active subscription (trial or paid)
   */
  async hasActiveSubscription(): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user?.subscription) return false;
    
    const { subscription } = user;
    const now = new Date();
    
    // Check if trial is still active
    if (subscription.plan_type === 'trial') {
      return new Date(subscription.trial_end) > now;
    }
    
    // Check if paid subscription is active
    return subscription.status === 'active';
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  }

  /**
   * Sign up with email and password
   */
  async signUpWithEmail(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`
      }
    });
    
    if (error) throw error;
    return data;
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle() {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/onboarding`
      }
    });
    
    if (error) throw error;
    return data;
  }

  /**
   * Sign out current user
   */
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
    
    // Redirect to landing page
    window.location.href = '/landing';
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) throw error;
  }

  /**
   * Update user password
   */
  async updatePassword(newPassword: string) {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const authUser = await this.getCurrentUser();
        callback(authUser);
      } else {
        callback(null);
      }
    });
  }

  /**
   * Get session for server-side use
   */
  async getSession(): Promise<Session | null> {
    const { data: { session } } = await this.supabase.auth.getSession();
    return session;
  }
}

/**
 * Server-side authentication utilities
 */
export class ServerAuth {
  private supabase: any;

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
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
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

// Global auth instance
export const auth = new MultiUserAuth();

// Auth hooks for React components
export function useAuth() {
  return auth;
}

// Helper to create server auth instance
export function createServerAuth(cookies: any) {
  return new ServerAuth(cookies);
}