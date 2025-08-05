
import { createServerClient } from '../supabase/server';
import type { User } from '@supabase/supabase-js';

export class ServerAuth {
  public supabase: any;

  constructor(cookies: any) {
    this.supabase = createServerClient(cookies);
  }

  async getUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      
      if (error) {
        console.log('🚫 Server auth error:', error.message);
        return null;
      }
      
      if (!user) {
        console.log('🚫 No user found on server');
        return null;
      }

      console.log('✅ Server found user:', user.email);
      return user;
    } catch (error) {
      console.error('Server auth exception:', error);
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