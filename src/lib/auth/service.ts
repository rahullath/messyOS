// src/lib/auth/service.ts - Enhanced authentication service
import { authClient } from './config';
import type { 
  User, 
  TokenBalance, 
  TrialStatus, 
  SignUpData, 
  SignInData, 
  OAuthProvider,
  AuthError,
  UserProfile
} from './types';

class AuthenticationService {
  private client = authClient;

  /**
   * Get current authenticated user with profile data
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { session }, error } = await this.client.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        return null;
      }

      if (!session?.user) {
        return null;
      }

      // Get user profile from database
      const { data: profile, error: profileError } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Create profile if it doesn't exist
        await this.createUserProfile(session.user.id, {
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          username: session.user.email?.split('@')[0] || null,
          avatar_url: session.user.user_metadata?.avatar_url || null
        });
        
        // Retry fetching profile
        const { data: newProfile } = await this.client
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (!newProfile) {
          console.error('Failed to create or fetch user profile');
          return null;
        }
        
        return {
          id: session.user.id,
          email: session.user.email!,
          profile: newProfile,
          session
        };
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
    const { withNetworkAwareRetry } = await import('./retry');
    const { mapSupabaseError } = await import('./errors');

    return withNetworkAwareRetry(
      async () => {
        const { data, error } = await this.client.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password
        });

        if (error) {
          console.error('Sign in error:', error);
          throw mapSupabaseError(error);
        }

        if (!data.session) {
          throw mapSupabaseError({ message: 'No session returned from sign in' });
        }

        return await this.getCurrentUser();
      },
      (networkError) => {
        console.warn('Network error during sign in, retrying...', networkError);
      }
    );
  }

  /**
   * Sign up with email and password
   */
  async signUpWithEmail(data: SignUpData): Promise<User | null> {
    const { withNetworkAwareRetry } = await import('./retry');
    const { mapSupabaseError } = await import('./errors');

    return withNetworkAwareRetry(
      async () => {
        const { data: authData, error } = await this.client.auth.signUp({
          email: data.email.trim().toLowerCase(),
          password: data.password,
          options: {
            data: {
              full_name: data.fullName || data.email.split('@')[0],
              ...data.metadata
            }
          }
        });

        if (error) {
          console.error('Sign up error:', error);
          throw mapSupabaseError(error);
        }

        if (!authData.session) {
          // Email confirmation required
          return null;
        }

        // Initialize new user data
        await this.initializeNewUser(authData.session.user.id, data);

        return await this.getCurrentUser();
      },
      (networkError) => {
        console.warn('Network error during sign up, retrying...', networkError);
      }
    );
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithOAuth(provider: OAuthProvider): Promise<{ url: string } | null> {
    const { withNetworkAwareRetry } = await import('./retry');
    const { mapSupabaseError } = await import('./errors');

    return withNetworkAwareRetry(
      async () => {
        const redirectTo = typeof window !== 'undefined' 
          ? `${window.location.origin}/auth/callback`
          : import.meta.env.PROD 
            ? 'https://messy-os.vercel.app/auth/callback'
            : 'http://localhost:4321/auth/callback';

        const { data, error } = await this.client.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent'
            }
          }
        });

        if (error) {
          console.error('OAuth sign in error:', error);
          throw mapSupabaseError(error);
        }

