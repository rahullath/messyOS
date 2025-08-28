// src/lib/auth/privy-auth.ts - Production Privy Authentication Service
// Hybrid auth system supporting both Supabase and Privy users

import { supabase } from '../supabase/client';
import { PrivyClient } from '@privy-io/server-auth';

export interface PrivyUser {
  id: string; // Privy DID (did:privy:abc123)
  email?: string;
  phone?: string;
  walletAddress?: string;
  linkedAccounts: Array<{
    type: 'email' | 'phone' | 'wallet' | 'google' | 'apple' | 'twitter';
    address: string;
    verified: boolean;
  }>;
  createdAt: string;
  hasEmbeddedWallet: boolean;
}

export interface AuthSession {
  user: PrivyUser;
  accessToken: string;
  isAuthenticated: boolean;
  expiresAt: string;
}

class PrivyAuthService {
  private supabase = supabase;
  private privyClient: PrivyClient | null = null;

  constructor() {
    // Initialize Privy client with production credentials
    const appId = process.env.PUBLIC_PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;
    
    if (appId && appSecret) {
      this.privyClient = new PrivyClient(appId, appSecret);
    } else {
      console.warn('Privy credentials not configured. Using fallback mode.');
    }
  }

  /**
   * Verify Privy auth token and get user claims (PRODUCTION)
   */
  async verifyAuthToken(token: string): Promise<{ userId: string; claims: any } | null> {
    try {
      if (!token || token === 'invalid') {
        return null;
      }

      if (this.privyClient) {
        // Production: Use actual Privy verification
        try {
          const claims = await this.privyClient.verifyAuthToken(token);
          return {
            userId: claims.userId,
            claims: claims
          };
        } catch (privyError) {
          console.error('Privy token verification failed:', privyError);
          return null;
        }
      } else {
        // Fallback: Basic JWT decode for development
        console.warn('Using fallback token verification - not for production!');
        try {
          const base64Payload = token.split('.')[1];
          if (!base64Payload) return null;
          
          const payload = JSON.parse(atob(base64Payload));
          return {
            userId: payload.sub || payload.userId,
            claims: payload
          };
        } catch {
          return null;
        }
      }
    } catch (error) {
      console.error('Error verifying Privy token:', error);
      return null;
    }
  }

  /**
   * Get user by Privy ID - checks both privy_users and user_privy_links tables
   */
  async getUserByPrivyId(privyId: string): Promise<PrivyUser | null> {
    try {
      // First check the new user_privy_links table for migrated users
      const { data: linkData, error: linkError } = await this.supabase
        .from('user_privy_links')
        .select(`
          privy_user_id,
          email,
          phone,
          wallet_address,
          linked_accounts,
          created_at,
          supabase_user_id,
          auth.users!inner(
            email,
            created_at
          )
        `)
        .eq('privy_user_id', privyId)
        .single();

      if (!linkError && linkData) {
        return {
          id: linkData.privy_user_id,
          email: linkData.email || linkData.auth?.users?.email,
          phone: linkData.phone,
          walletAddress: linkData.wallet_address,
          linkedAccounts: linkData.linked_accounts || [],
          createdAt: linkData.created_at,
          hasEmbeddedWallet: !!linkData.wallet_address
        };
      }

      // Fallback: check the old privy_users table
      const { data, error } = await this.supabase
        .from('privy_users')
        .select('*')
        .eq('privy_id', privyId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.privy_id,
        email: data.email,
        phone: data.phone,
        walletAddress: data.wallet_address,
        linkedAccounts: data.linked_accounts || [],
        createdAt: data.created_at,
        hasEmbeddedWallet: !!data.wallet_address
      };
    } catch (error) {
      console.error('Error getting user by Privy ID:', error);
      return null;
    }
  }

  /**
   * Check if user exists by email (for migration purposes)
   */
  async getUserByEmail(email: string): Promise<{ supabase_user_id: string; already_linked: boolean } | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('user_needs_migration', { p_email: email });

      if (error || !data || data.length === 0) {
        return null;
      }

