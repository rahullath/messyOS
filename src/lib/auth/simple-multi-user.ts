
import { createServerClient } from '../supabase/server';
import type { User } from '@supabase/supabase-js';

export class ServerAuth {
  public supabase: any;

  constructor(cookies: any) {
    this.supabase = createServerClient(cookies);
  }

  async getUser(): Promise<User | null> {
    try {
      // First try to get the session
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
      
      if (sessionError) {
        console.log('Session error:', sessionError.message);
      }
      
      if (session?.user) {
        console.log('✅ Found session for:', session.user.email);
        return session.user;
      }

      // If no session, try to get user directly
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      
      if (userError) {
        console.log('User fetch error:', userError.message);
        return null;
      }

      if (user) {
        console.log('✅ Found user:', user.email);
        return user;
      }

      console.log('🚫 No user found');
      return null;
    } catch (error) {
      console.error('Auth error:', error);
      return null;
    }
  }

  async requireAuth(): Promise<User> {
    const user = await this.getUser();
    if (!user) {
      throw new Error('Authentication required');
    }
    return user;
  }

  async getUserPreferences(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Preferences error:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return null;
    }
  }
}

export function createServerAuth(cookies: any) {
  return new ServerAuth(cookies);
}