        return { url: data.url };
      },
      (networkError) => {
        console.warn('Network error during OAuth sign in, retrying...', networkError);
      }
    );
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<boolean> {
    try {
      const { error } = await this.client.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        return false;
      }

      // Clear any cached data
      if (typeof window !== 'undefined') {
        // Dispatch sign out event
        window.dispatchEvent(new CustomEvent('auth:signed-out'));
      }

      return true;
    } catch (error) {
      console.error('Error signing out:', error);
      return false;
    }
  }

  /**
   * Get user's token balance
   */
  async getTokenBalance(userId: string): Promise<TokenBalance | null> {
    try {
      const { data, error } = await this.client
        .from('user_tokens')
        .select('balance, total_earned, total_spent')
        .eq('user_id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // User tokens not found, initialize
        await this.initializeUserTokens(userId);
        return {
          balance: 4800,
          total_earned: 4800,
          total_spent: 0,
          trial_start_date: new Date().toISOString(),
          trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };
      }

      if (error || !data) {
        console.error('Error getting token balance:', error);
        return null;
      }

      return {
        ...data,
        trial_start_date: new Date().toISOString(),
        trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };
    } catch (error) {
      console.error('Error getting token balance:', error);
      return null;
    }
  }

  /**
   * Get trial status
   */
  async getTrialStatus(userId: string): Promise<TrialStatus | null> {
    try {
      const tokenBalance = await this.getTokenBalance(userId);
      if (!tokenBalance || !tokenBalance.trial_end_date) {
        return null;
      }

      const expiresAt = new Date(tokenBalance.trial_end_date);
      const now = new Date();
      const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      return {
        isActive: daysRemaining > 0 && tokenBalance.balance > 0,
        daysRemaining,
        tokensRemaining: tokenBalance.balance,
        expiresAt
      };
    } catch (error) {
      console.error('Error getting trial status:', error);
      return null;
    }
  }

  /**
   * Deduct tokens from user balance
   */
  async deductTokens(userId: string, amount: number, description: string, metadata?: any): Promise<boolean> {
    try {
      const balance = await this.getTokenBalance(userId);
      if (!balance || balance.balance < amount) {
        console.error('Insufficient tokens for deduction');
        return false;
      }

      const newBalance = balance.balance - amount;
      const newTotalSpent = balance.total_spent + amount;

      // Update token balance
      const { error: updateError } = await this.client
        .from('user_tokens')
        .update({
          balance: newBalance,
          total_spent: newTotalSpent,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating token balance:', updateError);
        return false;
      }

      // Log transaction
      await this.client
        .from('token_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'deduction',
          amount: -amount,
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
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating profile:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating profile:', error);
      return false;
    }
  }

  /**
   * Initialize new user with default data
   */
  private async initializeNewUser(userId: string, signUpData: SignUpData): Promise<void> {
    try {
      // Create basic user profile (onboarding will enhance this)
      await this.createUserProfile(userId, {
        full_name: signUpData.fullName || signUpData.email.split('@')[0],
        username: signUpData.email.split('@')[0],
        avatar_url: null,
        settings: {
          onboardingCompleted: false,
          createdAt: new Date().toISOString()
        }
      });

      // Initialize tokens
      await this.initializeUserTokens(userId);

      // Note: User preferences will be created during onboarding flow
      console.log('New user initialized successfully:', userId);
    } catch (error) {
      console.error('Error initializing new user:', error);
    }
  }

  /**
   * Create user profile
   */
  private async createUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<void> {
    const { error } = await this.client
      .from('profiles')
      .insert({
        id: userId,
        ...profileData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error && error.code !== '23505') { // Ignore duplicate key error
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  /**
   * Initialize user tokens with 4800 free trial tokens
   */
  private async initializeUserTokens(userId: string): Promise<void> {
    // Use the token service for consistency
    const { tokenService } = await import('../tokens/service');
    await tokenService.initializeUserTokens(userId);
  }

  /**
   * Initialize user preferences (used for existing users or fallback)
   */
  private async initializeUserPreferences(userId: string): Promise<void> {
    const defaultPreferences = {
      theme: 'dark',
      accent_color: '#06b6d4',
      enabled_modules: ['tasks', 'habits', 'finance', 'health'],
      module_order: ['tasks', 'habits', 'finance', 'health'],
      dashboard_layout: {},
      ai_personality: 'professional',
      ai_proactivity_level: 3,
      subscription_status: 'trial',
      trial_started: new Date().toISOString(),
      trial_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: 'en',
      notifications: {
        email: true,
        push: true,
        marketing: false
      },
      dashboard: {
        layout: 'default',
        modules: ['tasks', 'habits', 'finance', 'health']
      }
    };

    const { error } = await this.client
      .from('user_preferences')
      .upsert({
        user_id: userId,
        preferences: defaultPreferences,
        created_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error && error.code !== '23505') { // Ignore duplicate key error
      console.error('Error initializing user preferences:', error);
    }
  }

  /**
   * Create standardized auth error
   */
  private createAuthError(error: any): AuthError {
    return {
      code: error.code || 'AUTH_ERROR',
      message: error.message || 'An authentication error occurred',
      details: error
    };
  }
}

// Export singleton instance
export const authService = new AuthenticationService();
export default authService;
