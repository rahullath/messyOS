// UK Student Financial API Integration Tests
// Tests for API endpoints

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the UK Finance Service
const mockUKFinanceService = {
  getExpenses: vi.fn(),
  addExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
  getBudgets: vi.fn(),
  getBudgetHealth: vi.fn(),
  createBudget: vi.fn(),
  updateBudget: vi.fn(),
  deleteBudget: vi.fn(),
  processReceiptOCR: vi.fn(),
  getReceipts: vi.fn(),
  getSpendingAnalytics: vi.fn(),
  generateSpendingInsights: vi.fn(),
  getBudgetAlerts: vi.fn(),
  markAlertAsRead: vi.fn(),
  dismissAlert: vi.fn()
};

vi.mock('../../../lib/uk-student/uk-finance-service', () => ({
  ukFinanceService: mockUKFinanceService
}));

// Import API handlers after mocking
import { GET as getExpenses, POST as postExpenses, PUT as putExpenses, DELETE as deleteExpenses } from '../../pages/api/uk-student/expenses';
import { GET as getBudgets, POST as postBudgets, PUT as putBudgets, DELETE as deleteBudgets } from '../../pages/api/uk-student/budgets';
import { GET as getReceipts, POST as postReceipts } from '../../pages/api/uk-student/receipts';
import { GET as getAnalytics } from '../../pages/api/uk-student/analytics';
import { GET as getAlerts, PUT as putAlerts } from '../../pages/api/uk-student/alerts';