      const userData = data[0];
      return {
        supabase_user_id: userData.supabase_user_id,
        already_linked: userData.already_linked
      };
    } catch (error) {
      console.error('Error checking user by email:', error);
      return null;
    }
  }

  /**
   * Create or update user on first login (with migration support)
   */
  async upsertUser(privyUserData: {
    id: string;
    email?: string;
    phone?: string;
    walletAddress?: string;
    linkedAccounts: any[];
  }): Promise<PrivyUser | null> {
    try {
      console.log('🔄 Upserting user:', privyUserData);
      
      // Check if this email belongs to an existing Supabase user
      let existingUser = null;
      if (privyUserData.email) {
        console.log('📧 Checking for existing user with email:', privyUserData.email);
        existingUser = await this.getUserByEmail(privyUserData.email);
        console.log('🔍 Existing user check result:', existingUser);
      }

      if (existingUser && !existingUser.already_linked) {
        // Migrate existing Supabase user to Privy
        const { error: linkError } = await this.supabase
          .rpc('link_user_with_privy', {
            p_supabase_user_id: existingUser.supabase_user_id,
            p_privy_user_id: privyUserData.id,
            p_email: privyUserData.email,
            p_phone: privyUserData.phone,
            p_wallet_address: privyUserData.walletAddress,
            p_linked_accounts: privyUserData.linkedAccounts
          });

        if (linkError) {
          console.error('Error linking existing user:', linkError);
          // Fall through to create new user
        } else {
          console.log('Successfully migrated existing user to Privy');
          return await this.getUserByPrivyId(privyUserData.id);
        }
      } else {
        // Create new user using service role to bypass RLS
        const { createClient } = await import('@supabase/supabase-js');
        const serviceSupabase = createClient(
          process.env.PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        const { data, error } = await serviceSupabase
          .from('privy_users')  
          .insert({
            privy_id: privyUserData.id,
            email: privyUserData.email,
            phone: privyUserData.phone,
            wallet_address: privyUserData.walletAddress,
            linked_accounts: privyUserData.linkedAccounts,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating user link:', error);
          return null;
        }

        // Initialize token balance for new users (only if not migrated)
        if (!existingUser) {
          await this.initializeUserTokens(privyUserData.id);
          await this.initializeUserPreferences(privyUserData.id);
        }

        return {
          id: privyUserData.id,
          email: privyUserData.email,
          phone: privyUserData.phone,
          walletAddress: privyUserData.walletAddress,
          linkedAccounts: privyUserData.linkedAccounts,
          createdAt: data.created_at,
          hasEmbeddedWallet: !!privyUserData.walletAddress
        };
      }
    } catch (error) {
      console.error('Error upserting user:', error);
      return null;
    }
  }

  /**
   * Initialize token balance for new user
   */
  private async initializeUserTokens(privyId: string): Promise<void> {
    try {
      // Check if user already has tokens
      const { data: existing } = await this.supabase
        .from('user_tokens')
        .select('id')
        .eq('privy_user_id', privyId)
        .single();

      if (existing) {
        return; // User already has token balance
      }

      // Create initial token balance
      const { error } = await this.supabase
        .from('user_tokens')
        .insert({
          privy_user_id: privyId,
          balance: 5000, // ₹500 starting credit
          total_earned: 5000,
          total_spent: 0,
          wallet_type: 'privy'
        });

      if (error) {
        console.error('Error initializing user tokens:', error);
        return;
      }

      // Log welcome bonus transaction
      await this.supabase
        .from('token_transactions')
        .insert({
          privy_user_id: privyId,
          transaction_type: 'bonus',
          amount: 5000,
          description: 'Welcome to meshOS! ₹500 starting credit',
          balance_before: 0,
          balance_after: 5000,
          metadata: {
            bonus_type: 'welcome',
            amount_inr: 500,
            privy_user_id: privyId
          }
        });
    } catch (error) {
      console.error('Error initializing user tokens:', error);
    }
  }

  /**
   * Initialize user preferences for new user
   */
  private async initializeUserPreferences(privyId: string): Promise<void> {
    try {
      // Check if user already has preferences
      const { data: existing } = await this.supabase
        .from('user_preferences')
        .select('id')
        .eq('privy_user_id', privyId)
        .single();

      if (existing) {
        return; // User already has preferences
      }

      // Create default preferences
      const { error } = await this.supabase
        .from('user_preferences')
        .insert({
          privy_user_id: privyId,
          theme: 'dark',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          notifications: {
            email: true,
            push: true,
            ai_insights: true,
            weekly_summary: true
          },
          privacy: {
            analytics: true,
            personalization: true,
            data_export: false
          },
          ai_settings: {
            autonomous_actions: true,
            confidence_threshold: 0.8,
            max_actions_per_session: 5
          }
        });

      if (error) {
        console.error('Error initializing user preferences:', error);
      }
    } catch (error) {
      console.error('Error initializing user preferences:', error);
    }
  }

  /**
   * Get user's token balance
   */
  async getUserTokenBalance(privyId: string): Promise<{
    balance: number;
    total_earned: number;
    total_spent: number;
  } | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_tokens')
        .select('balance, total_earned, total_spent')
        .eq('privy_user_id', privyId)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting user token balance:', error);
      return null;
    }
  }

  /**
   * Update user's last login time
   */
  async updateLastLogin(privyId: string): Promise<void> {
    try {
      await this.supabase
        .from('privy_users')
        .update({ last_login: new Date().toISOString() })
        .eq('privy_id', privyId);
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  /**
   * Link integration accounts to Privy user
   */
  async linkIntegrationAccount(
    privyId: string, 
    integration: 'github' | 'outlook' | 'fitness',
    accountData: any
  ): Promise<boolean> {
    try {
      const tableName = `${integration}_profiles`;
      
      const { error } = await this.supabase
        .from(tableName)
        .upsert({
          privy_user_id: privyId,
          ...accountData,
          linked_at: new Date().toISOString()
        });

      if (error) {
        console.error(`Error linking ${integration} account:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Error linking ${integration} account:`, error);
      return false;
    }
  }

  /**
   * Get user's integration status
   */
  async getUserIntegrations(privyId: string): Promise<{
    github: boolean;
    outlook: boolean;
    banking: boolean;
    fitness: boolean;
  }> {
    try {
      const [githubResult, outlookResult, bankingResult, fitnessResult] = await Promise.all([
        this.supabase.from('github_profiles').select('id').eq('privy_user_id', privyId).single(),
        this.supabase.from('outlook_profiles').select('id').eq('privy_user_id', privyId).single(),
        this.supabase.from('bank_transaction_insights').select('id').eq('privy_user_id', privyId).limit(1).single(),
        this.supabase.from('fitness_metrics').select('id').eq('privy_user_id', privyId).limit(1).single()
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
   * Delete user and all associated data
   */
  async deleteUser(privyId: string): Promise<boolean> {
    try {
      // Delete from all tables that reference the user
      const deleteOperations = [
        this.supabase.from('user_tokens').delete().eq('privy_user_id', privyId),
        this.supabase.from('token_transactions').delete().eq('privy_user_id', privyId),
        this.supabase.from('ai_usage_sessions').delete().eq('privy_user_id', privyId),
        this.supabase.from('user_preferences').delete().eq('privy_user_id', privyId),
        this.supabase.from('github_profiles').delete().eq('privy_user_id', privyId),
        this.supabase.from('outlook_profiles').delete().eq('privy_user_id', privyId),
        this.supabase.from('bank_transaction_insights').delete().eq('privy_user_id', privyId),
        this.supabase.from('fitness_metrics').delete().eq('privy_user_id', privyId),
        this.supabase.from('privy_users').delete().eq('privy_id', privyId)
      ];

      await Promise.all(deleteOperations);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  /**
   * Create server-side authentication session
   */
  createServerAuth(cookies?: any) {
    return {
      getUser: async (): Promise<PrivyUser | null> => {
        try {
          // First try auth token from cookies
          const authToken = cookies?.get('privy-auth-token')?.value || 
                           cookies?.get('authorization')?.value;

          if (authToken) {
            // Verify token
            const verification = await this.verifyAuthToken(authToken);
            if (verification) {
              // Get user from database
              return await this.getUserByPrivyId(verification.userId);
            }
          }

          // Fallback: try user ID cookie (for newly logged in users)
          const userId = cookies?.get('privy_user_id')?.value;
          if (userId) {
            console.log('🔄 Using fallback user ID from cookie:', userId);
            return await this.getUserByPrivyId(userId);
          }

          return null;
        } catch (error) {
          console.error('Error getting user from server auth:', error);
          return null;
        }
      },

      requireAuth: async (): Promise<PrivyUser> => {
        const user = await this.getUser();
        if (!user) {
          throw new Error('Authentication required');
        }
        return user;
      },

      // Get user preferences for onboarding check
      getUserPreferences: async (privyId: string) => {
        try {
          const { data, error } = await this.supabase
            .from('user_preferences')
            .select('*')
            .eq('privy_user_id', privyId)
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
      },

      // For backward compatibility with existing code
      supabase: this.supabase
    };
  }
}

// Export singleton instance
export const privyAuthService = new PrivyAuthService();

// Helper functions for backward compatibility
export const createServerAuth = (cookies?: any) => privyAuthService.createServerAuth(cookies);

export const getUserByPrivyId = (privyId: string) => privyAuthService.getUserByPrivyId(privyId);

export const verifyPrivyToken = (token: string) => privyAuthService.verifyAuthToken(token);

export default privyAuthService;