// UK Finance Service Tests
// Comprehensive tests for financial functionality

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ukFinanceService } from '../../lib/uk-student/uk-finance-service';
import type { 
  UKStudentExpense, 
  UKStudentBudget, 
  ReceiptData,
  ExpenseFilters,
  AnalyticsPeriod
} from '../../types/uk-student-finance';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({ data: mockExpenseData, error: null }))
      }))
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({ data: [mockExpenseData], error: null }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: mockExpenseData, error: null }))
        }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({ error: null }))
    }))
  }))
};

vi.mock('../../lib/supabase/client', () => ({
  supabase: mockSupabase
}));

// Mock Google Vision API
global.fetch = vi.fn();

const mockExpenseData = {
  id: 'test-expense-id',
  user_id: 'test-user-id',
  amount: 12.50,
  currency: 'GBP',
  description: 'Groceries at Aldi',
  category: 'groceries',
  store: 'Aldi',
  payment_method: 'card',
  transaction_date: '2024-11-12',
  is_recurring: false,
  tags: ['weekly-shop'],
  created_at: '2024-11-12T10:00:00Z',
  updated_at: '2024-11-12T10:00:00Z'
};

const mockBudgetData = {
  id: 'test-budget-id',
  user_id: 'test-user-id',
  category: 'groceries',
  budget_type: 'weekly',
  limit_amount: 50.00,
  current_spent: 25.00,
  period_start: '2024-11-11',
  period_end: '2024-11-17',
  alert_threshold: 0.8,
  is_active: true,
  created_at: '2024-11-11T00:00:00Z',
  updated_at: '2024-11-12T10:00:00Z'
};

