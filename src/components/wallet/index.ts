// src/components/wallet/index.ts - Wallet Components Export
export { Wallet } from './Wallet';
export { WalletBalance, CompactWalletBalance } from './WalletBalance';
export { TransactionHistory } from './TransactionHistory';
export { TrialStatus, CompactTrialStatus } from './TrialStatus';
export { TokenCosts, QuickTokenCosts } from './TokenCosts';

// Re-export token service and hooks for convenience
export { tokenService } from '../../lib/tokens/service';
export { useTokenWallet, useTokenBalance, useTrialStatus } from '../../lib/tokens/hooks';

// Re-export types
export type {
  TokenBalance,
  TokenTransaction,
  TrialStatus as TrialStatusType,
  TokenDeductionResult,
  WalletState,
  TokenCosts as TokenCostsType,
  AIFeature
} from '../../lib/tokens/types';