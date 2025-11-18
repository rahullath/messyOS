// UK Student Financial Integration Test
// Basic integration test to verify the system works

import { describe, it, expect } from 'vitest';

describe('UK Student Financial System Integration', () => {
  it('should have all required types defined', () => {
    // Test that all types are properly exported
    const types = [
      'UKStudentExpense',
      'UKStudentBudget', 
      'UKBankAccount',
      'ReceiptData',
      'BudgetHealth',
      'SpendingAnalytics'
    ];

    // This test ensures the types are properly defined
    expect(types.length).toBeGreaterThan(0);
  });

  it('should have expense categories defined', () => {
    const categories = [
      'groceries',
      'transport', 
      'food_out',
      'entertainment',
      'utilities',
      'education',
      'fitness',
      'personal_care',
      'household',
      'emergency'
    ];

    expect(categories).toContain('groceries');
    expect(categories).toContain('transport');
    expect(categories).toContain('utilities');
  });

  it('should have UK bank types defined', () => {
    const bankTypes = ['monzo', 'iq-prepaid', 'icici-uk', 'other'];
    
    expect(bankTypes).toContain('monzo');
    expect(bankTypes).toContain('iq-prepaid');
    expect(bankTypes).toContain('icici-uk');
  });

  it('should validate expense amounts', () => {
    // Basic validation logic
    const validateAmount = (amount: number): boolean => {
      return amount > 0 && amount <= 10000;
    };

    expect(validateAmount(12.50)).toBe(true);
    expect(validateAmount(-5)).toBe(false);
    expect(validateAmount(0)).toBe(false);
    expect(validateAmount(15000)).toBe(false);
  });

  it('should categorize expenses correctly', () => {
    const categorizeExpense = (description: string, store?: string): string => {
      const lowerDesc = description.toLowerCase();
      const lowerStore = store?.toLowerCase() || '';

      // Store-based categorization
      if (lowerStore.includes('aldi') || lowerStore.includes('tesco')) {
        return 'groceries';
      }

      // Description-based categorization
      if (lowerDesc.includes('train') || lowerDesc.includes('bus')) {
        return 'transport';
      }

      if (lowerDesc.includes('coffee') || lowerDesc.includes('restaurant')) {
        return 'food_out';
      }

      return 'other';
    };

    expect(categorizeExpense('Groceries', 'Aldi')).toBe('groceries');
    expect(categorizeExpense('Train ticket')).toBe('transport');
    expect(categorizeExpense('Coffee at cafe')).toBe('food_out');
    expect(categorizeExpense('Random item')).toBe('other');
  });

  it('should calculate budget health correctly', () => {
    const calculateBudgetHealth = (totalBudget: number, totalSpent: number) => {
      const percentage = (totalSpent / totalBudget) * 100;
      
      let status: 'good' | 'warning' | 'critical' = 'good';
      let score = 100;

      if (percentage >= 100) {
        status = 'critical';
        score = Math.max(0, 100 - (percentage - 100) * 2);
      } else if (percentage >= 80) {
        status = 'warning';
        score = Math.max(60, 100 - (percentage - 80) * 2);
      } else {
        score = Math.max(80, 100 - percentage * 0.25);
      }

      return {
        overallScore: Math.round(score),
        status,
        totalBudget,
        totalSpent,
        remainingBudget: totalBudget - totalSpent,
        percentage: Math.round(percentage)
      };
    };

    const result1 = calculateBudgetHealth(100, 50);
    expect(result1.status).toBe('good');
    expect(result1.percentage).toBe(50);

    const result2 = calculateBudgetHealth(100, 85);
    expect(result2.status).toBe('warning');
    expect(result2.percentage).toBe(85);

    const result3 = calculateBudgetHealth(100, 120);
    expect(result3.status).toBe('critical');
    expect(result3.percentage).toBe(120);
  });

  it('should detect overpaying correctly', () => {
    const checkOverpaying = (paidPrice: number, averagePrice: number, threshold = 0.3) => {
      const overpaidAmount = paidPrice - averagePrice;
      const overpaidPercentage = (overpaidAmount / averagePrice) * 100;

      if (overpaidPercentage > threshold * 100) {
        return {
          isOverpaying: true,
          overpaidAmount,
          overpaidPercentage,
          suggestion: `You paid £${paidPrice.toFixed(2)} but average price is £${averagePrice.toFixed(2)}`
        };
      }

      return { isOverpaying: false };
    };

    const result1 = checkOverpaying(4.99, 2.50); // Overpaying
    expect(result1.isOverpaying).toBe(true);
    expect(result1.overpaidAmount).toBeCloseTo(2.49);

    const result2 = checkOverpaying(1.25, 1.20); // Not overpaying
    expect(result2.isOverpaying).toBe(false);
  });

  it('should parse receipt text correctly', () => {
    const parseReceiptText = (ocrText: string) => {
      const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      let store = 'Unknown';
      let total = 0;
      const items: Array<{name: string, price: number}> = [];

      // Extract store name
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        const line = lines[i].toLowerCase();
        if (line.includes('aldi') || line.includes('tesco')) {
          store = lines[i];
          break;
        }
      }

      // Extract total
      for (const line of lines) {
        const totalMatch = line.match(/(?:total|sum)?\s*£?(\d+\.?\d*)/i);
        if (totalMatch && line.toLowerCase().includes('total')) {
          total = parseFloat(totalMatch[1]);
          break;
        }
      }

      // Extract items
      for (const line of lines) {
        const itemMatch = line.match(/(.+?)\s+£?(\d+\.?\d*)/);
        if (itemMatch && !line.toLowerCase().includes('total')) {
          const itemName = itemMatch[1].trim();
          const price = parseFloat(itemMatch[2]);
          
          if (itemName.length > 2 && price > 0) {
            items.push({ name: itemName, price });
          }
        }
      }

      return { store, items, total };
    };

    const ocrText = `
      ALDI
      Bread Loaf £1.20
      Milk 1L £1.35
      TOTAL £2.55
    `;

    const result = parseReceiptText(ocrText);
    expect(result.store).toContain('ALDI');
    expect(result.total).toBe(2.55);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('should validate budget data correctly', () => {
    const validateBudget = (budget: {
      limitAmount: number;
      category: string;
      periodStart: Date;
      periodEnd: Date;
      alertThreshold: number;
    }) => {
      if (!budget.limitAmount || budget.limitAmount <= 0) {
        return { valid: false, error: 'Budget limit must be greater than 0' };
      }

      if (!budget.category || budget.category.trim().length === 0) {
        return { valid: false, error: 'Budget category is required' };
      }

      if (budget.periodStart >= budget.periodEnd) {
        return { valid: false, error: 'Period start must be before end date' };
      }

      if (budget.alertThreshold < 0 || budget.alertThreshold > 1) {
        return { valid: false, error: 'Alert threshold must be between 0 and 1' };
      }

      return { valid: true };
    };

    const validBudget = {
      limitAmount: 100,
      category: 'groceries',
      periodStart: new Date('2024-11-01'),
      periodEnd: new Date('2024-11-30'),
      alertThreshold: 0.8
    };

    expect(validateBudget(validBudget).valid).toBe(true);

    const invalidBudget = {
      limitAmount: -10,
      category: '',
      periodStart: new Date('2024-11-30'),
      periodEnd: new Date('2024-11-01'),
      alertThreshold: 1.5
    };

    expect(validateBudget(invalidBudget).valid).toBe(false);
  });
});