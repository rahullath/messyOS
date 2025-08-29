// src/lib/auth/supabase-auth.ts - Pure Supabase Authentication Service
// Clean, simple authentication with simulated wallet functionality

import { supabase } from '../supabase/client';

export interface User {
  id: string;
  email: string;
  profile: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    simulated_wallet_address?: string;
    wallet_created_at?: string;
    preferred_theme?: string;
  };
  session: any;
}

class SupabaseAuthService {
  private supabase = supabase;

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      
      if (!session?.user) {
        return null;
      }

      // Get user profile
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return {
        id: session.user.id,
        email: session.user.email!,
        profile,
        session
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error || !data.session) {
        console.error('Sign in error:', error);
        return null;
      }

      return await this.getCurrentUser();
    } catch (error) {
      console.error('Error signing in with email:', error);
      return null;
    }
  }

  /**
   * Sign up with email and password
   */
  async signUpWithEmail(email: string, password: string, fullName?: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split('@')[0]
          }
        }
      });

      if (error || !data.session) {
        console.error('Sign up error:', error);
        return null;
      }

      // Initialize user with starting tokens and simulated wallet
      await this.initializeNewUser(data.session.user.id);

      return await this.getCurrentUser();
    } catch (error) {
      console.error('Error signing up with email:', error);
      return null;
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithOAuth(provider: 'google' | 'github' | 'apple'): Promise<{ url: string } | null> {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('OAuth sign in error:', error);
        return null;
      }

      return { url: data.url };
    } catch (error) {
      console.error('Error signing in with OAuth:', error);
      return null;
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<boolean> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      return false;
    }
  }

  /**
   * Initialize new user with starting tokens and simulated wallet
   */
  private async initializeNewUser(userId: string): Promise<void> {
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
   * Get user's integration status
   */
  async getUserIntegrations(userId: string): Promise<{
    github: boolean;
    outlook: boolean;
    banking: boolean;
    fitness: boolean;
  }> {
    try {
      const [githubResult, outlookResult, bankingResult, fitnessResult] = await Promise.all([
        this.supabase.from('github_profiles').select('id').eq('user_id', userId).single(),
        this.supabase.from('outlook_profiles').select('id').eq('user_id', userId).single(),
        this.supabase.from('bank_transaction_insights').select('id').eq('user_id', userId).limit(1).single(),
        this.supabase.from('fitness_metrics').select('id').eq('user_id', userId).limit(1).single()
      ]);

      return {
        github: !githubResult.error && !!githubResult.data,
        outlook: !outlookResult.error && !!outlookResult.data,
        banking: !bankingResult.error && !!bankingResult.data,
        fitness: !fitnessResult.error && !!fitnessResult.data
      };
    } catch (error) {
      console.error('Error getting user integrations:', error);
      return {
        github: false,
        outlook: false,
        banking: false,
        fitness: false
      };
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

  /**
   * Create AI session for token tracking
   */
  async createAISession(userId: string, sessionType: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('ai_usage_sessions')
        .insert({
          user_id: userId,
          session_type: sessionType,
          message_count: 0,
          response_tokens: 0,
          actions_executed: 0,
          session_start: new Date().toISOString(),
          deducted: false
        })
        .select('id')
        .single();

      if (error || !data) {
        console.error('Error creating AI session:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error creating AI session:', error);
      return null;
    }
  }

  /**
   * Update AI session metrics
   */
  async updateAISession(sessionId: string, metrics: any): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('ai_usage_sessions')
        .update({
          ...metrics,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.error('Error updating AI session:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating AI session:', error);
      return false;
    }
  }

  /**
   * End AI session and perform token deduction
   */
  async endAISession(sessionId: string, userId: string): Promise<boolean> {
    try {
      // Get session data
      const { data: session, error: sessionError } = await this.supabase
        .from('ai_usage_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        console.error('Error getting session for deduction:', sessionError);
        return false;
      }

      if (session.deducted) {
        console.log('Session already deducted');
        return true;
      }

      // Calculate cost (simplified logic)
      const messageCost = (session.message_count || 0) * 10;
      const tokenCost = Math.ceil((session.response_tokens || 0) / 100) * 1;
      const actionCost = (session.actions_executed || 0) * 5;
      const totalCost = Math.max(messageCost + tokenCost + actionCost, 5);

      // Deduct tokens
      const deductionSuccess = await this.deductTokens(
        userId, 
        totalCost, 
        `AI Session: ${session.message_count || 0} messages, ${session.response_tokens || 0} tokens`,
        {
          session_id: sessionId,
          session_type: session.session_type,
          message_count: session.message_count,
          response_tokens: session.response_tokens,
          actions_executed: session.actions_executed
        }
      );

      if (!deductionSuccess) {
        console.error('Failed to deduct tokens for session');
        return false;
      }

      // Mark session as deducted
      await this.supabase
        .from('ai_usage_sessions')
        .update({
          deducted: true,
          session_end: new Date().toISOString(),
          total_cost: totalCost
        })
        .eq('id', sessionId);

      return true;
    } catch (error) {
      console.error('Error ending AI session:', error);
      return false;
    }
  }

  /**
   * Create server-side authentication session
   */
  createServerAuth(cookies?: any) {
    return {
      getUser: async (): Promise<User | null> => {
        try {
          let serverSupabase = this.supabase;

          // Use service client for server-side if available
          if (cookies && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const { createClient } = await import('@supabase/supabase-js');
            serverSupabase = createClient(
              process.env.PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
          }

          // Extract session from cookies
          let session = null;
          
          if (cookies) {
            const accessToken = cookies.get('sb-access-token')?.value;
            const refreshToken = cookies.get('sb-refresh-token')?.value;
            
            if (accessToken && refreshToken) {
              const { data, error } = await serverSupabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              session = data.session;
            }
          } else {
            const { data } = await this.supabase.auth.getSession();
            session = data.session;
          }

          if (!session?.user) return null;

          // Get user profile
          const { data: profile, error } = await serverSupabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error('Error fetching user profile:', error);
            return null;
          }

          return {
            id: session.user.id,
            email: session.user.email!,
            profile,
            session
          };
        } catch (error) {
          console.error('Error getting user from server auth:', error);
          return null;
        }
      },

      requireAuth: async (): Promise<User> => {
        const user = await this.getUser();
        if (!user) {
          throw new Error('Authentication required');
        }
        return user;
      },

      supabase: this.supabase
    };
  }
}

// Export singleton instance
export const authService = new SupabaseAuthService();
export default authService;