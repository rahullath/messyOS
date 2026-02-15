
import { createServerClient } from '../supabase/server';
import type { User } from '@supabase/supabase-js';

function getDefaultUserPreferences() {
  return {
    theme: 'dark',
    accent_color: '#8b5cf6',
    enabled_modules: ['habits', 'tasks', 'health', 'finance'],
    module_order: ['habits', 'tasks', 'health', 'finance'],
    dashboard_layout: {},
    ai_personality: 'professional',
    ai_proactivity_level: 3,
    data_retention_days: 365,
    share_analytics: false,
    subscription_status: 'trial',
    trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

function normalizePreferenceRecord(record: any) {
  const defaults = getDefaultUserPreferences();
  const payload = record?.preferences && typeof record.preferences === 'object'
    ? record.preferences
    : {};
  const enabledModules = Array.isArray(payload.enabled_modules)
    ? payload.enabled_modules.filter((value: unknown) => typeof value === 'string')
    : defaults.enabled_modules;
  const moduleOrder = Array.isArray(payload.module_order)
    ? payload.module_order.filter((value: unknown) => typeof value === 'string')
    : enabledModules;

  return {
    ...(record || {}),
    ...defaults,
    ...(payload || {}),
    enabled_modules: enabledModules,
    module_order: moduleOrder,
  };
}

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

      if (!data) return null;
      return normalizePreferenceRecord(data);
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
        preferences: getDefaultUserPreferences(),
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

      return normalizePreferenceRecord(data);
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

  // ==================== TOKEN & WALLET FUNCTIONALITY ====================

  /**
   * Initialize new user with starting tokens and simulated wallet
   */
  async initializeNewUser(userId: string): Promise<void> {
    try {
      // Generate a simulated wallet address (looks like Ethereum address)
      const simulatedWalletAddress = '0x' + Array.from(
        { length: 40 }, 
        () => Math.floor(Math.random() * 16).toString(16)
      ).join('');

      // Update profile with simulated wallet
      await this.supabase
        .from('profiles')
        .update({
          simulated_wallet_address: simulatedWalletAddress,
          wallet_created_at: new Date().toISOString()
        })
        .eq('id', userId);

      // Initialize token balance (₹500 = 5000 tokens)
      await this.supabase
        .from('user_tokens')
        .insert({
          user_id: userId,
          balance: 5000,
          total_earned: 5000,
          total_spent: 0,
          wallet_type: 'simulated'
        });

      // Log welcome bonus transaction
      await this.supabase
        .from('token_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'bonus',
          amount: 5000,
          description: 'Welcome to meshOS! ₹500 starting credit',
          balance_before: 0,
          balance_after: 5000,
          metadata: {
            bonus_type: 'welcome',
            amount_inr: 500,
            wallet_address: simulatedWalletAddress
          }
        });

      console.log('New user initialized with simulated wallet:', simulatedWalletAddress);
    } catch (error) {
      console.error('Error initializing new user:', error);
    }
  }

  /**
   * Get user's token balance
   */
  async getUserTokenBalance(userId: string): Promise<{
    balance: number;
    total_earned: number;
    total_spent: number;
  } | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_tokens')
        .select('balance, total_earned, total_spent')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // User not found, initialize
        await this.initializeNewUser(userId);
        return {
          balance: 5000,
          total_earned: 5000,
          total_spent: 0
        };
      }

      if (error || !data) {
        console.error('Error getting token balance:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting user token balance:', error);
      return null;
    }
  }

  /**
   * Deduct tokens for service usage
   */
  async deductTokens(userId: string, amount: number, description: string, metadata?: any): Promise<boolean> {
    try {
      // Get current balance
      const balance = await this.getUserTokenBalance(userId);
      if (!balance || balance.balance < amount) {
        console.error('Insufficient tokens for deduction');
        return false;
      }

      const newBalance = balance.balance - amount;
      const newTotalSpent = balance.total_spent + amount;

      // Update token balance
      const { error: updateError } = await this.supabase
        .from('user_tokens')
        .update({
          balance: newBalance,
          total_spent: newTotalSpent
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating token balance:', updateError);
        return false;
      }

      // Log transaction
      await this.supabase
        .from('token_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'deduction',
          amount: -amount, // Negative for deduction
          description,
          balance_before: balance.balance,
          balance_after: newBalance,
          metadata: {
            ...metadata,
            deduction_reason: description
          }
        });

      return true;
    } catch (error) {
      console.error('Error deducting tokens:', error);
      return false;
    }
  }

  /**
   * Add tokens (for bonuses, refunds, etc.)
   */
  async addTokens(userId: string, amount: number, description: string, metadata?: any): Promise<boolean> {
    try {
      const balance = await this.getUserTokenBalance(userId);
      if (!balance) return false;

      const newBalance = balance.balance + amount;
      const newTotalEarned = balance.total_earned + amount;

      // Update token balance
      const { error: updateError } = await this.supabase
        .from('user_tokens')
        .update({
          balance: newBalance,
          total_earned: newTotalEarned
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating token balance:', updateError);
        return false;
      }

      // Log transaction
      await this.supabase
        .from('token_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'credit',
          amount,
          description,
          balance_before: balance.balance,
          balance_after: newBalance,
          metadata: {
            ...metadata,
            credit_reason: description
          }
        });

      return true;
    } catch (error) {
      console.error('Error adding tokens:', error);
      return false;
    }
  }

  /**
   * Get user's transaction history
   */
  async getTransactionHistory(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('token_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting transaction history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }
}

export function createServerAuth(cookies: any) {
  return new ServerAuth(cookies);
}
