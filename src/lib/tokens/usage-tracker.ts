// src/lib/tokens/usage-tracker.ts - Token Usage Tracking and Batch Deduction
// Handles AI session tracking and batch token deduction logic

import { createServerAuth } from '../auth/simple-multi-user';
import { createSupabaseClient } from '../supabase/client';

export interface AISessionMetrics {
  sessionId: string;
  messageCount: number;
  responseTokens: number;
  actionsExecuted: number;
  sessionDuration: number; // in seconds
  sessionType: 'chat' | 'briefing' | 'optimization' | 'analysis';
}

export interface TokenUsageCalculation {
  baseMessageCost: number;
  responseTokenCost: number;
  actionExecutionCost: number;
  totalCost: number;
  breakdown: {
    messages: { count: number; costPerMessage: number; total: number };
    tokens: { count: number; costPer100Tokens: number; total: number };
    actions: { count: number; costPerAction: number; total: number };
  };
}

class TokenUsageTracker {
  private supabase = createSupabaseClient();
  private activeSessions: Map<string, string> = new Map(); // userId -> sessionId
  
  // Token pricing configuration
  private readonly PRICING = {
    BASE_MESSAGE_COST: 10, // 10 tokens per message
    TOKENS_PER_100_RESPONSE: 1, // 1 token per 100 response tokens
    ACTION_EXECUTION_COST: 5, // 5 tokens per autonomous action
    MINIMUM_SESSION_COST: 5, // Minimum 5 tokens per session
    PREMIUM_FEATURE_MULTIPLIER: 2, // 2x cost for premium features
  };

  /**
   * Start tracking AI session for user
   */
  async startAISession(
    userId: string, 
    sessionType: 'chat' | 'briefing' | 'optimization' | 'analysis' = 'chat'
  ): Promise<string | null> {
    try {
      // End any existing active session first
      const existingSessionId = this.activeSessions.get(userId);
      if (existingSessionId) {
        await this.endAISession(userId, existingSessionId);
      }

      // Create new session
      const sessionId = await authService.createAISession(userId, sessionType);
      if (sessionId) {
        this.activeSessions.set(userId, sessionId);
        console.log(`Started AI session ${sessionId} for user ${userId}`);
      }
      
      return sessionId;
    } catch (error) {
      console.error('Error starting AI session:', error);
      return null;
    }
  }

  /**
   * Track message exchange in current session
   */
  async trackMessage(
    userId: string,
    responseTokens: number,
    actionsExecuted: number = 0
  ): Promise<boolean> {
    try {
      const sessionId = this.activeSessions.get(userId);
      if (!sessionId) {
        console.warn('No active session for user', userId);
        return false;
      }

      // Get current session metrics
      const { data: session, error } = await this.supabase
        .from('ai_usage_sessions')
        .select('message_count, response_tokens, actions_executed')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      // Update session with new metrics
      const updatedMetrics = {
        message_count: (session.message_count || 0) + 1,
        response_tokens: (session.response_tokens || 0) + responseTokens,
        actions_executed: (session.actions_executed || 0) + actionsExecuted
      };

      const success = await authService.updateAISession(sessionId, updatedMetrics);
      
      if (success) {
        console.log(`Updated session ${sessionId}: +1 message, +${responseTokens} tokens, +${actionsExecuted} actions`);
      }
      
      return success;
    } catch (error) {
      console.error('Error tracking message:', error);
      return false;
    }
  }

  /**
   * End AI session and perform batch token deduction
   */
  async endAISession(userId: string, sessionId?: string): Promise<boolean> {
    try {
      const targetSessionId = sessionId || this.activeSessions.get(userId);
      if (!targetSessionId) {
        console.warn('No session to end for user', userId);
        return false;
      }

      // Perform batch deduction
      const success = await authService.endAISession(targetSessionId, userId);
      
      if (success) {
        this.activeSessions.delete(userId);
        console.log(`Ended AI session ${targetSessionId} and deducted tokens`);
      }
      
      return success;
    } catch (error) {
      console.error('Error ending AI session:', error);
      return false;
    }
  }

