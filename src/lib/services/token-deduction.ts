// src/lib/services/token-deduction.ts - Auto-deduction service for AI usage
import { authService } from '../auth/supabase-auth';

export interface TokenDeductionConfig {
  aiQuery: number;          // Basic AI query
  documentGeneration: number; // Document generation
  dataAnalysis: number;     // Data analysis
  integration: number;      // Integration operations
  premium: number;          // Premium features
}

// Default token costs (in token units, where 10 tokens = ₹1)
export const DEFAULT_TOKEN_COSTS: TokenDeductionConfig = {
  aiQuery: 10,              // ₹1.00 per query
  documentGeneration: 50,   // ₹5.00 per document
  dataAnalysis: 30,         // ₹3.00 per analysis
  integration: 20,          // ₹2.00 per sync
  premium: 100              // ₹10.00 per premium action
};

class TokenDeductionService {
  private costs = DEFAULT_TOKEN_COSTS;

  /**
   * Deduct tokens for AI query usage
   */
  async deductForAIQuery(userId: string, queryType: string, metadata?: any): Promise<boolean> {
    return await authService.deductTokens(
      userId,
      this.costs.aiQuery,
      `AI Query: ${queryType}`,
      {
        service_type: 'ai_query',
        query_type: queryType,
        cost_per_query: this.costs.aiQuery,
        ...metadata
      }
    );
  }

  /**
   * Deduct tokens for document generation
   */
  async deductForDocumentGeneration(userId: string, documentType: string, metadata?: any): Promise<boolean> {
    return await authService.deductTokens(
      userId,
      this.costs.documentGeneration,
      `Document Generation: ${documentType}`,
      {
        service_type: 'document_generation',
        document_type: documentType,
        cost_per_document: this.costs.documentGeneration,
        ...metadata
      }
    );
  }

  /**
   * Deduct tokens for data analysis
   */
  async deductForDataAnalysis(userId: string, analysisType: string, metadata?: any): Promise<boolean> {
    return await authService.deductTokens(
      userId,
      this.costs.dataAnalysis,
      `Data Analysis: ${analysisType}`,
      {
        service_type: 'data_analysis',
        analysis_type: analysisType,
        cost_per_analysis: this.costs.dataAnalysis,
        ...metadata
      }
    );
  }

  /**
   * Deduct tokens for integration operations
   */
  async deductForIntegration(userId: string, integrationType: string, metadata?: any): Promise<boolean> {
    return await authService.deductTokens(
      userId,
      this.costs.integration,
      `Integration: ${integrationType}`,
      {
        service_type: 'integration',
        integration_type: integrationType,
        cost_per_integration: this.costs.integration,
        ...metadata
      }
    );
  }

  /**
   * Deduct tokens for premium features
   */
  async deductForPremiumFeature(userId: string, featureName: string, metadata?: any): Promise<boolean> {
    return await authService.deductTokens(
      userId,
      this.costs.premium,
      `Premium Feature: ${featureName}`,
      {
        service_type: 'premium_feature',
        feature_name: featureName,
        cost_per_feature: this.costs.premium,
        ...metadata
      }
    );
  }

  /**
   * Check if user has sufficient balance for a service
   */
  async canAffordService(userId: string, serviceType: keyof TokenDeductionConfig): Promise<boolean> {
    const balance = await authService.getUserTokenBalance(userId);
    if (!balance) return false;

    const requiredTokens = this.costs[serviceType];
    return balance.balance >= requiredTokens;
  }

  /**
   * Get service costs
   */
  getServiceCosts(): TokenDeductionConfig {
    return { ...this.costs };
  }

  /**
   * Format cost for display
   */
  formatCost(tokens: number): string {
    return `₹${(tokens / 10).toFixed(2)}`;
  }

  /**
   * Bulk deduction for multiple services
   */
  async deductForMultipleServices(
    userId: string, 
    services: Array<{ type: keyof TokenDeductionConfig; description: string; metadata?: any }>
  ): Promise<boolean> {
    const totalCost = services.reduce((sum, service) => sum + this.costs[service.type], 0);
    const balance = await authService.getUserTokenBalance(userId);
    
    if (!balance || balance.balance < totalCost) {
      return false;
    }

    // Deduct tokens for combined services
    const description = `Multiple Services: ${services.map(s => s.description).join(', ')}`;
    return await authService.deductTokens(
      userId,
      totalCost,
      description,
      {
        service_type: 'bulk_services',
        services: services.map(s => ({
          type: s.type,
          cost: this.costs[s.type],
          description: s.description,
          metadata: s.metadata
        })),
        total_cost: totalCost
      }
    );
  }

  /**
   * Award tokens for user actions (earning mechanism)
   */
  async awardTokensForAction(
    userId: string, 
    action: string, 
    amount: number, 
    metadata?: any
  ): Promise<boolean> {
    return await authService.addTokens(
      userId,
      amount,
      `Reward: ${action}`,
      {
        reward_type: 'user_action',
        action,
        reward_amount: amount,
        ...metadata
      }
    );
  }

  /**
   * Daily login bonus
   */
  async awardDailyBonus(userId: string): Promise<boolean> {
    // Check if user already got bonus today
    const today = new Date().toDateString();
    const { data } = await authService['supabase']
      .from('token_transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('transaction_type', 'credit')
      .gte('created_at', new Date(today).toISOString())
      .like('description', '%Daily Login%')
      .limit(1);

    if (data && data.length > 0) {
      return false; // Already awarded today
    }

    return await this.awardTokensForAction(userId, 'Daily Login', 100, {
      bonus_type: 'daily_login',
      date: today
    });
  }

  /**
   * Integration connection bonus
   */
  async awardIntegrationBonus(userId: string, integrationType: string): Promise<boolean> {
    return await this.awardTokensForAction(
      userId, 
      `Connected ${integrationType}`, 
      500, // ₹50 bonus for connecting integrations
      {
        bonus_type: 'integration_connection',
        integration_type: integrationType
      }
    );
  }

  /**
   * Get user's spending analytics
   */
  async getUserSpendingAnalytics(userId: string, days: number = 30): Promise<{
    totalSpent: number;
    serviceBreakdown: Record<string, number>;
    averageDaily: number;
    topServices: Array<{ service: string; amount: number }>;
  }> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data } = await authService['supabase']
        .from('token_transactions')
        .select('amount, metadata, created_at')
        .eq('user_id', userId)
        .eq('transaction_type', 'deduction')
        .gte('created_at', since.toISOString());

      if (!data) {
        return {
          totalSpent: 0,
          serviceBreakdown: {},
          averageDaily: 0,
          topServices: []
        };
      }

      const totalSpent = data.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      const serviceBreakdown: Record<string, number> = {};

      data.forEach(tx => {
        const service = tx.metadata?.service_type || 'other';
        serviceBreakdown[service] = (serviceBreakdown[service] || 0) + Math.abs(tx.amount);
      });

      const topServices = Object.entries(serviceBreakdown)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([service, amount]) => ({ service, amount }));

      return {
        totalSpent,
        serviceBreakdown,
        averageDaily: totalSpent / days,
        topServices
      };
    } catch (error) {
      console.error('Error getting spending analytics:', error);
      return {
        totalSpent: 0,
        serviceBreakdown: {},
        averageDaily: 0,
        topServices: []
      };
    }
  }
}

export const tokenDeductionService = new TokenDeductionService();
export default tokenDeductionService;