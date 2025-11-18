// UK Student Financial Components Tests
// Tests for React components

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BudgetManager } from '../../components/uk-student/BudgetManager';
import { ExpenseTracker } from '../../components/uk-student/ExpenseTracker';
import { ReceiptScanner } from '../../components/uk-student/ReceiptScanner';
import type { 
  BudgetManagerProps, 
  ExpenseTrackerProps, 
  ReceiptScannerProps,
  UKStudentBudget,
  UKStudentExpense,
  BudgetHealth
} from '../../types/uk-student-finance';

// Mock the UK Finance Service
vi.mock('../../lib/uk-student/uk-finance-service', () => ({
  ukFinanceService: {
    getBudgetTemplates: vi.fn(() => Promise.resolve([
      {
        id: 'template-1',
        category: 'groceries',
        suggestedWeeklyAmount: 40,
        suggestedMonthlyAmount: 160,
        description: 'Food shopping',
        isEssential: true,
        createdAt: new Date()
      }
    ])),
    createBudget: vi.fn((budget) => Promise.resolve({
      id: 'new-budget-id',
      ...budget,
      currentSpent: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    })),
    addExpense: vi.fn((expense) => Promise.resolve({
      id: 'new-expense-id',
      ...expense,
      createdAt: new Date(),
      updatedAt: new Date()
    })),
    updateExpense: vi.fn((id, updates) => Promise.resolve({
      id,
      ...updates,
      updatedAt: new Date()
    })),
    deleteExpense: vi.fn(() => Promise.resolve()),
    processReceiptOCR: vi.fn(() => Promise.resolve({
      store: 'Aldi',
      items: [
        { name: 'Bread', quantity: 1, unitPrice: 1.20, totalPrice: 1.20 },
        { name: 'Milk', quantity: 1, unitPrice: 1.35, totalPrice: 1.35 }
      ],
      total: 2.55,
      date: new Date(),
      confidence: 0.8
    }))
  }
}));

