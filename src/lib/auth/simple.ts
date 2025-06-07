// src/lib/auth/simple.ts
import { supabase } from '../supabase/client';

// Simple auth state management
export class SimpleAuth {
  private static user: any = null;
  private static isReady = false;
  private static callbacks: Array<(user: any) => void> = [];

  static async initialize() {
    if (this.isReady) return this.user;

    try {
      // Check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        this.user = session.user;
        console.log('✅ User found:', this.user.email);
      } else {
        console.log('ℹ️ No existing session');
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    }

    this.isReady = true;
    this.notifyCallbacks();
    return this.user;
  }

  static getCurrentUser() {
    return this.user;
  }

  static isAuthenticated() {
    return !!this.user;
  }

  static async signInWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/?auth=success'
        }
      });
      
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async signOut() {
    await supabase.auth.signOut();
    this.user = null;
    this.notifyCallbacks();
    window.location.href = '/login';
  }

  static onAuthChange(callback: (user: any) => void) {
    this.callbacks.push(callback);
    
    // If already initialized, call immediately
    if (this.isReady) {
      callback(this.user);
    }
  }

  private static notifyCallbacks() {
    this.callbacks.forEach(callback => callback(this.user));
  }

  // Listen for auth state changes
  static {
    if (typeof window !== 'undefined') {
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth event:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          this.user = session.user;
          console.log('✅ User signed in:', this.user.email);
          
          // Create profile if needed
          await supabase.from('profiles').upsert({
            id: this.user.id,
            username: this.user.email?.split('@')[0],
            full_name: this.user.user_metadata?.full_name || this.user.user_metadata?.name,
            avatar_url: this.user.user_metadata?.avatar_url,
            updated_at: new Date().toISOString()
          });
          
          this.notifyCallbacks();
          
          // Redirect if on login page
          if (window.location.pathname === '/login' || window.location.search.includes('auth=success')) {
            window.location.href = '/';
          }
        } else if (event === 'SIGNED_OUT') {
          this.user = null;
          this.notifyCallbacks();
        }
      });
    }
  }
}