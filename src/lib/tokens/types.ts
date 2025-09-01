// src/lib/tokens/types.ts - Token System Types

export interface TokenBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
  trial_start_date?: string | null;
  trial_end_date?: string | null;
  last_transaction_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TokenTransaction {
  id: string;
  user_id: string;
  transaction_type: 'earn' | 'spend' | 'refund' | 'bonus' | 'purchase';
  amount: number;
  description: string;
  balance_before: number;
  balance_after: number;
  related_entity_type?: string | null;
  related_entity_id?: string | null;
  metadata?: any;
  created_at: string;
  processed_at?: string | null;
}

export interface TrialStatus {
  isActive: boolean;
  daysRemaining: number;
  tokensRemaining: number;
  expiresAt: Date;
}

export interface TokenDeductionResult {
  success: boolean;
  tokens_deducted?: number;
  tokens_added?: number;
  new_balance?: number;
  current_balance: number;
  required?: number;
  shortfall?: number;
  error?: string;
  transaction_logged?: boolean;
}

export interface TokenEarningOpportunity {
  id: string;
  opportunity_type: string;
  name: string;
  description?: string | null;
  token_reward: number;
  max_claims_per_user?: number | null;
  conditions?: any;
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
}

export interface UserTokenEarning {
  id: string;
  user_id: string;
  opportunity_id: string;
  tokens_earned: number;
  claimed_at: string;
  progress_data?: any;
  opportunity?: {
    name: string;
    description?: string | null;
    opportunity_type: string;
  };
}

export interface WalletState {
  balance: number;
  isLoading: boolean;
  error: string | null;
  transactions: TokenTransaction[];
  trialStatus: TrialStatus | null;
}

export interface TokenCosts {
  ai_chat: number;
  ai_insight: number;
  ai_analysis: number;
  ai_recommendation: number;
  ai_summary: number;
  ai_action: number;
}

export type AIFeature = keyof TokenCosts;

export interface TokenUsageMetrics {
  daily_usage: number;
  weekly_usage: number;
  monthly_usage: number;
  most_used_feature: AIFeature | null;
  average_daily_spend: number;
}