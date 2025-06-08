import { supabase } from '../supabase/client';

// SINGLE USER HARDCODED AUTH
const ALLOWED_EMAIL = 'ketaminedevs@gmail.com';

export class SimpleAuth {
  private static user: any = null;
  private static isReady = false;

  static async initialize() {
    if (this.isReady) return this.user;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.email === ALLOWED_EMAIL) {
        this.user = session.user;
        console.log('✅ User authenticated:', this.user.email);
      } else {
        console.log('❌ Unauthorized user');
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    }

    this.isReady = true;
    return this.user;
  }

  static getCurrentUser() {
    return this.user;
  }

  static isAuthenticated() {
    return this.user?.email === ALLOWED_EMAIL;
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
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      };
    }
  }

  static async signOut() {
    try {
      await supabase.auth.signOut();
      this.user = null;
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}

// Automatically check authentication on script load
if (typeof window !== 'undefined') {
  SimpleAuth.initialize();
}