describe('BudgetManager Component', () => {
  const mockBudgetHealth: BudgetHealth = {
    overallScore: 75,
    status: 'good',
    totalBudget: 200,
    totalSpent: 150,
    remainingBudget: 50,
    categoryBreakdown: [
      {
        category: 'groceries',
        budgeted: 80,
        spent: 60,
        remaining: 20,
        percentage: 75,
        status: 'near'
      }
    ],
    recommendations: ['You are on track with your spending'],
    alerts: []
  };

  const mockBudgets: UKStudentBudget[] = [
    {
      id: 'budget-1',
      userId: 'user-1',
      category: 'groceries',
      budgetType: 'weekly',
      limitAmount: 80,
      currentSpent: 60,
      periodStart: new Date('2024-11-11'),
      periodEnd: new Date('2024-11-17'),
      alertThreshold: 0.8,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const defaultProps: BudgetManagerProps = {
    userId: 'user-1',
    budgets: mockBudgets,
    expenses: [],
    budgetHealth: mockBudgetHealth,
    onBudgetUpdate: vi.fn(),
    onExpenseAdd: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders budget health overview correctly', () => {
    render(<BudgetManager {...defaultProps} />);
    
    expect(screen.getByText('Budget Health')).toBeInTheDocument();
    expect(screen.getByText('75/100')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('£150.00')).toBeInTheDocument();
    expect(screen.getByText('£50.00')).toBeInTheDocument();
  });

  it('displays category budgets with progress bars', () => {
    render(<BudgetManager {...defaultProps} />);
    
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('£60.00 / £80.00')).toBeInTheDocument();
    expect(screen.getByText('75.0%')).toBeInTheDocument();
    expect(screen.getByText('Near Limit')).toBeInTheDocument();
  });

  it('opens create budget modal when add budget is clicked', async () => {
    render(<BudgetManager {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Add Budget'));
    
    await waitFor(() => {
      expect(screen.getByText('Create New Budget')).toBeInTheDocument();
    });
  });

  it('creates a new budget successfully', async () => {
    const onBudgetUpdate = vi.fn();
    render(<BudgetManager {...defaultProps} onBudgetUpdate={onBudgetUpdate} />);
    
    // Open modal
    fireEvent.click(screen.getByText('Add Budget'));
    
    // Select template
    await waitFor(() => {
      fireEvent.click(screen.getByText('Groceries'));
    });
    
    // Fill form
    const categoryInput = screen.getByDisplayValue('groceries');
    const amountInput = screen.getByDisplayValue('160');
    
    expect(categoryInput).toBeInTheDocument();
    expect(amountInput).toBeInTheDocument();
    
    // Submit
    fireEvent.click(screen.getByText('Create Budget'));
    
    await waitFor(() => {
      expect(onBudgetUpdate).toHaveBeenCalled();
    });
  });

  it('shows recommendations when available', () => {
    render(<BudgetManager {...defaultProps} />);
    
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByText('You are on track with your spending')).toBeInTheDocument();
  });
});

describe('ExpenseTracker Component', () => {
  const mockExpenses: UKStudentExpense[] = [
    {
      id: 'expense-1',
      userId: 'user-1',
      amount: 12.50,
      currency: 'GBP',
      description: 'Groceries at Aldi',
      category: 'groceries',
      store: 'Aldi',
      paymentMethod: 'card',
      transactionDate: new Date('2024-11-12'),
      isRecurring: false,
      tags: ['weekly-shop'],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const defaultProps: ExpenseTrackerProps = {
    userId: 'user-1',
    expenses: mockExpenses,
    categories: ['groceries', 'transport', 'food_out'],
    onExpenseAdd: vi.fn(),
    onExpenseUpdate: vi.fn(),
    onExpenseDelete: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders expense list correctly', () => {
    render(<ExpenseTracker {...defaultProps} />);
    
    expect(screen.getByText('Expense Tracker')).toBeInTheDocument();
    expect(screen.getByText('Groceries at Aldi')).toBeInTheDocument();
    expect(screen.getByText('£12.50')).toBeInTheDocument();
    expect(screen.getByText('at Aldi')).toBeInTheDocument();
    expect(screen.getByText('via card')).toBeInTheDocument();
  });

  it('shows total expenses and count', () => {
    render(<ExpenseTracker {...defaultProps} />);
    
    expect(screen.getByText('Total: £12.50 (1 expenses)')).toBeInTheDocument();
  });

  it('filters expenses by category', () => {
    render(<ExpenseTracker {...defaultProps} />);
    
    const categoryFilter = screen.getByDisplayValue('All Categories');
    fireEvent.change(categoryFilter, { target: { value: 'groceries' } });
    
    expect(screen.getByText('Groceries at Aldi')).toBeInTheDocument();
  });

  it('opens add expense modal', async () => {
    render(<ExpenseTracker {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Add Expense'));
    
    await waitFor(() => {
      expect(screen.getByText('Add New Expense')).toBeInTheDocument();
    });
  });

  it('adds a new expense successfully', async () => {
    const onExpenseAdd = vi.fn();
    render(<ExpenseTracker {...defaultProps} onExpenseAdd={onExpenseAdd} />);
    
    // Open modal
    fireEvent.click(screen.getByText('Add Expense'));
    
    // Fill form
    await waitFor(() => {
      const amountInput = screen.getByPlaceholderText('0.00');
      const descriptionInput = screen.getByPlaceholderText('What did you buy?');
      const categorySelect = screen.getByDisplayValue('Select category');
      
      fireEvent.change(amountInput, { target: { value: '5.99' } });
      fireEvent.change(descriptionInput, { target: { value: 'Coffee' } });
      fireEvent.change(categorySelect, { target: { value: 'food_out' } });
    });
    
    // Submit
    fireEvent.click(screen.getByText('Add Expense'));
    
    await waitFor(() => {
      expect(onExpenseAdd).toHaveBeenCalled();
    });
  });

  it('edits an existing expense', async () => {
    const onExpenseUpdate = vi.fn();
    render(<ExpenseTracker {...defaultProps} onExpenseUpdate={onExpenseUpdate} />);
    
    // Click edit button
    fireEvent.click(screen.getByText('Edit'));
    
    // Modal should open with pre-filled data
    await waitFor(() => {
      expect(screen.getByText('Edit Expense')).toBeInTheDocument();
      expect(screen.getByDisplayValue('12.5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Groceries at Aldi')).toBeInTheDocument();
    });
    
    // Update amount
    const amountInput = screen.getByDisplayValue('12.5');
    fireEvent.change(amountInput, { target: { value: '15.00' } });
    
    // Submit
    fireEvent.click(screen.getByText('Update Expense'));
    
    await waitFor(() => {
      expect(onExpenseUpdate).toHaveBeenCalled();
    });
  });

  it('deletes an expense with confirmation', async () => {
    const onExpenseDelete = vi.fn();
    
    // Mock window.confirm
    window.confirm = vi.fn(() => true);
    
    render(<ExpenseTracker {...defaultProps} onExpenseDelete={onExpenseDelete} />);
    
    fireEvent.click(screen.getByText('Delete'));
    
    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this expense?');
      expect(onExpenseDelete).toHaveBeenCalledWith('expense-1');
    });
  });

  it('adds and removes tags correctly', async () => {
    render(<ExpenseTracker {...defaultProps} />);
    
    // Open add expense modal
    fireEvent.click(screen.getByText('Add Expense'));
    
    await waitFor(() => {
      const tagInput = screen.getByPlaceholderText('Add tag');
      fireEvent.change(tagInput, { target: { value: 'urgent' } });
      fireEvent.click(screen.getByText('Add'));
      
      expect(screen.getByText('urgent')).toBeInTheDocument();
    });
  });
});

describe('ReceiptScanner Component', () => {
  const defaultProps: ReceiptScannerProps = {
    onReceiptProcessed: vi.fn(),
    onError: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload interface correctly', () => {
    render(<ReceiptScanner {...defaultProps} />);
    
    expect(screen.getByText('Scan Receipt')).toBeInTheDocument();
    expect(screen.getByText('Upload Receipt Photo')).toBeInTheDocument();
    expect(screen.getByText('Enter receipt details manually')).toBeInTheDocument();
  });

  it('processes receipt file successfully', async () => {
    const onReceiptProcessed = vi.fn();
    render(<ReceiptScanner {...defaultProps} onReceiptProcessed={onReceiptProcessed} />);
    
    const file = new File(['mock receipt'], 'receipt.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /upload receipt photo/i }).parentElement?.querySelector('input[type="file"]');
    
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(onReceiptProcessed).toHaveBeenCalledWith({
          store: 'Aldi',
          items: expect.any(Array),
          total: 2.55,
          date: expect.any(Date),
          confidence: 0.8
        });
      });
    }
  });

  it('opens manual entry modal', async () => {
    render(<ReceiptScanner {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Enter receipt details manually'));
    
    await waitFor(() => {
      expect(screen.getByText('Manual Receipt Entry')).toBeInTheDocument();
    });
  });

  it('adds items in manual entry mode', async () => {
    render(<ReceiptScanner {...defaultProps} />);
    
    // Open manual entry
    fireEvent.click(screen.getByText('Enter receipt details manually'));
    
    await waitFor(() => {
      // Fill store
      const storeSelect = screen.getByDisplayValue('Select store');
      fireEvent.change(storeSelect, { target: { value: 'Aldi' } });
      
      // Add item
      const itemNameInput = screen.getByPlaceholderText('Item name');
      const quantityInput = screen.getByPlaceholderText('Qty');
      const priceInput = screen.getByPlaceholderText('Price £');
      
      fireEvent.change(itemNameInput, { target: { value: 'Bread' } });
      fireEvent.change(quantityInput, { target: { value: '1' } });
      fireEvent.change(priceInput, { target: { value: '1.20' } });
      
      fireEvent.click(screen.getByText('Add Item'));
      
      expect(screen.getByText('Bread')).toBeInTheDocument();
      expect(screen.getByText('£1.20')).toBeInTheDocument();
    });
  });

  it('validates file types', async () => {
    const onError = vi.fn();
    render(<ReceiptScanner {...defaultProps} onError={onError} />);
    
    const file = new File(['not an image'], 'document.txt', { type: 'text/plain' });
    const input = screen.getByRole('button', { name: /upload receipt photo/i }).parentElement?.querySelector('input[type="file"]');
    
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [file],
        writable: false,
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Please select an image file');
      });
    }
  });

  it('validates file size', async () => {
    const onError = vi.fn();
    render(<ReceiptScanner {...defaultProps} onError={onError} />);
    
    // Create a large file (>10MB)
    const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /upload receipt photo/i }).parentElement?.querySelector('input[type="file"]');
    
    if (input) {
      Object.defineProperty(input, 'files', {
        value: [largeFile],
        writable: false,
      });
      
      fireEvent.change(input);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('File size must be less than 10MB');
      });
    }
  });

  it('saves manual receipt data correctly', async () => {
    const onReceiptProcessed = vi.fn();
    render(<ReceiptScanner {...defaultProps} onReceiptProcessed={onReceiptProcessed} />);
    
    // Open manual entry
    fireEvent.click(screen.getByText('Enter receipt details manually'));
    
    await waitFor(async () => {
      // Fill form
      const storeSelect = screen.getByDisplayValue('Select store');
      fireEvent.change(storeSelect, { target: { value: 'Aldi' } });
      
      // Add item
      const itemNameInput = screen.getByPlaceholderText('Item name');
      const quantityInput = screen.getByPlaceholderText('Qty');
      const priceInput = screen.getByPlaceholderText('Price £');
      
      fireEvent.change(itemNameInput, { target: { value: 'Bread' } });
      fireEvent.change(quantityInput, { target: { value: '1' } });
      fireEvent.change(priceInput, { target: { value: '1.20' } });
      
      fireEvent.click(screen.getByText('Add Item'));
      
      // Save receipt
      fireEvent.click(screen.getByText('Save Receipt'));
      
      expect(onReceiptProcessed).toHaveBeenCalledWith({
        store: 'Aldi',
        items: [
          {
            name: 'Bread',
            quantity: 1,
            unitPrice: 1.20,
            totalPrice: 1.20
          }
        ],
        total: 1.20,
        date: expect.any(Date),
        confidence: 1
      });
    });
  });
});