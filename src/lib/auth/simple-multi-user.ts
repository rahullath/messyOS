
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

  async createDefaultPreferences(userId: string, userEmail?: string) {
    try {
      console.log('🔧 Creating default preferences for new user:', userId);

      const defaultPrefs = {
        user_id: userId,
        theme: 'dark',
        accent_color: '#8b5cf6',
        enabled_modules: ['habits', 'tasks', 'health', 'finance'],
        module_order: ['habits', 'tasks', 'health', 'finance'],
        ai_personality: 'professional',
        ai_proactivity_level: 3,
        subscription_status: 'trial',
        trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      const { data, error } = await this.supabase
        .from('user_preferences')
        .insert(defaultPrefs)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create default preferences:', error);
        return null;
      }

      console.log('✅ Default preferences created for user:', userId);

      // Also check if user should be activated from waitlist
      if (userEmail) {
        await this.activateFromWaitlist(userEmail);
      }

      return data;
    } catch (error) {
      console.error('❌ Error creating default preferences:', error);
      return null;
    }
  }

  async activateFromWaitlist(email: string) {
    try {
      const { data: waitlistEntry } = await this.supabase
        .from('waitlist')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      if (waitlistEntry && !waitlistEntry.activated) {
        const { error } = await this.supabase
          .from('waitlist')
          .update({
            activated: true,
            activation_date: new Date().toISOString()
          })
          .eq('id', waitlistEntry.id);

        if (!error) {
          console.log('✅ User activated from waitlist:', email);
        }
      }
    } catch (error) {
      // Non-critical error, just log it
      console.log('ℹ️ Could not activate from waitlist (user may not be on waitlist):', email);
    }
  }
}

export function createServerAuth(cookies: any) {
  return new ServerAuth(cookies);
}