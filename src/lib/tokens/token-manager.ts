// src/lib/tokens/token-manager.ts - Client-side Token Management
// Utilities for deducting tokens and checking balance

export interface TokenDeductionResult {
  success: boolean;
  tokens_deducted?: number;
  new_balance?: number;
  error?: string;
  shortfall?: number;
}

export interface TokenBalance {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  isNewUser?: boolean;
  isExpired?: boolean;
  daysRemaining?: number;
}

// AI feature types and their token costs
export const AI_FEATURES = {
  'ai_chat': { cost: 10, name: 'AI Chat Message' },
  'ai_insight': { cost: 25, name: 'AI Insight Generation' },
  'ai_analysis': { cost: 50, name: 'Complex AI Analysis' },
  'ai_recommendation': { cost: 15, name: 'AI Recommendation' },
  'ai_summary': { cost: 20, name: 'AI Summary Generation' },
  'ai_action': { cost: 30, name: 'AI Action Execution' },
} as const;

export type AIFeatureType = keyof typeof AI_FEATURES;

/**
 * Deduct tokens for AI feature usage
 */
export async function deductTokens(
  feature: AIFeatureType,
  description?: string,
  metadata?: Record<string, any>
): Promise<TokenDeductionResult> {
  try {
    const response = await fetch('/api/tokens/deduct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feature,
        description: description || AI_FEATURES[feature].name,
        metadata
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to deduct tokens',
        shortfall: result.shortfall
      };
    }

    return {
      success: true,
      tokens_deducted: result.tokens_deducted,
      new_balance: result.new_balance
    };

  } catch (error) {
    console.error('Token deduction error:', error);
    return {
      success: false,
      error: 'Network error while deducting tokens'
    };
  }
}

/**
 * Get current token balance
 */
export async function getTokenBalance(): Promise<TokenBalance | null> {
  try {
    const response = await fetch('/api/user/balance');
    const result = await response.json();
    
    if (!response.ok) {
      console.error('Failed to fetch token balance:', result.error);
      return null;
    }

    return result.tokens;
  } catch (error) {
    console.error('Token balance fetch error:', error);
    return null;
  }
}

/**
 * Check if user has sufficient tokens for a feature
 */
export async function checkSufficientTokens(feature: AIFeatureType): Promise<boolean> {
  const balance = await getTokenBalance();
  if (!balance) return false;
  
  return balance.balance >= AI_FEATURES[feature].cost;
}

/**
 * Get token cost for a feature
 */
export function getTokenCost(feature: AIFeatureType): number {
  return AI_FEATURES[feature].cost;
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(tokens: number): string {
  return tokens.toLocaleString();
}

/**
 * Convert tokens to INR
 */
export function tokensToINR(tokens: number): string {
  return (tokens / 10).toFixed(2);
}

/**
 * Pre-flight check before using AI features
 * Returns true if tokens were deducted successfully, false otherwise
 */
export async function useAIFeature(
  feature: AIFeatureType,
  description?: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; message: string; newBalance?: number }> {
  
  // Check balance first
  const hasSufficientTokens = await checkSufficientTokens(feature);
  
  if (!hasSufficientTokens) {
    const balance = await getTokenBalance();
    const required = AI_FEATURES[feature].cost;
    const shortfall = balance ? required - balance.balance : required;
    
    return {
      success: false,
      message: `Insufficient tokens. You need ${formatTokenAmount(required)} tokens but have ${balance ? formatTokenAmount(balance.balance) : '0'}. Please top up ${formatTokenAmount(shortfall)} tokens to continue.`
    };
  }

  // Deduct tokens
  const result = await deductTokens(feature, description, metadata);
  
  if (!result.success) {
    return {
      success: false,
      message: result.error || 'Failed to process token payment'
    };
  }

  return {
    success: true,
    message: `${AI_FEATURES[feature].name} activated. ${formatTokenAmount(result.tokens_deducted!)} tokens deducted.`,
    newBalance: result.new_balance
  };
}

/**
 * Middleware function to wrap AI functions with token deduction
 */
export function withTokenDeduction<T extends any[], R>(
  feature: AIFeatureType,
  aiFunction: (...args: T) => Promise<R>,
  description?: string
) {
  return async (...args: T): Promise<R | { error: string; tokenError: true }> => {
    const tokenCheck = await useAIFeature(feature, description);
    
    if (!tokenCheck.success) {
      return {
        error: tokenCheck.message,
        tokenError: true
      } as any;
    }

    try {
      const result = await aiFunction(...args);
      console.log(`✅ ${AI_FEATURES[feature].name} completed. New balance: ${tokenCheck.newBalance}`);
      return result;
    } catch (error) {
      // If AI function fails, we could implement token refund here
      console.error(`❌ ${AI_FEATURES[feature].name} failed after token deduction:`, error);
      throw error;
    }
  };
}