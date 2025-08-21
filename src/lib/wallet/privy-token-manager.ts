// src/lib/wallet/privy-token-manager.ts - Privy Token Management
// Updated token system to work with Privy authentication

import { createSupabaseClient } from '../supabase/client';

export interface TokenBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
  last_transaction_at?: string;
}

export interface TokenTransaction {
  id: string;
  type: 'earn' | 'spend' | 'purchase' | 'bonus' | 'refund';
  amount: number;
  description: string;
  balance_before: number;
  balance_after: number;
  created_at: string;
  metadata?: any;
}

class PrivyTokenManager {
  private supabase = createSupabaseClient();

  /**
   * Get user's token balance by Privy ID
   */
  async getTokenBalance(privyUserId: string): Promise<TokenBalance | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_tokens')
        .select('balance, total_earned, total_spent, last_transaction_at')
        .eq('privy_user_id', privyUserId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting token balance:', error);
      return null;
    }
  }

  /**
   * Deduct tokens for AI usage or premium features
   */
  async deductTokens(
    privyUserId: string,
    amount: number,
    description: string,
    entityType?: string,
    entityId?: string,
    metadata?: any
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
      // Use the database function for atomic token deduction
      const { data, error } = await this.supabase
        .rpc('deduct_tokens_privy', {
          p_privy_user_id: privyUserId,
          p_amount: amount,
          p_description: description,
          p_entity_type: entityType,
          p_entity_id: entityId,
          p_metadata: metadata || {}
        });

      if (error) throw error;

      if (data) {
        // Get updated balance
        const balance = await this.getTokenBalance(privyUserId);
        return {
          success: true,
          newBalance: balance?.balance
        };
      } else {
        return {
          success: false,
          error: 'Insufficient token balance'
        };
      }
    } catch (error) {
      console.error('Error deducting tokens:', error);
      return {
        success: false,
        error: 'Failed to deduct tokens'
      };
    }
  }

  /**
   * Add tokens (for purchases, bonuses, achievements)
   */
  async addTokens(
    privyUserId: string,
    amount: number,
    description: string,
    transactionType: 'earn' | 'purchase' | 'bonus' | 'refund' = 'earn',
    entityType?: string,
    entityId?: string,
    metadata?: any
  ): Promise<{ success: boolean; newBalance?: number; error?: string }> {
    try {
      // Use the database function for atomic token addition
      const { data, error } = await this.supabase
        .rpc('add_tokens_privy', {
          p_privy_user_id: privyUserId,
          p_amount: amount,
          p_description: description,
          p_transaction_type: transactionType,
          p_entity_type: entityType,
          p_entity_id: entityId,
          p_metadata: metadata || {}
        });

      if (error) throw error;

      // Get updated balance
      const balance = await this.getTokenBalance(privyUserId);
      return {
        success: true,
        newBalance: balance?.balance
      };
    } catch (error) {
      console.error('Error adding tokens:', error);
      return {
        success: false,
        error: 'Failed to add tokens'
      };
    }
  }

  /**
   * Get transaction history for user
   */
  async getTransactionHistory(
    privyUserId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<TokenTransaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('token_transactions')
        .select(`
          id,
          transaction_type,
          amount,
          description,
          balance_before,
          balance_after,
          created_at,
          metadata
        `)
        .eq('privy_user_id', privyUserId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return data.map(tx => ({
        id: tx.id,
        type: tx.transaction_type,
        amount: tx.amount,
        description: tx.description,
        balance_before: tx.balance_before,
        balance_after: tx.balance_after,
        created_at: tx.created_at,
        metadata: tx.metadata
      }));
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return [];
    }
  }

  /**
   * Check if user has sufficient balance for operation
   */
  async hasInsufficientBalance(privyUserId: string, requiredAmount: number): Promise<boolean> {
    const balance = await this.getTokenBalance(privyUserId);
    return !balance || balance.balance < requiredAmount;
  }

  /**
   * Get token earning opportunities for user
   */
  async getEarningOpportunities(privyUserId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('token_earning_opportunities')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString())
        .order('display_order');

      if (error) throw error;

      // Filter opportunities user hasn't maxed out
      const opportunities = [];
      for (const opp of data || []) {
        if (opp.max_claims_per_user) {
          const { count } = await this.supabase
            .from('user_token_earnings')
            .select('*', { count: 'exact' })
            .eq('privy_user_id', privyUserId)
            .eq('opportunity_id', opp.id);

          if (count && count >= opp.max_claims_per_user) {
            continue; // User has maxed out this opportunity
          }
        }
        opportunities.push(opp);
      }

      return opportunities;
    } catch (error) {
      console.error('Error fetching earning opportunities:', error);
      return [];
    }
  }

  /**
   * Claim earning opportunity
   */
  async claimEarningOpportunity(
    privyUserId: string,
    opportunityId: string,
    progressData?: any
  ): Promise<{ success: boolean; tokensEarned?: number; error?: string }> {
    try {
      // Get opportunity details
      const { data: opportunity, error: oppError } = await this.supabase
        .from('token_earning_opportunities')
        .select('*')
        .eq('id', opportunityId)
        .single();

      if (oppError || !opportunity) {
        return { success: false, error: 'Opportunity not found' };
      }

      // Check if user can claim (not maxed out)
      if (opportunity.max_claims_per_user) {
        const { count } = await this.supabase
          .from('user_token_earnings')
          .select('*', { count: 'exact' })
          .eq('privy_user_id', privyUserId)
          .eq('opportunity_id', opportunityId);

        if (count && count >= opportunity.max_claims_per_user) {
          return { success: false, error: 'Maximum claims reached' };
        }
      }

      // Record the earning
      const { error: earnError } = await this.supabase
        .from('user_token_earnings')
        .insert({
          privy_user_id: privyUserId,
          opportunity_id: opportunityId,
          tokens_earned: opportunity.token_reward,
          progress_data: progressData || {}
        });

      if (earnError) throw earnError;

      // Add tokens to user balance
      const result = await this.addTokens(
        privyUserId,
        opportunity.token_reward,
        opportunity.description,
        'earn',
        'earning_opportunity',
        opportunityId,
        {
          opportunity_type: opportunity.opportunity_type,
          progress_data: progressData
        }
      );

      return {
        success: result.success,
        tokensEarned: opportunity.token_reward,
        error: result.error
      };
    } catch (error) {
      console.error('Error claiming earning opportunity:', error);
      return { success: false, error: 'Failed to claim opportunity' };
    }
  }

  /**
   * Initialize tokens for new Privy user
   */
  async initializeNewUser(privyUserId: string, walletAddress?: string): Promise<boolean> {
    try {
      // Check if user already has tokens
      const existing = await this.getTokenBalance(privyUserId);
      if (existing) {
        return true; // User already initialized
      }

      // Create initial token balance
      const { error } = await this.supabase
        .from('user_tokens')
        .insert({
          privy_user_id: privyUserId,
          balance: 5000, // ₹500 starting credit
          total_earned: 5000,
          total_spent: 0,
          privy_wallet_address: walletAddress,
          wallet_type: 'privy'
        });

      if (error) throw error;

      // Log welcome bonus transaction
      await this.supabase
        .from('token_transactions')
        .insert({
          privy_user_id: privyUserId,
          transaction_type: 'bonus',
          amount: 5000,
          description: 'Welcome to meshOS! ₹500 starting credit',
          balance_before: 0,
          balance_after: 5000,
          metadata: {
            bonus_type: 'welcome',
            amount_inr: 500,
            privy_user_id: privyUserId
          }
        });

      return true;
    } catch (error) {
      console.error('Error initializing new user tokens:', error);
      return false;
    }
  }

  /**
   * Calculate token cost for AI usage
   */
  calculateAIUsageCost(
    messageCount: number,
    responseTokens: number,
    actionsExecuted: number
  ): number {
    // Base cost: 10 tokens per message
    let cost = messageCount * 10;
    
    // Token-based cost: 1 token per 100 response tokens
    cost += Math.ceil(responseTokens / 100);
    
    // Action cost: 5 tokens per autonomous action
    cost += actionsExecuted * 5;
    
    return Math.max(cost, 5); // Minimum 5 tokens per interaction
  }

  /**
   * Create AI usage session for batch deduction
   */
  async createAISession(privyUserId: string, sessionType: string = 'chat'): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('ai_usage_sessions')
        .insert({
          privy_user_id: privyUserId,
          session_type: sessionType,
          session_start: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating AI session:', error);
      return null;
    }
  }

  /**
   * Update AI session with usage metrics
   */
  async updateAISession(
    sessionId: string,
    metrics: {
      message_count?: number;
      response_tokens?: number;
      actions_executed?: number;
    }
  ): Promise<boolean> {
    try {
      const tokenCost = this.calculateAIUsageCost(
        metrics.message_count || 0,
        metrics.response_tokens || 0,
        metrics.actions_executed || 0
      );

      const { error } = await this.supabase
        .from('ai_usage_sessions')
        .update({
          message_count: metrics.message_count,
          response_tokens: metrics.response_tokens,
          actions_executed: metrics.actions_executed,
          total_token_cost: tokenCost,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating AI session:', error);
      return false;
    }
  }

  /**
   * End AI session and deduct tokens
   */
  async endAISession(sessionId: string, privyUserId: string): Promise<boolean> {
    try {
      // Get session details
      const { data: session, error: sessionError } = await this.supabase
        .from('ai_usage_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session || session.deducted) {
        return false; // Session not found or already deducted
      }

      // Deduct tokens if cost > 0
      if (session.total_token_cost > 0) {
        const result = await this.deductTokens(
          privyUserId,
          session.total_token_cost,
          `AI chat session - ${session.message_count} messages, ${session.actions_executed} actions`,
          'ai_session',
          sessionId,
          {
            session_type: session.session_type,
            message_count: session.message_count,
            response_tokens: session.response_tokens,
            actions_executed: session.actions_executed
          }
        );

        if (!result.success) {
          console.warn('Failed to deduct tokens for session:', sessionId);
          return false;
        }
      }

      // Mark session as deducted and ended
      await this.supabase
        .from('ai_usage_sessions')
        .update({
          session_end: new Date().toISOString(),
          deducted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      return true;
    } catch (error) {
      console.error('Error ending AI session:', error);
      return false;
    }
  }
}

// Export singleton instance
export const privyTokenManager = new PrivyTokenManager();

// Helper functions for common operations
export const getUserTokenBalance = (privyUserId: string) => 
  privyTokenManager.getTokenBalance(privyUserId);

export const deductTokensForAI = (privyUserId: string, amount: number, description: string) =>
  privyTokenManager.deductTokens(privyUserId, amount, description, 'ai_usage');

export const addWelcomeBonus = (privyUserId: string, walletAddress?: string) =>
  privyTokenManager.initializeNewUser(privyUserId, walletAddress);

export const checkInsufficientBalance = (privyUserId: string, requiredAmount: number) =>
  privyTokenManager.hasInsufficientBalance(privyUserId, requiredAmount);

export default privyTokenManager;