describe('UKFinanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Expense Management', () => {
    it('should add a new expense successfully', async () => {
      const expenseData = {
        userId: 'test-user-id',
        amount: 12.50,
        currency: 'GBP',
        description: 'Groceries at Aldi',
        category: 'groceries',
        store: 'Aldi',
        paymentMethod: 'card' as const,
        transactionDate: new Date('2024-11-12'),
        isRecurring: false,
        tags: ['weekly-shop']
      };

      const result = await ukFinanceService.addExpense(expenseData);

      expect(result).toMatchObject({
        id: 'test-expense-id',
        userId: 'test-user-id',
        amount: 12.50,
        description: 'Groceries at Aldi',
        category: 'groceries'
      });
    });

    it('should validate expense data before adding', async () => {
      const invalidExpenseData = {
        userId: 'test-user-id',
        amount: -5, // Invalid negative amount
        currency: 'GBP',
        description: '',
        category: 'groceries',
        paymentMethod: 'card' as const,
        transactionDate: new Date(),
        isRecurring: false,
        tags: []
      };

      await expect(ukFinanceService.addExpense(invalidExpenseData)).rejects.toThrow();
    });

    it('should auto-categorize expenses based on description and store', async () => {
      const result = await ukFinanceService.categorizeExpense('Bought groceries', 'Aldi');
      expect(result).toBe('groceries');

      const result2 = await ukFinanceService.categorizeExpense('Train ticket to university');
      expect(result2).toBe('transport');

      const result3 = await ukFinanceService.categorizeExpense('Coffee at Starbucks', 'Starbucks');
      expect(result3).toBe('food_out');
    });

    it('should filter expenses correctly', async () => {
      const filters: ExpenseFilters = {
        category: 'groceries',
        startDate: new Date('2024-11-01'),
        endDate: new Date('2024-11-30'),
        minAmount: 10,
        maxAmount: 100
      };

      const result = await ukFinanceService.getExpenses('test-user-id', filters);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Budget Management', () => {
    it('should create a new budget successfully', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: mockBudgetData, error: null }))
          }))
        }))
      });

      const budgetData = {
        userId: 'test-user-id',
        category: 'groceries',
        budgetType: 'weekly' as const,
        limitAmount: 50.00,
        periodStart: new Date('2024-11-11'),
        periodEnd: new Date('2024-11-17'),
        alertThreshold: 0.8,
        isActive: true
      };

      const result = await ukFinanceService.createBudget(budgetData);

      expect(result).toMatchObject({
        id: 'test-budget-id',
        userId: 'test-user-id',
        category: 'groceries',
        limitAmount: 50.00
      });
    });

    it('should validate budget data before creating', async () => {
      const invalidBudgetData = {
        userId: 'test-user-id',
        category: '',
        budgetType: 'weekly' as const,
        limitAmount: -10, // Invalid negative amount
        periodStart: new Date('2024-11-17'),
        periodEnd: new Date('2024-11-11'), // End before start
        alertThreshold: 1.5, // Invalid threshold > 1
        isActive: true
      };

      await expect(ukFinanceService.createBudget(invalidBudgetData)).rejects.toThrow();
    });

    it('should calculate budget health correctly', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({ data: [mockBudgetData], error: null }))
          }))
        }))
      });

      const budgetHealth = await ukFinanceService.getBudgetHealth('test-user-id');

      expect(budgetHealth).toHaveProperty('overallScore');
      expect(budgetHealth).toHaveProperty('status');
      expect(budgetHealth).toHaveProperty('categoryBreakdown');
      expect(budgetHealth.overallScore).toBeGreaterThanOrEqual(0);
      expect(budgetHealth.overallScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Receipt Processing', () => {
    it('should process receipt OCR successfully', async () => {
      const mockOCRResponse = {
        responses: [{
          fullTextAnnotation: {
            text: 'ALDI\nBread £1.20\nMilk £1.35\nTOTAL £2.55\n12/11/2024'
          }
        }]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOCRResponse)
      });

      const mockFile = new File(['mock receipt'], 'receipt.jpg', { type: 'image/jpeg' });
      const result = await ukFinanceService.processReceiptOCR(mockFile);

      expect(result).toHaveProperty('store');
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('confidence');
    });

    it('should handle OCR failures gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const mockFile = new File(['mock receipt'], 'receipt.jpg', { type: 'image/jpeg' });
      const result = await ukFinanceService.processReceiptOCR(mockFile);

      expect(result.requiresManualInput).toBe(true);
      expect(result.confidence).toBe(0);
    });

    it('should parse receipt text correctly', async () => {
      const ocrText = `
        ALDI
        Bread Loaf £1.20
        Milk 1L £1.35
        Eggs 6pk £2.00
        TOTAL £4.55
        12/11/2024
      `;

      // Access private method for testing
      const result = (ukFinanceService as any).parseReceiptText(ocrText);

      expect(result.store).toContain('ALDI');
      expect(result.total).toBe(4.55);
      expect(result.items.length).toBeGreaterThan(0);
    });
  });

  describe('Price Comparison and Overpaying Detection', () => {
    it('should detect overpaying for items', async () => {
      const mockPriceReference = {
        id: 'test-price-ref',
        item_name: 'fly spray',
        category: 'household',
        average_price: 2.50,
        price_range_min: 1.99,
        price_range_max: 4.99,
        created_at: '2024-11-12T00:00:00Z'
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          ilike: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn(() => ({ data: mockPriceReference, error: null }))
            }))
          }))
        }))
      });

      const expense: UKStudentExpense = {
        id: 'test-expense',
        userId: 'test-user',
        amount: 4.99, // Significantly higher than average
        currency: 'GBP',
        description: 'fly spray for kitchen',
        category: 'household',
        paymentMethod: 'card',
        transactionDate: new Date(),
        isRecurring: false,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await ukFinanceService.checkForOverpaying(expense);

      expect(result).toBeTruthy();
      expect(result?.overpaidAmount).toBeGreaterThan(0);
      expect(result?.suggestion).toContain('average price');
    });

    it('should not flag reasonable prices as overpaying', async () => {
      const mockPriceReference = {
        id: 'test-price-ref',
        item_name: 'bread',
        category: 'groceries',
        average_price: 1.20,
        price_range_min: 0.85,
        price_range_max: 2.50,
        created_at: '2024-11-12T00:00:00Z'
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          ilike: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn(() => ({ data: mockPriceReference, error: null }))
            }))
          }))
        }))
      });

      const expense: UKStudentExpense = {
        id: 'test-expense',
        userId: 'test-user',
        amount: 1.25, // Close to average
        currency: 'GBP',
        description: 'bread loaf',
        category: 'groceries',
        paymentMethod: 'card',
        transactionDate: new Date(),
        isRecurring: false,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await ukFinanceService.checkForOverpaying(expense);

      expect(result).toBeNull();
    });
  });

  describe('Bank Statement Parsing', () => {
    it('should parse Monzo statements correctly', async () => {
      const monzoCSV = `Date,Description,Amount,Balance,Category
2024-11-12,Aldi Groceries,-12.50,487.50,groceries
2024-11-11,Train Ticket,-2.10,500.00,transport`;

      const result = await ukFinanceService.parseUKBankStatement(
        new File([monzoCSV], 'monzo.csv', { type: 'text/csv' }),
        'monzo'
      );

      expect(result).toHaveLength(2);
      expect(result[0].description).toBe('Aldi Groceries');
      expect(result[0].amount).toBe(12.50); // Should be positive
      expect(result[0].category).toBe('groceries');
    });

    it('should parse iQ Prepaid statements correctly', async () => {
      const iqStatement = `12/11/2024 Coffee Shop Purchase £3.50
11/11/2024 University Canteen £5.25`;

      const result = await ukFinanceService.parseUKBankStatement(
        new File([iqStatement], 'iq.txt', { type: 'text/plain' }),
        'iq-prepaid'
      );

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(3.50);
      expect(result[0].description).toContain('Coffee Shop');
    });
  });

  describe('Analytics and Insights', () => {
    it('should generate spending analytics correctly', async () => {
      const mockExpenses = [
        { ...mockExpenseData, amount: 10, category: 'groceries' },
        { ...mockExpenseData, amount: 15, category: 'transport' },
        { ...mockExpenseData, amount: 8, category: 'groceries' }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({ data: mockExpenses, error: null }))
          }))
        }))
      });

      const period: AnalyticsPeriod = {
        startDate: new Date('2024-11-01'),
        endDate: new Date('2024-11-30'),
        groupBy: 'day'
      };

      const analytics = await ukFinanceService.getSpendingAnalytics('test-user-id', period);

      expect(analytics).toHaveProperty('totalSpent');
      expect(analytics).toHaveProperty('categoryBreakdown');
      expect(analytics).toHaveProperty('averageDaily');
      expect(analytics.totalSpent).toBe(33);
      expect(analytics.categoryBreakdown.groceries).toBe(18);
      expect(analytics.categoryBreakdown.transport).toBe(15);
    });

    it('should generate meaningful spending insights', async () => {
      const mockExpenses = Array(15).fill(null).map((_, i) => ({
        ...mockExpenseData,
        id: `expense-${i}`,
        amount: 3.50,
        category: 'food_out',
        description: 'Coffee shop purchase'
      }));

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({ data: mockExpenses, error: null }))
          }))
        }))
      });

      const insights = await ukFinanceService.generateSpendingInsights('test-user-id');

      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThan(0);
      
      const savingsInsight = insights.find(i => i.insightType === 'savings_opportunity');
      expect(savingsInsight).toBeTruthy();
    });
  });

  describe('Budget Templates', () => {
    it('should fetch budget templates successfully', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          category: 'groceries',
          suggested_weekly_amount: 40,
          suggested_monthly_amount: 160,
          description: 'Food shopping',
          is_essential: true,
          created_at: '2024-11-12T00:00:00Z'
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn(() => ({ data: mockTemplates, error: null }))
          }))
        }))
      });

      const templates = await ukFinanceService.getBudgetTemplates();

      expect(Array.isArray(templates)).toBe(true);
      expect(templates[0]).toHaveProperty('category');
      expect(templates[0]).toHaveProperty('suggestedWeeklyAmount');
      expect(templates[0]).toHaveProperty('isEssential');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: { message: 'Database error' } }))
          }))
        }))
      });

      const expenseData = {
        userId: 'test-user-id',
        amount: 12.50,
        currency: 'GBP',
        description: 'Test expense',
        category: 'groceries',
        paymentMethod: 'card' as const,
        transactionDate: new Date(),
        isRecurring: false,
        tags: []
      };

      await expect(ukFinanceService.addExpense(expenseData)).rejects.toThrow();
    });

    it('should validate file types for receipt processing', async () => {
      const invalidFile = new File(['not an image'], 'document.txt', { type: 'text/plain' });
      
      // This should be handled at the component level, but service should handle gracefully
      const result = await ukFinanceService.processReceiptOCR(invalidFile);
      expect(result.requiresManualInput).toBe(true);
    });
  });
});