  /**
   * Calculate token cost for AI usage
   */
  calculateTokenCost(
    messageCount: number,
    responseTokens: number,
    actionsExecuted: number,
    isPremiumFeature: boolean = false
  ): TokenUsageCalculation {
    // Base costs
    const baseMessageCost = messageCount * this.PRICING.BASE_MESSAGE_COST;
    const responseTokenCost = Math.ceil(responseTokens / 100) * this.PRICING.TOKENS_PER_100_RESPONSE;
    const actionExecutionCost = actionsExecuted * this.PRICING.ACTION_EXECUTION_COST;
    
    // Calculate total before multipliers
    let totalCost = baseMessageCost + responseTokenCost + actionExecutionCost;
    
    // Apply premium feature multiplier
    if (isPremiumFeature) {
      totalCost *= this.PRICING.PREMIUM_FEATURE_MULTIPLIER;
    }
    
    // Ensure minimum cost
    totalCost = Math.max(totalCost, this.PRICING.MINIMUM_SESSION_COST);

    return {
      baseMessageCost,
      responseTokenCost,
      actionExecutionCost,
      totalCost,
      breakdown: {
        messages: {
          count: messageCount,
          costPerMessage: this.PRICING.BASE_MESSAGE_COST,
          total: baseMessageCost
        },
        tokens: {
          count: responseTokens,
          costPer100Tokens: this.PRICING.TOKENS_PER_100_RESPONSE,
          total: responseTokenCost
        },
        actions: {
          count: actionsExecuted,
          costPerAction: this.PRICING.ACTION_EXECUTION_COST,
          total: actionExecutionCost
        }
      }
    };
  }

  /**
   * Get current session metrics for user
   */
  async getCurrentSessionMetrics(userId: string): Promise<AISessionMetrics | null> {
    try {
      const sessionId = this.activeSessions.get(userId);
      if (!sessionId) return null;

      const { data: session, error } = await this.supabase
        .from('ai_usage_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      const sessionStart = new Date(session.session_start);
      const sessionDuration = Math.floor((Date.now() - sessionStart.getTime()) / 1000);

      return {
        sessionId,
        messageCount: session.message_count || 0,
        responseTokens: session.response_tokens || 0,
        actionsExecuted: session.actions_executed || 0,
        sessionDuration,
        sessionType: session.session_type
      };
    } catch (error) {
      console.error('Error getting session metrics:', error);
      return null;
    }
  }

  /**
   * Check if user has sufficient balance for estimated session cost
   */
  async checkSufficientBalance(
    userId: string,
    estimatedMessages: number = 5,
    estimatedTokens: number = 1000,
    estimatedActions: number = 2
  ): Promise<{ sufficient: boolean; currentBalance: number; estimatedCost: number }> {
    try {
      const balance = await authService.getUserTokenBalance(userId);
      if (!balance) {
        return { sufficient: false, currentBalance: 0, estimatedCost: 0 };
      }

      const costCalculation = this.calculateTokenCost(
        estimatedMessages,
        estimatedTokens,
        estimatedActions
      );

      return {
        sufficient: balance.balance >= costCalculation.totalCost,
        currentBalance: balance.balance,
        estimatedCost: costCalculation.totalCost
      };
    } catch (error) {
      console.error('Error checking balance:', error);
      return { sufficient: false, currentBalance: 0, estimatedCost: 0 };
    }
  }

  /**
   * Get user's recent AI usage statistics
   */
  async getUserUsageStats(
    userId: string,
    days: number = 7
  ): Promise<{
    totalSessions: number;
    totalMessages: number;
    totalTokensSpent: number;
    totalActionsExecuted: number;
    averageCostPerSession: number;
    dailyUsage: Array<{ date: string; sessions: number; cost: number }>;
  }> {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      // Get session data
      const { data: sessions, error: sessionsError } = await this.supabase
        .from('ai_usage_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', dateFrom.toISOString())
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Get token transaction data
      const { data: transactions, error: transactionsError } = await this.supabase
        .from('token_transactions')
        .select('amount, created_at')
        .eq('user_id', userId)
        .eq('transaction_type', 'spend')
        .eq('related_entity_type', 'ai_session')
        .gte('created_at', dateFrom.toISOString());

      if (transactionsError) throw transactionsError;

      // Calculate statistics
      const totalSessions = sessions?.length || 0;
      const totalMessages = sessions?.reduce((sum, s) => sum + (s.message_count || 0), 0) || 0;
      const totalActionsExecuted = sessions?.reduce((sum, s) => sum + (s.actions_executed || 0), 0) || 0;
      const totalTokensSpent = Math.abs(transactions?.reduce((sum, t) => sum + t.amount, 0) || 0);
      const averageCostPerSession = totalSessions > 0 ? totalTokensSpent / totalSessions : 0;

      // Calculate daily usage
      const dailyUsage: Array<{ date: string; sessions: number; cost: number }> = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const daySessions = sessions?.filter(s => 
          s.created_at.startsWith(dateStr)
        ).length || 0;

        const dayCost = Math.abs(transactions?.filter(t => 
          t.created_at.startsWith(dateStr)
        ).reduce((sum, t) => sum + t.amount, 0) || 0);

        dailyUsage.push({ date: dateStr, sessions: daySessions, cost: dayCost });
      }

      return {
        totalSessions,
        totalMessages,
        totalTokensSpent,
        totalActionsExecuted,
        averageCostPerSession,
        dailyUsage: dailyUsage.reverse()
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return {
        totalSessions: 0,
        totalMessages: 0,
        totalTokensSpent: 0,
        totalActionsExecuted: 0,
        averageCostPerSession: 0,
        dailyUsage: []
      };
    }
  }