describe('Expenses API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/uk-student/expenses', () => {
    it('should fetch expenses successfully', async () => {
      const mockExpenses = [
        {
          id: 'expense-1',
          userId: 'user-1',
          amount: 12.50,
          description: 'Groceries',
          category: 'groceries'
        }
      ];

      mockUKFinanceService.getExpenses.mockResolvedValue(mockExpenses);

      const url = new URL('http://localhost/api/uk-student/expenses?userId=user-1');
      const request = new Request(url);

      const response = await getExpenses({ request, url } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.expenses).toEqual(mockExpenses);
      expect(mockUKFinanceService.getExpenses).toHaveBeenCalledWith('user-1', {});
    });

    it('should apply filters correctly', async () => {
      mockUKFinanceService.getExpenses.mockResolvedValue([]);

      const url = new URL('http://localhost/api/uk-student/expenses?userId=user-1&category=groceries&startDate=2024-11-01&endDate=2024-11-30&minAmount=10&maxAmount=100');
      const request = new Request(url);

      await getExpenses({ request, url } as any);

      expect(mockUKFinanceService.getExpenses).toHaveBeenCalledWith('user-1', {
        category: 'groceries',
        startDate: new Date('2024-11-01'),
        endDate: new Date('2024-11-30'),
        minAmount: 10,
        maxAmount: 100
      });
    });

    it('should return 400 if userId is missing', async () => {
      const url = new URL('http://localhost/api/uk-student/expenses');
      const request = new Request(url);

      const response = await getExpenses({ request, url } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User ID is required');
    });
  });

  describe('POST /api/uk-student/expenses', () => {
    it('should create expense successfully', async () => {
      const newExpense = {
        id: 'new-expense',
        userId: 'user-1',
        amount: 15.99,
        description: 'Coffee',
        category: 'food_out'
      };

      mockUKFinanceService.addExpense.mockResolvedValue(newExpense);

      const requestBody = {
        userId: 'user-1',
        amount: 15.99,
        description: 'Coffee',
        category: 'food_out',
        paymentMethod: 'card',
        transactionDate: '2024-11-12'
      };

      const request = new Request('http://localhost/api/uk-student/expenses', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await postExpenses({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.expense).toEqual(newExpense);
    });
  });

  describe('PUT /api/uk-student/expenses', () => {
    it('should update expense successfully', async () => {
      const updatedExpense = {
        id: 'expense-1',
        amount: 20.00,
        description: 'Updated expense'
      };

      mockUKFinanceService.updateExpense.mockResolvedValue(updatedExpense);

      const requestBody = {
        id: 'expense-1',
        amount: 20.00,
        description: 'Updated expense'
      };

      const request = new Request('http://localhost/api/uk-student/expenses', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await putExpenses({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.expense).toEqual(updatedExpense);
    });

    it('should return 400 if id is missing', async () => {
      const requestBody = {
        amount: 20.00,
        description: 'Updated expense'
      };

      const request = new Request('http://localhost/api/uk-student/expenses', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await putExpenses({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Expense ID is required');
    });
  });

  describe('DELETE /api/uk-student/expenses', () => {
    it('should delete expense successfully', async () => {
      mockUKFinanceService.deleteExpense.mockResolvedValue(undefined);

      const url = new URL('http://localhost/api/uk-student/expenses?id=expense-1');
      const request = new Request(url, { method: 'DELETE' });

      const response = await deleteExpenses({ request, url } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUKFinanceService.deleteExpense).toHaveBeenCalledWith('expense-1');
    });
  });
});

describe('Budgets API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/uk-student/budgets', () => {
    it('should fetch budgets and budget health', async () => {
      const mockBudgets = [
        {
          id: 'budget-1',
          category: 'groceries',
          limitAmount: 100
        }
      ];

      const mockBudgetHealth = {
        overallScore: 85,
        status: 'good',
        totalBudget: 200,
        totalSpent: 150
      };

      mockUKFinanceService.getBudgets.mockResolvedValue(mockBudgets);
      mockUKFinanceService.getBudgetHealth.mockResolvedValue(mockBudgetHealth);

      const url = new URL('http://localhost/api/uk-student/budgets?userId=user-1');
      const request = new Request(url);

      const response = await getBudgets({ request, url } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.budgets).toEqual(mockBudgets);
      expect(data.budgetHealth).toEqual(mockBudgetHealth);
    });
  });

  describe('POST /api/uk-student/budgets', () => {
    it('should create budget successfully', async () => {
      const newBudget = {
        id: 'new-budget',
        userId: 'user-1',
        category: 'transport',
        limitAmount: 50
      };

      mockUKFinanceService.createBudget.mockResolvedValue(newBudget);

      const requestBody = {
        userId: 'user-1',
        category: 'transport',
        budgetType: 'weekly',
        limitAmount: 50,
        periodStart: '2024-11-11',
        periodEnd: '2024-11-17'
      };

      const request = new Request('http://localhost/api/uk-student/budgets', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await postBudgets({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.budget).toEqual(newBudget);
    });
  });
});

describe('Receipts API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/uk-student/receipts', () => {
    it('should process receipt successfully', async () => {
      const mockReceiptData = {
        store: 'Aldi',
        items: [
          { name: 'Bread', quantity: 1, unitPrice: 1.20, totalPrice: 1.20 }
        ],
        total: 1.20,
        date: new Date(),
        confidence: 0.8
      };

      mockUKFinanceService.processReceiptOCR.mockResolvedValue(mockReceiptData);

      const formData = new FormData();
      formData.append('receipt', new File(['mock'], 'receipt.jpg', { type: 'image/jpeg' }));
      formData.append('userId', 'user-1');

      const request = new Request('http://localhost/api/uk-student/receipts', {
        method: 'POST',
        body: formData
      });

      const response = await postReceipts({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.receiptData).toEqual(mockReceiptData);
    });

    it('should return 400 if file or userId is missing', async () => {
      const formData = new FormData();
      formData.append('userId', 'user-1');
      // Missing receipt file

      const request = new Request('http://localhost/api/uk-student/receipts', {
        method: 'POST',
        body: formData
      });

      const response = await postReceipts({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Receipt file and user ID are required');
    });
  });

  describe('GET /api/uk-student/receipts', () => {
    it('should fetch receipts successfully', async () => {
      const mockReceipts = [
        {
          id: 'receipt-1',
          userId: 'user-1',
          expenseId: 'expense-1',
          processingStatus: 'completed'
        }
      ];

      mockUKFinanceService.getReceipts.mockResolvedValue(mockReceipts);

      const url = new URL('http://localhost/api/uk-student/receipts?userId=user-1');
      const request = new Request(url);

      const response = await getReceipts({ request, url } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.receipts).toEqual(mockReceipts);
    });
  });
});

describe('Analytics API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/uk-student/analytics', () => {
    it('should fetch analytics and insights', async () => {
      const mockAnalytics = {
        totalSpent: 150,
        averageDaily: 5,
        categoryBreakdown: { groceries: 100, transport: 50 }
      };

      const mockInsights = [
        {
          id: 'insight-1',
          insightType: 'weekly_summary',
          title: 'Weekly Summary',
          description: 'You spent £150 this week'
        }
      ];

      mockUKFinanceService.getSpendingAnalytics.mockResolvedValue(mockAnalytics);
      mockUKFinanceService.generateSpendingInsights.mockResolvedValue(mockInsights);

      const url = new URL('http://localhost/api/uk-student/analytics?userId=user-1&startDate=2024-11-01&endDate=2024-11-30&groupBy=day');
      const request = new Request(url);

      const response = await getAnalytics({ request, url } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.analytics).toEqual(mockAnalytics);
      expect(data.insights).toEqual(mockInsights);
    });

    it('should return 400 if required parameters are missing', async () => {
      const url = new URL('http://localhost/api/uk-student/analytics?userId=user-1');
      const request = new Request(url);

      const response = await getAnalytics({ request, url } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Start date and end date are required');
    });
  });
});

describe('Alerts API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/uk-student/alerts', () => {
    it('should fetch alerts successfully', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          userId: 'user-1',
          alertType: 'budget_exceeded',
          message: 'Budget exceeded',
          severity: 'critical'
        }
      ];

      mockUKFinanceService.getBudgetAlerts.mockResolvedValue(mockAlerts);

      const url = new URL('http://localhost/api/uk-student/alerts?userId=user-1&unreadOnly=true');
      const request = new Request(url);

      const response = await getAlerts({ request, url } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.alerts).toEqual(mockAlerts);
      expect(mockUKFinanceService.getBudgetAlerts).toHaveBeenCalledWith('user-1', true);
    });
  });

  describe('PUT /api/uk-student/alerts', () => {
    it('should mark alert as read', async () => {
      mockUKFinanceService.markAlertAsRead.mockResolvedValue(undefined);

      const requestBody = {
        alertId: 'alert-1',
        action: 'read'
      };

      const request = new Request('http://localhost/api/uk-student/alerts', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await putAlerts({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUKFinanceService.markAlertAsRead).toHaveBeenCalledWith('alert-1');
    });

    it('should dismiss alert', async () => {
      mockUKFinanceService.dismissAlert.mockResolvedValue(undefined);

      const requestBody = {
        alertId: 'alert-1',
        action: 'dismiss'
      };

      const request = new Request('http://localhost/api/uk-student/alerts', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await putAlerts({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockUKFinanceService.dismissAlert).toHaveBeenCalledWith('alert-1');
    });

    it('should return 400 for invalid action', async () => {
      const requestBody = {
        alertId: 'alert-1',
        action: 'invalid'
      };

      const request = new Request('http://localhost/api/uk-student/alerts', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await putAlerts({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action. Use "read" or "dismiss"');
    });
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle service errors gracefully', async () => {
    mockUKFinanceService.getExpenses.mockRejectedValue(new Error('Database error'));

    const url = new URL('http://localhost/api/uk-student/expenses?userId=user-1');
    const request = new Request(url);

    const response = await getExpenses({ request, url } as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch expenses');
  });

  it('should handle malformed JSON in POST requests', async () => {
    const request = new Request('http://localhost/api/uk-student/expenses', {
      method: 'POST',
      body: 'invalid json',
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await postExpenses({ request } as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to create expense');
  });
});