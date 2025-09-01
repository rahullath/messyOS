// src/lib/tokens/service.ts - Token Management Service
import { authClient } from '../auth/config';
import type { 
  TokenBalance, 
  TokenTransaction, 
  TrialStatus, 
  TokenDeductionResult,
  TokenEarningOpportunity,
  UserTokenEarning
} from './types';

class TokenService {
  private client = authClient;

  /**
   * Get user's current token balance
   */
  async getTokenBalance(userId: string): Promise<TokenBalance | null> {
    try {
      const { data, error } = await this.client
        .from('user_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching token balance:', error);
        return null;
      }

      return {
        balance: data.balance,
        total_earned: data.total_earned,
        total_spent: data.total_spent,
        trial_start_date: data.trial_start_date,
        trial_end_date: data.trial_end_date,
        last_transaction_at: data.last_transaction_at,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (error) {
      console.error('Error getting token balance:', error);
      return null;
    }
  }

  /**
   * Get user's transaction history
   */
  async getTransactionHistory(userId: string, limit: number = 50): Promise<TokenTransaction[]> {
    try {
      const { data, error } = await this.client
        .from('token_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching transaction history:', error);
        return [];
      }

      return data.map(transaction => ({
        id: transaction.id,
        user_id: transaction.user_id,
        transaction_type: transaction.transaction_type,
        amount: transaction.amount,
        description: transaction.description,
        balance_before: transaction.balance_before,
        balance_after: transaction.balance_after,
        related_entity_type: transaction.related_entity_type,
        related_entity_id: transaction.related_entity_id,
        metadata: transaction.metadata,
        created_at: transaction.created_at,
        processed_at: transaction.processed_at
      }));
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }

  /**
   * Get trial status for user
   */
  async getTrialStatus(userId: string): Promise<TrialStatus | null> {
    try {
      const balance = await this.getTokenBalance(userId);
      if (!balance || !balance.trial_end_date) {
        return null;
      }

      const expiresAt = new Date(balance.trial_end_date);
      const now = new Date();
      const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      return {
        isActive: daysRemaining > 0 && balance.balance > 0,
        daysRemaining,
        tokensRemaining: balance.balance,
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
  async deductTokens(
    userId: string, 
    amount: number, 
    description: string,
    entityType?: string,
    entityId?: string,
    metadata?: any
  ): Promise<TokenDeductionResult> {
    try {
      // Get current balance
      const balance = await this.getTokenBalance(userId);
      if (!balance) {
        return {
          success: false,
          error: 'User token account not found',
          current_balance: 0
        };
      }

      if (balance.balance < amount) {
        return {
          success: false,
          error: 'Insufficient token balance',
          current_balance: balance.balance,
          required: amount,
          shortfall: amount - balance.balance
        };
      }

      const newBalance = balance.balance - amount;
      const newTotalSpent = balance.total_spent + amount;

      // Update balance
      const { error: updateError } = await this.client
        .from('user_tokens')
        .update({
          balance: newBalance,
          total_spent: newTotalSpent,
          last_transaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating token balance:', updateError);
        return {
          success: false,
          error: 'Failed to deduct tokens',
          current_balance: balance.balance
        };
      }

      // Log transaction
      const { error: transactionError } = await this.client
        .from('token_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'spend',
          amount: -amount,
          description,
          balance_before: balance.balance,
          balance_after: newBalance,
          related_entity_type: entityType,
          related_entity_id: entityId,
          metadata: {
            ...metadata,
            deduction_reason: description
          }
        });

      if (transactionError) {
        console.error('Error logging transaction:', transactionError);
      }

      return {
        success: true,
        tokens_deducted: amount,
        new_balance: newBalance,
        transaction_logged: !transactionError
      };
    } catch (error) {
      console.error('Error deducting tokens:', error);
      return {
        success: false,
        error: 'Internal error during token deduction',
        current_balance: 0
      };
    }
  }

  /**
   * Add tokens to user balance
   */
  async addTokens(
    userId: string,
    amount: number,
    description: string,
    transactionType: 'earn' | 'bonus' | 'purchase' | 'refund' = 'earn',
    entityType?: string,
    entityId?: string,
    metadata?: any
  ): Promise<TokenDeductionResult> {
    try {
      const balance = await this.getTokenBalance(userId);
      if (!balance) {
        return {
          success: false,
          error: 'User token account not found',
          current_balance: 0
        };
      }

      const newBalance = balance.balance + amount;
      const newTotalEarned = balance.total_earned + amount;

      // Update balance
      const { error: updateError } = await this.client
        .from('user_tokens')
        .update({
          balance: newBalance,
          total_earned: newTotalEarned,
          last_transaction_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating token balance:', updateError);
        return {
          success: false,
          error: 'Failed to add tokens',
          current_balance: balance.balance
        };
      }

      // Log transaction
      const { error: transactionError } = await this.client
        .from('token_transactions')
        .insert({
          user_id: userId,
          transaction_type: transactionType,
          amount: amount,
          description,
          balance_before: balance.balance,
          balance_after: newBalance,
          related_entity_type: entityType,
          related_entity_id: entityId,
          metadata: {
            ...metadata,
            earning_reason: description
          }
        });

      if (transactionError) {
        console.error('Error logging transaction:', transactionError);
      }

      return {
        success: true,
        tokens_added: amount,
        new_balance: newBalance,
        transaction_logged: !transactionError
      };
    } catch (error) {
      console.error('Error adding tokens:', error);
      return {
        success: false,
        error: 'Internal error during token addition',
        current_balance: 0
      };
    }
  }

  /**
   * Initialize user tokens with 4800 free trial tokens
   */
  async initializeUserTokens(userId: string): Promise<boolean> {
    try {
      const trialStartDate = new Date();
      const trialEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const { error } = await this.client
        .from('user_tokens')
        .insert({
          user_id: userId,
          balance: 4800,
          total_earned: 4800,
          total_spent: 0,
          trial_start_date: trialStartDate.toISOString(),
          trial_end_date: trialEndDate.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error && error.code !== '23505') { // Ignore duplicate key error
        console.error('Error initializing user tokens:', error);
        return false;
      }

      // Log welcome bonus transaction
      await this.client
        .from('token_transactions')
        .insert({
          user_id: userId,
          transaction_type: 'bonus',
          amount: 4800,
          description: 'Welcome to MessyOS! 30-day free trial with 4800 tokens',
          balance_before: 0,
          balance_after: 4800,
          metadata: {
            bonus_type: 'welcome_trial',
            trial_duration_days: 30
          }
        });

      return true;
    } catch (error) {
      console.error('Error initializing user tokens:', error);
      return false;
    }
  }

  /**
   * Get available earning opportunities
   */
  async getEarningOpportunities(): Promise<TokenEarningOpportunity[]> {
    try {
      const { data, error } = await this.client
        .from('token_earning_opportunities')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching earning opportunities:', error);
        return [];
      }

      return data.map(opportunity => ({
        id: opportunity.id,
        opportunity_type: opportunity.opportunity_type,
        name: opportunity.name,
        description: opportunity.description,
        token_reward: opportunity.token_reward,
        max_claims_per_user: opportunity.max_claims_per_user,
        conditions: opportunity.conditions,
        is_active: opportunity.is_active,
        start_date: opportunity.start_date,
        end_date: opportunity.end_date
      }));
    } catch (error) {
      console.error('Error getting earning opportunities:', error);
      return [];
    }
  }

  /**
   * Get user's earning history
   */
  async getUserEarnings(userId: string): Promise<UserTokenEarning[]> {
    try {
      const { data, error } = await this.client
        .from('user_token_earnings')
        .select(`
          *,
          token_earning_opportunities (
            name,
            description,
            opportunity_type
          )
        `)
        .eq('user_id', userId)
        .order('claimed_at', { ascending: false });

      if (error) {
        console.error('Error fetching user earnings:', error);
        return [];
      }

      return data.map(earning => ({
        id: earning.id,
        user_id: earning.user_id,
        opportunity_id: earning.opportunity_id,
        tokens_earned: earning.tokens_earned,
        claimed_at: earning.claimed_at,
        progress_data: earning.progress_data,
        opportunity: earning.token_earning_opportunities
      }));
    } catch (error) {
      console.error('Error getting user earnings:', error);
      return [];
    }
  }

  /**
   * Format token amount for display
   */
  formatTokenAmount(amount: number): string {
    return new Intl.NumberFormat('en-US').format(amount);
  }

  /**
   * Convert tokens to INR value for display
   */
  tokensToINR(tokens: number): string {
    const inrValue = tokens / 10; // 10 tokens = ₹1
    return `₹${inrValue.toFixed(2)}`;
  }

  /**
   * Get token cost for different AI features
   */
  getTokenCosts() {
    return {
      'ai_chat': 10,
      'ai_insight': 25,
      'ai_analysis': 50,
      'ai_recommendation': 15,
      'ai_summary': 20,
      'ai_action': 30
    };
  }
}

// Export singleton instance
export const tokenService = new TokenService();
export default tokenService;