// src/lib/auth/hybrid-auth.ts - Supabase-first auth with Privy wallet management
// Uses Supabase for authentication and Privy only for crypto wallet creation

import { supabase } from '../supabase/client';

export interface HybridUser {
  id: string; // Supabase user ID
  email: string;
  profile: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    privy_wallet_address?: string;
    wallet_linked_at?: string;
  };
  session: any;
  supabaseUser: any;
}

class HybridAuthService {
  private supabase = supabase;

  /**
   * Get current user session from Supabase
   */
  async getCurrentUser(): Promise<HybridUser | null> {
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
        session,
        supabaseUser: session.user
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Link Privy wallet to existing Supabase user
   */
  async linkPrivyWallet(supabaseUserId: string, walletAddress: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('profiles')
        .update({
          privy_wallet_address: walletAddress,
          wallet_linked_at: new Date().toISOString()
        })
        .eq('id', supabaseUserId);

      if (error) {
        console.error('Error linking wallet:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error linking wallet:', error);
      return false;
    }
  }

  /**
   * Get user's token balance from the existing system
   */
  async getUserTokenBalance(supabaseUserId: string): Promise<{
    balance: number;
    total_earned: number;
    total_spent: number;
  } | null> {
    try {
      // Check if user has tokens in the legacy privy system
      const { data: privyTokens } = await this.supabase
        .from('user_tokens')
        .select('balance, total_earned, total_spent')
        .eq('privy_user_id', supabaseUserId) // Try with supabase ID
        .single();

      if (privyTokens) {
        return privyTokens;
      }

      // Check if user has tokens in a user_tokens table using supabase user ID
      const { data: tokens, error } = await this.supabase
        .from('user_tokens')
        .select('balance, total_earned, total_spent')
        .eq('user_id', supabaseUserId) // Standard user_id field
        .single();

      if (error || !tokens) {
        // Initialize tokens for new user
        await this.initializeUserTokens(supabaseUserId);
        return {
          balance: 5000, // ₹500 starting credit
          total_earned: 5000,
          total_spent: 0
        };
      }

      return tokens;
    } catch (error) {
      console.error('Error getting user token balance:', error);
      return null;
    }
  }

  /**
   * Initialize token balance for new user
   */
  private async initializeUserTokens(supabaseUserId: string): Promise<void> {
    try {
      // Create initial token balance using the supabase user ID
      const { error } = await this.supabase
        .from('user_tokens')
        .insert({
          user_id: supabaseUserId, // Use standard user_id field
          balance: 5000, // ₹500 starting credit
          total_earned: 5000,
          total_spent: 0,
          wallet_type: 'supabase_hybrid'
        });

      if (error) {
        console.error('Error initializing user tokens:', error);
        return;
      }

      // Log welcome bonus transaction
      await this.supabase
        .from('token_transactions')
        .insert({
          user_id: supabaseUserId,
          transaction_type: 'bonus',
          amount: 5000,
          description: 'Welcome to meshOS! ₹500 starting credit',
          balance_before: 0,
          balance_after: 5000,
          metadata: {
            bonus_type: 'welcome',
            amount_inr: 500,
            user_id: supabaseUserId
          }
        });
    } catch (error) {
      console.error('Error initializing user tokens:', error);
    }
  }

  /**
   * Get user's integration status
   */
  async getUserIntegrations(supabaseUserId: string): Promise<{
    github: boolean;
    outlook: boolean;
    banking: boolean;
    fitness: boolean;
  }> {
    try {
      const [githubResult, outlookResult, bankingResult, fitnessResult] = await Promise.all([
        this.supabase.from('github_profiles').select('id').eq('user_id', supabaseUserId).single(),
        this.supabase.from('outlook_profiles').select('id').eq('user_id', supabaseUserId).single(),
        this.supabase.from('bank_transaction_insights').select('id').eq('user_id', supabaseUserId).limit(1).single(),
        this.supabase.from('fitness_metrics').select('id').eq('user_id', supabaseUserId).limit(1).single()
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
   * Create server-side authentication session compatible with existing middleware
   */
  createServerAuth(cookies?: any) {
    return {
      getUser: async (): Promise<HybridUser | null> => {
        try {
          // Extract session from cookies (for server-side rendering)
          let session = null;
          
          if (cookies) {
            const accessToken = cookies.get('sb-access-token')?.value;
            const refreshToken = cookies.get('sb-refresh-token')?.value;
            
            if (accessToken && refreshToken) {
              const { data, error } = await this.supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
              });
              session = data.session;
            }
          } else {
            // Client-side: get current session
            const { data } = await this.supabase.auth.getSession();
            session = data.session;
          }

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
            session,
            supabaseUser: session.user
          };
        } catch (error) {
          console.error('Error getting user from server auth:', error);
          return null;
        }
      },

      requireAuth: async (): Promise<HybridUser> => {
        const user = await this.getUser();
        if (!user) {
          throw new Error('Authentication required');
        }
        return user;
      },

      // For backward compatibility
      supabase: this.supabase,

      getUserPreferences: async (userId: string) => {
        try {
          const { data, error } = await this.supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId) // Use standard user_id field
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching user preferences:', error);
            return null;
          }

          return data;
        } catch (error) {
          console.error('Exception fetching user preferences:', error);
          return null;
        }
      }
    };
  }
}

// Export singleton instance
export const hybridAuthService = new HybridAuthService();

// Helper functions for backward compatibility
export const createServerAuth = (cookies?: any) => hybridAuthService.createServerAuth(cookies);

export default hybridAuthService;