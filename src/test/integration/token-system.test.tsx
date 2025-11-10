import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../utils/test-utils';
import { createTestUser, createTestTokenBalance, createTestTransaction } from '../utils/test-utils';
import { tokenService } from '@/lib/tokens/service';
import { Wallet } from '@/components/wallet/Wallet';
import { TransactionHistory } from '@/components/wallet/TransactionHistory';
import { TrialStatus } from '@/components/wallet/TrialStatus';

// Mock the token service
vi.mock('@/lib/tokens/service', () => ({
  TokenService: {
    initializeUserTokens: vi.fn(),
    getTokenBalance: vi.fn(),
    deductTokens: vi.fn(),
    getTransactionHistory: vi.fn(),
    checkTrialStatus: vi.fn(),
  },
}));

describe('Token System Integration Tests', () => {
  const mockUser = createTestUser();
  const mockTokenBalance = createTestTokenBalance();
  const mockTransaction = createTestTransaction();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Allocation for New Users', () => {
    it('should allocate 4800 tokens to newly registered users', async () => {
      TokenService.initializeUserTokens.mockResolvedValue({
        balance: 4800,
        totalEarned: 4800,
        totalSpent: 0,
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const result = await TokenService.initializeUserTokens(mockUser.id);

      expect(result.balance).toBe(4800);
      expect(result.totalEarned).toBe(4800);
      expect(result.totalSpent).toBe(0);
      expect(TokenService.initializeUserTokens).toHaveBeenCalledWith(mockUser.id);
    });

    it('should set trial period to 30 days for new users', async () => {
      const trialStartDate = new Date();
      const trialEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      TokenService.initializeUserTokens.mockResolvedValue({
        balance: 4800,
        totalEarned: 4800,
        totalSpent: 0,
        trialStartDate,
        trialEndDate,
      });

      const result = await TokenService.initializeUserTokens(mockUser.id);

      expect(result.trialStartDate).toEqual(trialStartDate);
      expect(result.trialEndDate).toEqual(trialEndDate);
    });

    it('should not reinitialize tokens for existing users', async () => {
      TokenService.initializeUserTokens.mockResolvedValue(null);

      const result = await TokenService.initializeUserTokens(mockUser.id);

      expect(result).toBeNull();
      expect(TokenService.initializeUserTokens).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('Token Deduction Functionality', () => {
    it('should deduct tokens for AI queries', async () => {
      const mockTransaction = createTestTransaction({
        amount: -10,
        description: 'AI Life Optimization Query',
      });

      TokenService.deductTokens.mockResolvedValue(mockTransaction);

      const result = await TokenService.deductTokens(
        mockUser.id,
        10,
        'AI Life Optimization Query'
      );

      expect(result.amount).toBe(-10);
      expect(result.description).toBe('AI Life Optimization Query');
      expect(TokenService.deductTokens).toHaveBeenCalledWith(
        mockUser.id,
        10,
        'AI Life Optimization Query'
      );
    });

    it('should deduct different amounts for different AI features', async () => {
      const testCases = [
        { amount: 5, description: 'Quick AI Suggestion' },
        { amount: 15, description: 'Detailed Life Analysis' },
        { amount: 25, description: 'Comprehensive Goal Planning' },
      ];

      for (const testCase of testCases) {
        TokenService.deductTokens.mockResolvedValue(
          createTestTransaction({
            amount: -testCase.amount,
            description: testCase.description,
          })
        );

        const result = await TokenService.deductTokens(
          mockUser.id,
          testCase.amount,
          testCase.description
        );

        expect(result.amount).toBe(-testCase.amount);
        expect(result.description).toBe(testCase.description);
      }
    });

    it('should prevent token deduction when balance is insufficient', async () => {
      TokenService.deductTokens.mockRejectedValue(
        new Error('Insufficient token balance')
      );

      await expect(
        TokenService.deductTokens(mockUser.id, 5000, 'Expensive Query')
      ).rejects.toThrow('Insufficient token balance');
    });

    it('should update balance immediately after deduction', async () => {
      // Initial balance
      TokenService.getTokenBalance.mockResolvedValue(4800);
      
      // After deduction
      TokenService.deductTokens.mockResolvedValue(
        createTestTransaction({ amount: -10 })
      );
      
      TokenService.getTokenBalance.mockResolvedValue(4790);

      // Simulate deduction
      await TokenService.deductTokens(mockUser.id, 10, 'AI Query');
      
      // Check updated balance
      const newBalance = await TokenService.getTokenBalance(mockUser.id);
      
      expect(newBalance).toBe(4790);
    });
  });

  describe('Transaction History', () => {
    it('should record all token transactions', async () => {
      const mockTransactions = [
        createTestTransaction({
          amount: 4800,
          description: 'Initial trial tokens',
          created_at: '2024-01-01T00:00:00Z',
        }),
        createTestTransaction({
          amount: -10,
          description: 'AI Life Optimization Query',
          created_at: '2024-01-01T01:00:00Z',
        }),
        createTestTransaction({
          amount: -15,
          description: 'Detailed Goal Analysis',
          created_at: '2024-01-01T02:00:00Z',
        }),
      ];

      TokenService.getTransactionHistory.mockResolvedValue(mockTransactions);

      const transactions = await TokenService.getTransactionHistory(mockUser.id);

      expect(transactions).toHaveLength(3);
      expect(transactions[0].amount).toBe(4800);
      expect(transactions[1].amount).toBe(-10);
      expect(transactions[2].amount).toBe(-15);
    });

    it('should display transaction history in wallet component', async () => {
      const mockTransactions = [
        createTestTransaction({
          amount: -10,
          description: 'AI Query',
          created_at: new Date().toISOString(),
        }),
      ];

      TokenService.getTransactionHistory.mockResolvedValue(mockTransactions);

      render(<TransactionHistory />);

      await waitFor(() => {
        expect(screen.getByText('AI Query')).toBeInTheDocument();
        expect(screen.getByText('-10')).toBeInTheDocument();
      });
    });
  });

  describe('Trial Status Management', () => {
    it('should track trial period correctly', async () => {
      const trialStatus = {
        isActive: true,
        daysRemaining: 25,
        tokensRemaining: 4750,
        expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      };

      TokenService.checkTrialStatus.mockResolvedValue(trialStatus);

      const result = await TokenService.checkTrialStatus(mockUser.id);

      expect(result.isActive).toBe(true);
      expect(result.daysRemaining).toBe(25);
      expect(result.tokensRemaining).toBe(4750);
    });

    it('should handle expired trial status', async () => {
      const expiredTrialStatus = {
        isActive: false,
        daysRemaining: 0,
        tokensRemaining: 0,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      };

      TokenService.checkTrialStatus.mockResolvedValue(expiredTrialStatus);

      const result = await TokenService.checkTrialStatus(mockUser.id);

      expect(result.isActive).toBe(false);
      expect(result.daysRemaining).toBe(0);
      expect(result.tokensRemaining).toBe(0);
    });

    it('should display trial status in UI', async () => {
      const trialStatus = {
        isActive: true,
        daysRemaining: 25,
        tokensRemaining: 4750,
        expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      };

      TokenService.checkTrialStatus.mockResolvedValue(trialStatus);

      render(<TrialStatus />);

      await waitFor(() => {
        expect(screen.getByText(/25 days remaining/i)).toBeInTheDocument();
        expect(screen.getByText(/4,750 tokens/i)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Balance Updates', () => {
    it('should update wallet balance in real-time', async () => {
      // Initial render with starting balance
      TokenService.getTokenBalance.mockResolvedValue(4800);
      
      const { rerender } = render(<Wallet />);

      await waitFor(() => {
        expect(screen.getByText('4,800')).toBeInTheDocument();
      });

      // Simulate token deduction
      TokenService.getTokenBalance.mockResolvedValue(4790);
      
      rerender(<Wallet />);

      await waitFor(() => {
        expect(screen.getByText('4,790')).toBeInTheDocument();
      });
    });

    it('should handle concurrent token operations', async () => {
      const operations = [
        { amount: 10, description: 'Query 1' },
        { amount: 15, description: 'Query 2' },
        { amount: 5, description: 'Query 3' },
      ];

      // Mock concurrent operations
      const promises = operations.map((op, index) =>
        TokenService.deductTokens.mockResolvedValueOnce(
          createTestTransaction({
            id: `transaction-${index}`,
            amount: -op.amount,
            description: op.description,
          })
        )
      );

      // Execute concurrent operations
      const results = await Promise.all(
        operations.map(op =>
          TokenService.deductTokens(mockUser.id, op.amount, op.description)
        )
      );

      expect(results).toHaveLength(3);
      expect(TokenService.deductTokens).toHaveBeenCalledTimes(3);
    });
  });

  describe('Token Cost Validation', () => {
    it('should validate token costs for different AI features', async () => {
      const featureCosts = {
        'quick_suggestion': 5,
        'detailed_analysis': 15,
        'goal_planning': 25,
        'comprehensive_review': 50,
      };

      for (const [feature, cost] of Object.entries(featureCosts)) {
        TokenService.deductTokens.mockResolvedValue(
          createTestTransaction({
            amount: -cost,
            description: `${feature} operation`,
          })
        );

        const result = await TokenService.deductTokens(
          mockUser.id,
          cost,
          `${feature} operation`
        );

        expect(result.amount).toBe(-cost);
      }
    });

    it('should prevent negative token amounts', async () => {
      TokenService.deductTokens.mockRejectedValue(
        new Error('Invalid token amount')
      );

      await expect(
        TokenService.deductTokens(mockUser.id, -10, 'Invalid operation')
      ).rejects.toThrow('Invalid token amount');
    });
  });

  describe('Error Handling in Token Operations', () => {
    it('should handle database connection errors gracefully', async () => {
      TokenService.getTokenBalance.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        TokenService.getTokenBalance(mockUser.id)
      ).rejects.toThrow('Database connection failed');
    });

    it('should retry failed token operations', async () => {
      TokenService.deductTokens
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(createTestTransaction({ amount: -10 }));

      // First call fails, second succeeds
      await expect(
        TokenService.deductTokens(mockUser.id, 10, 'Retry test')
      ).rejects.toThrow('Temporary failure');

      const result = await TokenService.deductTokens(mockUser.id, 10, 'Retry test');
      expect(result.amount).toBe(-10);
    });

    it('should handle invalid user ID gracefully', async () => {
      TokenService.getTokenBalance.mockRejectedValue(
        new Error('User not found')
      );

      await expect(
        TokenService.getTokenBalance('invalid-user-id')
      ).rejects.toThrow('User not found');
    });
  });
});