  /**
   * Clean up stale sessions (longer than 1 hour without activity)
   */
  async cleanupStaleSessions(): Promise<number> {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      // Get stale sessions
      const { data: staleSessions, error } = await this.supabase
        .from('ai_usage_sessions')
        .select('id, user_id')
        .eq('deducted', false)
        .lt('updated_at', oneHourAgo.toISOString());

      if (error) throw error;

      let cleanedCount = 0;
      for (const session of staleSessions || []) {
        const success = await authService.endAISession(session.id, session.user_id);
        if (success) {
          this.activeSessions.delete(session.user_id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} stale AI sessions`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up stale sessions:', error);
      return 0;
    }
  }

  /**
   * Get active session for user
   */
  getActiveSessionId(userId: string): string | undefined {
    return this.activeSessions.get(userId);
  }

  /**
   * Force end all sessions (for testing or admin purposes)
   */
  async forceEndAllSessions(): Promise<number> {
    let endedCount = 0;
    for (const [userId, sessionId] of this.activeSessions.entries()) {
      const success = await this.endAISession(userId, sessionId);
      if (success) endedCount++;
    }
    return endedCount;
  }
}

// Export singleton instance
export const tokenUsageTracker = new TokenUsageTracker();

// Convenience functions for common operations
export const startChatSession = (userId: string) =>
  tokenUsageTracker.startAISession(userId, 'chat');

export const trackChatMessage = (userId: string, responseTokens: number, actions: number) =>
  tokenUsageTracker.trackMessage(userId, responseTokens, actions);

export const endChatSession = (userId: string) =>
  tokenUsageTracker.endAISession(userId);

export const checkUserBalance = (userId: string) =>
  tokenUsageTracker.checkSufficientBalance(userId);

export const getUserStats = (userId: string, days?: number) =>
  tokenUsageTracker.getUserUsageStats(userId, days);

// Automatic cleanup interval (run every 30 minutes)
if (typeof window === 'undefined') { // Server-side only
  setInterval(() => {
    tokenUsageTracker.cleanupStaleSessions();
  }, 30 * 60 * 1000);
}

export default tokenUsageTracker;