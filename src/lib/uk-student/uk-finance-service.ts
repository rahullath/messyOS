// UK Student Finance Service
// Handles expense tracking, budgeting, receipt OCR, and financial analytics

import { supabase } from '../supabase/client';
import type {
  UKStudentExpense,
  UKStudentBudget,
  UKBankAccount,
  UKStudentReceipt,
  ReceiptData,
  ReceiptItem,
  PriceReference,
  BudgetAlert,
  SpendingInsight,
  BudgetTemplate,
  Transaction,
  BudgetHealth,
  CategorySpending,
  OverpayingAlert,
  SpendingAnalytics,
  AnalyticsPeriod,
  TrendDataPoint,
  SavingsOpportunity,
  ExpenseFilters,
  UKBankType,
  PaymentMethod,
  UKFinanceServiceInterface,
  UKFinanceError,
  ReceiptProcessingError,
  BudgetValidationError,
  ValidationResult
} from '../../types/uk-student-finance';

export class UKFinanceService implements UKFinanceServiceInterface {
  private readonly GOOGLE_VISION_API_KEY = import.meta.env.PUBLIC_GOOGLE_VISION_API_KEY;
  private readonly OVERPAYING_THRESHOLD = 0.3; // 30% above average price

  // Expense Management
  async addExpense(expense: Omit<UKStudentExpense, 'id' | 'createdAt' | 'updatedAt'>): Promise<UKStudentExpense> {
    try {
      // Validate expense data
      const validation = this.validateExpenseData(expense);
      if (!validation.valid) {
        throw new UKFinanceError('Invalid expense data', 'VALIDATION_ERROR', { error: validation.error });
      }

      // Auto-categorize if category is not provided or is 'other'
      if (!expense.category || expense.category === 'other') {
        expense.category = await this.categorizeExpense(expense.description, expense.store);
      }

      const { data, error } = await supabase
        .from('uk_student_expenses')
        .insert([{
          user_id: expense.userId,
          amount: expense.amount,
          currency: expense.currency || 'GBP',
          description: expense.description,
          category: expense.category,
          subcategory: expense.subcategory,
          store: expense.store,
          location: expense.location,
          payment_method: expense.paymentMethod,
          receipt_data: expense.receiptData,
          transaction_date: expense.transactionDate.toISOString().split('T')[0],
          is_recurring: expense.isRecurring,
          recurring_frequency: expense.recurringFrequency,
          tags: expense.tags,
          notes: expense.notes
        }])
        .select()
        .single();

      if (error) throw new UKFinanceError('Failed to add expense', 'DATABASE_ERROR', { error });

      const newExpense = this.mapDatabaseExpenseToType(data);

      // Check for overpaying
      const overpayingAlert = await this.checkForOverpaying(newExpense);
      if (overpayingAlert) {
        await this.createOverpayingAlert(expense.userId, overpayingAlert);
      }

      return newExpense;
    } catch (error) {
      console.error('Error adding expense:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to add expense', 'UNKNOWN_ERROR');
    }
  }

  async updateExpense(id: string, updates: Partial<UKStudentExpense>): Promise<UKStudentExpense> {
    try {
      const updateData: any = {};
      
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.subcategory !== undefined) updateData.subcategory = updates.subcategory;
      if (updates.store !== undefined) updateData.store = updates.store;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
      if (updates.receiptData !== undefined) updateData.receipt_data = updates.receiptData;
      if (updates.transactionDate !== undefined) updateData.transaction_date = updates.transactionDate.toISOString().split('T')[0];
      if (updates.isRecurring !== undefined) updateData.is_recurring = updates.isRecurring;
      if (updates.recurringFrequency !== undefined) updateData.recurring_frequency = updates.recurringFrequency;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('uk_student_expenses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new UKFinanceError('Failed to update expense', 'DATABASE_ERROR', { error });

      return this.mapDatabaseExpenseToType(data);
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to update expense', 'UNKNOWN_ERROR');
    }
  }

  async deleteExpense(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('uk_student_expenses')
        .delete()
        .eq('id', id);

      if (error) throw new UKFinanceError('Failed to delete expense', 'DATABASE_ERROR', { error });
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to delete expense', 'UNKNOWN_ERROR');
    }
  }

  async getExpenses(userId: string, filters?: ExpenseFilters): Promise<UKStudentExpense[]> {
    try {
      let query = supabase
        .from('uk_student_expenses')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false });

      if (filters) {
        if (filters.startDate) {
          query = query.gte('transaction_date', filters.startDate.toISOString().split('T')[0]);
        }
        if (filters.endDate) {
          query = query.lte('transaction_date', filters.endDate.toISOString().split('T')[0]);
        }
        if (filters.category) {
          query = query.eq('category', filters.category);
        }
        if (filters.store) {
          query = query.eq('store', filters.store);
        }
        if (filters.paymentMethod) {
          query = query.eq('payment_method', filters.paymentMethod);
        }
        if (filters.minAmount) {
          query = query.gte('amount', filters.minAmount);
        }
        if (filters.maxAmount) {
          query = query.lte('amount', filters.maxAmount);
        }
        if (filters.tags && filters.tags.length > 0) {
          query = query.overlaps('tags', filters.tags);
        }
      }

      const { data, error } = await query;

      if (error) throw new UKFinanceError('Failed to get expenses', 'DATABASE_ERROR', { error });

      return data.map(this.mapDatabaseExpenseToType);
    } catch (error) {
      console.error('Error getting expenses:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to get expenses', 'UNKNOWN_ERROR');
    }
  }

  // Budget Management
  async createBudget(budget: Omit<UKStudentBudget, 'id' | 'currentSpent' | 'createdAt' | 'updatedAt'>): Promise<UKStudentBudget> {
    try {
      const validation = this.validateBudgetData(budget);
      if (!validation.valid) {
        throw new BudgetValidationError('Invalid budget data', { error: validation.error });
      }

      const { data, error } = await supabase
        .from('uk_student_budgets')
        .insert([{
          user_id: budget.userId,
          category: budget.category,
          budget_type: budget.budgetType,
          limit_amount: budget.limitAmount,
          period_start: budget.periodStart.toISOString().split('T')[0],
          period_end: budget.periodEnd.toISOString().split('T')[0],
          alert_threshold: budget.alertThreshold,
          is_active: budget.isActive
        }])
        .select()
        .single();

      if (error) throw new UKFinanceError('Failed to create budget', 'DATABASE_ERROR', { error });

      return this.mapDatabaseBudgetToType(data);
    } catch (error) {
      console.error('Error creating budget:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to create budget', 'UNKNOWN_ERROR');
    }
  }

  async updateBudget(id: string, updates: Partial<UKStudentBudget>): Promise<UKStudentBudget> {
    try {
      const updateData: any = {};
      
      if (updates.limitAmount !== undefined) updateData.limit_amount = updates.limitAmount;
      if (updates.alertThreshold !== undefined) updateData.alert_threshold = updates.alertThreshold;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.periodStart !== undefined) updateData.period_start = updates.periodStart.toISOString().split('T')[0];
      if (updates.periodEnd !== undefined) updateData.period_end = updates.periodEnd.toISOString().split('T')[0];

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('uk_student_budgets')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new UKFinanceError('Failed to update budget', 'DATABASE_ERROR', { error });

      return this.mapDatabaseBudgetToType(data);
    } catch (error) {
      console.error('Error updating budget:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to update budget', 'UNKNOWN_ERROR');
    }
  }

  async deleteBudget(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('uk_student_budgets')
        .delete()
        .eq('id', id);

      if (error) throw new UKFinanceError('Failed to delete budget', 'DATABASE_ERROR', { error });
    } catch (error) {
      console.error('Error deleting budget:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to delete budget', 'UNKNOWN_ERROR');
    }
  }

  async getBudgets(userId: string): Promise<UKStudentBudget[]> {
    try {
      const { data, error } = await supabase
        .from('uk_student_budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('category');

      if (error) throw new UKFinanceError('Failed to get budgets', 'DATABASE_ERROR', { error });

      return data.map(this.mapDatabaseBudgetToType);
    } catch (error) {
      console.error('Error getting budgets:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to get budgets', 'UNKNOWN_ERROR');
    }
  }

  async getBudgetHealth(userId: string): Promise<BudgetHealth> {
    try {
      const budgets = await this.getBudgets(userId);
      const alerts = await this.getBudgetAlerts(userId, true);

      let totalBudget = 0;
      let totalSpent = 0;
      const categoryBreakdown: CategorySpending[] = [];

      for (const budget of budgets) {
        totalBudget += budget.limitAmount;
        totalSpent += budget.currentSpent;

        const remaining = budget.limitAmount - budget.currentSpent;
        const percentage = (budget.currentSpent / budget.limitAmount) * 100;
        
        let status: 'under' | 'near' | 'over' = 'under';
        if (percentage >= 100) status = 'over';
        else if (percentage >= budget.alertThreshold * 100) status = 'near';

        categoryBreakdown.push({
          category: budget.category,
          budgeted: budget.limitAmount,
          spent: budget.currentSpent,
          remaining,
          percentage,
          status
        });
      }

      const remainingBudget = totalBudget - totalSpent;
      const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

      let overallScore = 100;
      let status: 'good' | 'warning' | 'critical' = 'good';

      if (overallPercentage >= 100) {
        overallScore = Math.max(0, 100 - (overallPercentage - 100) * 2);
        status = 'critical';
      } else if (overallPercentage >= 80) {
        overallScore = Math.max(60, 100 - (overallPercentage - 80) * 2);
        status = 'warning';
      } else {
        overallScore = Math.max(80, 100 - overallPercentage * 0.25);
      }

      const recommendations = this.generateBudgetRecommendations(categoryBreakdown, overallPercentage);

      return {
        overallScore: Math.round(overallScore),
        status,
        totalBudget,
        totalSpent,
        remainingBudget,
        categoryBreakdown,
        recommendations,
        alerts
      };
    } catch (error) {
      console.error('Error getting budget health:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to get budget health', 'UNKNOWN_ERROR');
    }
  }

  // Receipt Processing
  async processReceiptOCR(file: File): Promise<ReceiptData> {
    try {
      if (!this.GOOGLE_VISION_API_KEY) {
        throw new ReceiptProcessingError('Google Vision API key not configured');
      }

      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      
      // Call Google Vision API
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.GOOGLE_VISION_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: {
              content: base64.split(',')[1] // Remove data:image/jpeg;base64, prefix
            },
            features: [{
              type: 'TEXT_DETECTION',
              maxResults: 1
            }]
          }]
        })
      });

      if (!response.ok) {
        throw new ReceiptProcessingError('Google Vision API request failed', { status: response.status });
      }

      const result = await response.json();
      
      if (result.responses[0].error) {
        throw new ReceiptProcessingError('Google Vision API error', { error: result.responses[0].error });
      }

      const ocrText = result.responses[0].fullTextAnnotation?.text || '';
      
      // Parse the OCR text to extract receipt data
      const receiptData = this.parseReceiptText(ocrText);
      
      return receiptData;
    } catch (error) {
      console.error('Error processing receipt OCR:', error);
      
      // Fallback to manual entry
      return {
        store: 'Unknown',
        items: [],
        total: 0,
        date: new Date(),
        confidence: 0,
        requiresManualInput: true
      };
    }
  }

  async saveReceipt(receipt: Omit<UKStudentReceipt, 'id' | 'createdAt' | 'updatedAt'>): Promise<UKStudentReceipt> {
    try {
      const { data, error } = await supabase
        .from('uk_student_receipts')
        .insert([{
          user_id: receipt.userId,
          expense_id: receipt.expenseId,
          image_url: receipt.imageUrl,
          ocr_text: receipt.ocrText,
          parsed_data: receipt.parsedData,
          confidence_score: receipt.confidenceScore,
          processing_status: receipt.processingStatus,
          error_message: receipt.errorMessage,
          requires_manual_review: receipt.requiresManualReview
        }])
        .select()
        .single();

      if (error) throw new UKFinanceError('Failed to save receipt', 'DATABASE_ERROR', { error });

      return this.mapDatabaseReceiptToType(data);
    } catch (error) {
      console.error('Error saving receipt:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to save receipt', 'UNKNOWN_ERROR');
    }
  }

  async getReceipts(userId: string): Promise<UKStudentReceipt[]> {
    try {
      const { data, error } = await supabase
        .from('uk_student_receipts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw new UKFinanceError('Failed to get receipts', 'DATABASE_ERROR', { error });

      return data.map(this.mapDatabaseReceiptToType);
    } catch (error) {
      console.error('Error getting receipts:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to get receipts', 'UNKNOWN_ERROR');
    }
  }

  // Price Comparison and Overpaying Detection
  async checkForOverpaying(expense: UKStudentExpense): Promise<OverpayingAlert | null> {
    try {
      // Extract item name from description (simple heuristic)
      const itemName = this.extractItemName(expense.description);
      if (!itemName) return null;

      const { data, error } = await supabase
        .from('uk_student_price_references')
        .select('*')
        .ilike('item_name', `%${itemName}%`)
        .limit(1)
        .single();

      if (error || !data) return null;

      const priceRef = this.mapDatabasePriceReferenceToType(data);
      const overpaidAmount = expense.amount - priceRef.averagePrice;
      const overpaidPercentage = (overpaidAmount / priceRef.averagePrice) * 100;

      if (overpaidPercentage > this.OVERPAYING_THRESHOLD * 100) {
        return {
          itemName: priceRef.itemName,
          paidPrice: expense.amount,
          averagePrice: priceRef.averagePrice,
          overpaidAmount,
          overpaidPercentage,
          suggestion: `You paid £${expense.amount.toFixed(2)} for ${priceRef.itemName}, but the average price is £${priceRef.averagePrice.toFixed(2)}. Consider shopping at budget stores like Aldi for better prices.`
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking for overpaying:', error);
      return null;
    }
  }

  async getPriceReferences(category?: string): Promise<PriceReference[]> {
    try {
      let query = supabase
        .from('uk_student_price_references')
        .select('*')
        .order('item_name');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw new UKFinanceError('Failed to get price references', 'DATABASE_ERROR', { error });

      return data.map(this.mapDatabasePriceReferenceToType);
    } catch (error) {
      console.error('Error getting price references:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to get price references', 'UNKNOWN_ERROR');
    }
  }

  // Bank Account Integration
  async addBankAccount(account: Omit<UKBankAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<UKBankAccount> {
    try {
      const { data, error } = await supabase
        .from('uk_student_bank_accounts')
        .insert([{
          user_id: account.userId,
          account_name: account.accountName,
          bank_type: account.bankType,
          account_number_hash: account.accountNumberHash,
          sort_code_hash: account.sortCodeHash,
          balance: account.balance,
          currency: account.currency,
          last_sync: account.lastSync?.toISOString(),
          is_active: account.isActive,
          sync_enabled: account.syncEnabled
        }])
        .select()
        .single();

      if (error) throw new UKFinanceError('Failed to add bank account', 'DATABASE_ERROR', { error });

      return this.mapDatabaseBankAccountToType(data);
    } catch (error) {
      console.error('Error adding bank account:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to add bank account', 'UNKNOWN_ERROR');
    }
  }

  async updateBankAccount(id: string, updates: Partial<UKBankAccount>): Promise<UKBankAccount> {
    try {
      const updateData: any = {};
      
      if (updates.accountName !== undefined) updateData.account_name = updates.accountName;
      if (updates.balance !== undefined) updateData.balance = updates.balance;
      if (updates.lastSync !== undefined) updateData.last_sync = updates.lastSync.toISOString();
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.syncEnabled !== undefined) updateData.sync_enabled = updates.syncEnabled;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('uk_student_bank_accounts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new UKFinanceError('Failed to update bank account', 'DATABASE_ERROR', { error });

      return this.mapDatabaseBankAccountToType(data);
    } catch (error) {
      console.error('Error updating bank account:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to update bank account', 'UNKNOWN_ERROR');
    }
  }

  async deleteBankAccount(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('uk_student_bank_accounts')
        .delete()
        .eq('id', id);

      if (error) throw new UKFinanceError('Failed to delete bank account', 'DATABASE_ERROR', { error });
    } catch (error) {
      console.error('Error deleting bank account:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to delete bank account', 'UNKNOWN_ERROR');
    }
  }

  async getBankAccounts(userId: string): Promise<UKBankAccount[]> {
    try {
      const { data, error } = await supabase
        .from('uk_student_bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('account_name');

      if (error) throw new UKFinanceError('Failed to get bank accounts', 'DATABASE_ERROR', { error });

      return data.map(this.mapDatabaseBankAccountToType);
    } catch (error) {
      console.error('Error getting bank accounts:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to get bank accounts', 'UNKNOWN_ERROR');
    }
  }

  async parseUKBankStatement(file: File, bankType: UKBankType): Promise<Transaction[]> {
    try {
      const text = await file.text();
      
      switch (bankType) {
        case 'monzo':
          return this.parseMonzoStatement(text);
        case 'iq-prepaid':
          return this.parseIQPrepaidStatement(text);
        case 'icici-uk':
          return this.parseICICIUKStatement(text);
        default:
          return this.parseGenericStatement(text);
      }
    } catch (error) {
      console.error('Error parsing bank statement:', error);
      throw new UKFinanceError('Failed to parse bank statement', 'PARSING_ERROR', { bankType });
    }
  }

  // Analytics and Insights
  async generateSpendingInsights(userId: string): Promise<SpendingInsight[]> {
    try {
      const insights: SpendingInsight[] = [];
      
      // Get recent expenses for analysis
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const expenses = await this.getExpenses(userId, {
        startDate: thirtyDaysAgo,
        endDate: new Date()
      });

      // Generate weekly summary
      const weeklySpending = expenses
        .filter(e => {
          const expenseDate = new Date(e.transactionDate);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return expenseDate >= weekAgo;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      insights.push({
        id: `weekly-summary-${Date.now()}`,
        userId,
        insightType: 'weekly_summary',
        title: 'Weekly Spending Summary',
        description: `You spent £${weeklySpending.toFixed(2)} this week`,
        data: { amount: weeklySpending, period: 'week' },
        priority: 3,
        isActionable: false,
        actionTaken: false,
        createdAt: new Date()
      });

      // Generate category trends
      const categorySpending = expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);

      const topCategory = Object.entries(categorySpending)
        .sort(([,a], [,b]) => b - a)[0];

      if (topCategory) {
        insights.push({
          id: `category-trend-${Date.now()}`,
          userId,
          insightType: 'category_trend',
          title: `Top Spending Category: ${topCategory[0]}`,
          description: `You spent £${topCategory[1].toFixed(2)} on ${topCategory[0]} this month`,
          data: { category: topCategory[0], amount: topCategory[1] },
          priority: 4,
          isActionable: true,
          actionTaken: false,
          createdAt: new Date()
        });
      }

      // Generate savings opportunities
      const savingsOpportunities = await this.identifySavingsOpportunities(expenses);
      for (const opportunity of savingsOpportunities) {
        insights.push({
          id: `savings-${Date.now()}-${Math.random()}`,
          userId,
          insightType: 'savings_opportunity',
          title: opportunity.title,
          description: opportunity.description,
          data: { 
            potentialSavings: opportunity.potentialSavings,
            effort: opportunity.effort,
            type: opportunity.type
          },
          priority: 5,
          isActionable: opportunity.actionable,
          actionTaken: false,
          createdAt: new Date()
        });
      }

      return insights;
    } catch (error) {
      console.error('Error generating spending insights:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to generate insights', 'UNKNOWN_ERROR');
    }
  }

  async getSpendingAnalytics(userId: string, period: AnalyticsPeriod): Promise<SpendingAnalytics> {
    try {
      const expenses = await this.getExpenses(userId, {
        startDate: period.startDate,
        endDate: period.endDate
      });

      const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
      const daysDiff = Math.ceil((period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const averageDaily = totalSpent / daysDiff;
      const averageWeekly = averageDaily * 7;

      // Category breakdown
      const categoryBreakdown = expenses.reduce((acc, expense) => {
        acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);

      // Store breakdown
      const storeBreakdown = expenses.reduce((acc, expense) => {
        if (expense.store) {
          acc[expense.store] = (acc[expense.store] || 0) + expense.amount;
        }
        return acc;
      }, {} as Record<string, number>);

      // Payment method breakdown
      const paymentMethodBreakdown = expenses.reduce((acc, expense) => {
        acc[expense.paymentMethod] = (acc[expense.paymentMethod] || 0) + expense.amount;
        return acc;
      }, {} as Record<string, number>);

      // Trend data
      const trendData = this.generateTrendData(expenses, period);

      // Top expenses
      const topExpenses = expenses
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      // Savings opportunities
      const savingsOpportunities = await this.identifySavingsOpportunities(expenses);

      return {
        totalSpent,
        averageDaily,
        averageWeekly,
        categoryBreakdown,
        storeBreakdown,
        paymentMethodBreakdown,
        trendData,
        topExpenses,
        savingsOpportunities
      };
    } catch (error) {
      console.error('Error getting spending analytics:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to get analytics', 'UNKNOWN_ERROR');
    }
  }

  // Alerts
  async getBudgetAlerts(userId: string, unreadOnly = false): Promise<BudgetAlert[]> {
    try {
      let query = supabase
        .from('uk_student_budget_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;

      if (error) throw new UKFinanceError('Failed to get budget alerts', 'DATABASE_ERROR', { error });

      return data.map(this.mapDatabaseAlertToType);
    } catch (error) {
      console.error('Error getting budget alerts:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to get budget alerts', 'UNKNOWN_ERROR');
    }
  }

  async markAlertAsRead(alertId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('uk_student_budget_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw new UKFinanceError('Failed to mark alert as read', 'DATABASE_ERROR', { error });
    } catch (error) {
      console.error('Error marking alert as read:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to mark alert as read', 'UNKNOWN_ERROR');
    }
  }

  async dismissAlert(alertId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('uk_student_budget_alerts')
        .update({ is_dismissed: true, is_read: true })
        .eq('id', alertId);

      if (error) throw new UKFinanceError('Failed to dismiss alert', 'DATABASE_ERROR', { error });
    } catch (error) {
      console.error('Error dismissing alert:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to dismiss alert', 'UNKNOWN_ERROR');
    }
  }

  // Categories and Templates
  async getBudgetTemplates(): Promise<BudgetTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('uk_student_budget_templates')
        .select('*')
        .order('is_essential', { ascending: false })
        .order('category');

      if (error) throw new UKFinanceError('Failed to get budget templates', 'DATABASE_ERROR', { error });

      return data.map(this.mapDatabaseBudgetTemplateToType);
    } catch (error) {
      console.error('Error getting budget templates:', error);
      throw error instanceof UKFinanceError ? error : new UKFinanceError('Failed to get budget templates', 'UNKNOWN_ERROR');
    }
  }

  async categorizeExpense(description: string, store?: string): Promise<string> {
    try {
      const lowerDesc = description.toLowerCase();
      const lowerStore = store?.toLowerCase() || '';

      // Store-based categorization
      if (lowerStore.includes('aldi') || lowerStore.includes('tesco') || 
          lowerStore.includes('sainsbury') || lowerStore.includes('asda') ||
          lowerStore.includes('superstore')) {
        return 'groceries';
      }

      if (lowerStore.includes('mcdonald') || lowerStore.includes('kfc') ||
          lowerStore.includes('subway') || lowerStore.includes('pizza') ||
          lowerStore.includes('restaurant') || lowerStore.includes('cafe')) {
        return 'food_out';
      }

      if (lowerStore.includes('gym') || lowerStore.includes('fitness') ||
          lowerStore.includes('sport')) {
        return 'fitness';
      }

      // Description-based categorization
      if (lowerDesc.includes('train') || lowerDesc.includes('bus') ||
          lowerDesc.includes('transport') || lowerDesc.includes('travel') ||
          lowerDesc.includes('fuel') || lowerDesc.includes('petrol')) {
        return 'transport';
      }

      if (lowerDesc.includes('electric') || lowerDesc.includes('gas') ||
          lowerDesc.includes('water') || lowerDesc.includes('internet') ||
          lowerDesc.includes('phone') || lowerDesc.includes('utility')) {
        return 'utilities';
      }

      if (lowerDesc.includes('book') || lowerDesc.includes('stationery') ||
          lowerDesc.includes('course') || lowerDesc.includes('education') ||
          lowerDesc.includes('university')) {
        return 'education';
      }

      if (lowerDesc.includes('cinema') || lowerDesc.includes('netflix') ||
          lowerDesc.includes('spotify') || lowerDesc.includes('game') ||
          lowerDesc.includes('entertainment')) {
        return 'entertainment';
      }

      if (lowerDesc.includes('shampoo') || lowerDesc.includes('soap') ||
          lowerDesc.includes('toothpaste') || lowerDesc.includes('skincare') ||
          lowerDesc.includes('personal')) {
        return 'personal_care';
      }

      if (lowerDesc.includes('cleaning') || lowerDesc.includes('detergent') ||
          lowerDesc.includes('household') || lowerDesc.includes('toilet paper')) {
        return 'household';
      }

      // Default category
      return 'other';
    } catch (error) {
      console.error('Error categorizing expense:', error);
      return 'other';
    }
  }

  // Private helper methods
  private validateExpenseData(expense: Omit<UKStudentExpense, 'id' | 'createdAt' | 'updatedAt'>): ValidationResult {
    if (!expense.amount || expense.amount <= 0) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }

    if (expense.amount > 10000) {
      return { valid: false, error: 'Amount seems unusually high (>£10,000)' };
    }

    if (!expense.description || expense.description.trim().length === 0) {
      return { valid: false, error: 'Description is required' };
    }

    if (!expense.transactionDate) {
      return { valid: false, error: 'Transaction date is required' };
    }

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    if (expense.transactionDate > futureDate) {
      return { valid: false, error: 'Transaction date cannot be in the future' };
    }

    return { valid: true };
  }

  private validateBudgetData(budget: Omit<UKStudentBudget, 'id' | 'currentSpent' | 'createdAt' | 'updatedAt'>): ValidationResult {
    if (!budget.limitAmount || budget.limitAmount <= 0) {
      return { valid: false, error: 'Budget limit must be greater than 0' };
    }

    if (!budget.category || budget.category.trim().length === 0) {
      return { valid: false, error: 'Budget category is required' };
    }

    if (!budget.periodStart || !budget.periodEnd) {
      return { valid: false, error: 'Budget period start and end dates are required' };
    }

    if (budget.periodStart >= budget.periodEnd) {
      return { valid: false, error: 'Budget period start must be before end date' };
    }

    if (budget.alertThreshold < 0 || budget.alertThreshold > 1) {
      return { valid: false, error: 'Alert threshold must be between 0 and 1' };
    }

    return { valid: true };
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  private parseReceiptText(ocrText: string): ReceiptData {
    const lines = ocrText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let store = 'Unknown';
    let total = 0;
    let date = new Date();
    const items: ReceiptItem[] = [];
    let confidence = 0.5;

    // Extract store name (usually first few lines)
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('aldi') || line.includes('tesco') || line.includes('sainsbury') ||
          line.includes('asda') || line.includes('premier') || line.includes('spar')) {
        store = lines[i];
        confidence += 0.2;
        break;
      }
    }

    // Extract total (look for patterns like "TOTAL £12.34" or "£12.34")
    for (const line of lines) {
      const totalMatch = line.match(/(?:total|sum|amount)?\s*£?(\d+\.?\d*)/i);
      if (totalMatch && line.toLowerCase().includes('total')) {
        total = parseFloat(totalMatch[1]);
        confidence += 0.2;
        break;
      }
    }

    // Extract date (look for date patterns)
    for (const line of lines) {
      const dateMatch = line.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1; // JS months are 0-indexed
        const year = parseInt(dateMatch[3]);
        const fullYear = year < 100 ? 2000 + year : year;
        date = new Date(fullYear, month, day);
        confidence += 0.1;
        break;
      }
    }

    // Extract items (simple heuristic - lines with prices)
    for (const line of lines) {
      const itemMatch = line.match(/(.+?)\s+£?(\d+\.?\d*)/);
      if (itemMatch && !line.toLowerCase().includes('total') && !line.toLowerCase().includes('change')) {
        const itemName = itemMatch[1].trim();
        const price = parseFloat(itemMatch[2]);
        
        if (itemName.length > 2 && price > 0 && price < 1000) {
          items.push({
            name: itemName,
            quantity: 1,
            unitPrice: price,
            totalPrice: price
          });
        }
      }
    }

    return {
      store,
      items,
      total,
      date,
      confidence: Math.min(1, confidence)
    };
  }

  private extractItemName(description: string): string | null {
    // Simple heuristic to extract item name from expense description
    const cleaned = description.toLowerCase().trim();
    
    // Remove common prefixes
    const prefixes = ['bought', 'purchased', 'paid for', 'got'];
    let itemName = cleaned;
    
    for (const prefix of prefixes) {
      if (itemName.startsWith(prefix)) {
        itemName = itemName.substring(prefix.length).trim();
        break;
      }
    }

    // Extract first meaningful word(s)
    const words = itemName.split(' ').filter(word => word.length > 2);
    if (words.length === 0) return null;
    
    // Return first 1-2 words as item name
    return words.slice(0, 2).join(' ');
  }

  private async createOverpayingAlert(userId: string, alert: OverpayingAlert): Promise<void> {
    try {
      await supabase
        .from('uk_student_budget_alerts')
        .insert([{
          user_id: userId,
          budget_id: null,
          alert_type: 'overpaying_detected',
          message: alert.suggestion,
          severity: 'warning',
          metadata: {
            itemName: alert.itemName,
            paidPrice: alert.paidPrice,
            averagePrice: alert.averagePrice,
            overpaidAmount: alert.overpaidAmount,
            overpaidPercentage: alert.overpaidPercentage
          }
        }]);
    } catch (error) {
      console.error('Error creating overpaying alert:', error);
    }
  }

  private generateBudgetRecommendations(categoryBreakdown: CategorySpending[], overallPercentage: number): string[] {
    const recommendations: string[] = [];

    if (overallPercentage >= 100) {
      recommendations.push('You have exceeded your overall budget. Consider reviewing your spending habits.');
    } else if (overallPercentage >= 80) {
      recommendations.push('You are approaching your budget limit. Monitor your spending closely.');
    }

    // Category-specific recommendations
    const overCategories = categoryBreakdown.filter(c => c.status === 'over');
    const nearCategories = categoryBreakdown.filter(c => c.status === 'near');

    for (const category of overCategories) {
      recommendations.push(`You have overspent in ${category.category}. Consider reducing expenses in this category.`);
    }

    for (const category of nearCategories) {
      recommendations.push(`You are close to your ${category.category} budget limit. Be mindful of upcoming expenses.`);
    }

    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Your budget is on track. Keep up the good spending habits!');
    }

    return recommendations;
  }

  private async identifySavingsOpportunities(expenses: UKStudentExpense[]): Promise<SavingsOpportunity[]> {
    const opportunities: SavingsOpportunity[] = [];

    // Analyze store spending patterns
    const storeSpending = expenses.reduce((acc, expense) => {
      if (expense.store) {
        acc[expense.store] = (acc[expense.store] || 0) + expense.amount;
      }
      return acc;
    }, {} as Record<string, number>);

    // Suggest switching to budget stores
    const expensiveStores = Object.entries(storeSpending)
      .filter(([store, amount]) => amount > 50 && !store.toLowerCase().includes('aldi'))
      .sort(([,a], [,b]) => b - a);

    if (expensiveStores.length > 0) {
      const [topStore, amount] = expensiveStores[0];
      opportunities.push({
        type: 'store_comparison',
        title: 'Switch to Budget Stores',
        description: `You spent £${amount.toFixed(2)} at ${topStore}. Shopping at Aldi could save you 20-30%.`,
        potentialSavings: amount * 0.25,
        effort: 'low',
        actionable: true
      });
    }

    // Analyze frequent small purchases
    const smallExpenses = expenses.filter(e => e.amount < 5 && e.category === 'food_out');
    if (smallExpenses.length > 10) {
      const totalSmall = smallExpenses.reduce((sum, e) => sum + e.amount, 0);
      opportunities.push({
        type: 'alternative',
        title: 'Reduce Small Food Purchases',
        description: `You made ${smallExpenses.length} small food purchases totaling £${totalSmall.toFixed(2)}. Meal prep could save money.`,
        potentialSavings: totalSmall * 0.6,
        effort: 'medium',
        actionable: true
      });
    }

    return opportunities;
  }  private
 generateTrendData(expenses: UKStudentExpense[], period: AnalyticsPeriod): TrendDataPoint[] {
    const trendData: TrendDataPoint[] = [];
    
    // Group expenses by the specified period
    const groupedExpenses = expenses.reduce((acc, expense) => {
      let key: string;
      const expenseDate = new Date(expense.transactionDate);
      
      switch (period.groupBy) {
        case 'day':
          key = expenseDate.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(expenseDate);
          weekStart.setDate(expenseDate.getDate() - expenseDate.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = expenseDate.toISOString().split('T')[0];
      }
      
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(expense);
      return acc;
    }, {} as Record<string, UKStudentExpense[]>);

    // Convert to trend data points
    for (const [dateKey, dayExpenses] of Object.entries(groupedExpenses)) {
      const totalAmount = dayExpenses.reduce((sum, e) => sum + e.amount, 0);
      trendData.push({
        date: new Date(dateKey),
        amount: totalAmount
      });
    }

    return trendData.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // Bank statement parsers
  private parseMonzoStatement(text: string): Transaction[] {
    const lines = text.split('\n').slice(1); // Skip header
    const transactions: Transaction[] = [];

    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length >= 4) {
        try {
          transactions.push({
            date: new Date(parts[0]),
            description: parts[1],
            amount: Math.abs(parseFloat(parts[2])),
            balance: parseFloat(parts[3]),
            category: parts[4] || undefined
          });
        } catch (error) {
          console.warn('Failed to parse Monzo transaction line:', line);
        }
      }
    }

    return transactions;
  }

  private parseIQPrepaidStatement(text: string): Transaction[] {
    // IQ Prepaid specific parsing logic
    const lines = text.split('\n');
    const transactions: Transaction[] = [];

    for (const line of lines) {
      // Implement IQ Prepaid specific parsing
      // This would need to be customized based on their actual format
      const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
      const amountMatch = line.match(/£(\d+\.?\d*)/);
      
      if (dateMatch && amountMatch) {
        try {
          transactions.push({
            date: new Date(dateMatch[1]),
            description: line.replace(dateMatch[0], '').replace(`£${amountMatch[1]}`, '').trim(),
            amount: parseFloat(amountMatch[1])
          });
        } catch (error) {
          console.warn('Failed to parse IQ Prepaid transaction line:', line);
        }
      }
    }

    return transactions;
  }

  private parseICICIUKStatement(text: string): Transaction[] {
    // ICICI UK specific parsing logic
    const lines = text.split('\n');
    const transactions: Transaction[] = [];

    for (const line of lines) {
      // Implement ICICI UK specific parsing
      // This would need to be customized based on their actual format
      const parts = line.split('\t'); // Assuming tab-separated
      if (parts.length >= 3) {
        try {
          transactions.push({
            date: new Date(parts[0]),
            description: parts[1],
            amount: Math.abs(parseFloat(parts[2]))
          });
        } catch (error) {
          console.warn('Failed to parse ICICI UK transaction line:', line);
        }
      }
    }

    return transactions;
  }

  private parseGenericStatement(text: string): Transaction[] {
    // Generic CSV parsing
    const lines = text.split('\n').slice(1); // Skip header
    const transactions: Transaction[] = [];

    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length >= 3) {
        try {
          transactions.push({
            date: new Date(parts[0]),
            description: parts[1],
            amount: Math.abs(parseFloat(parts[2]))
          });
        } catch (error) {
          console.warn('Failed to parse generic transaction line:', line);
        }
      }
    }

    return transactions;
  }

  // Database mapping functions
  private mapDatabaseExpenseToType(data: any): UKStudentExpense {
    return {
      id: data.id,
      userId: data.user_id,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      category: data.category,
      subcategory: data.subcategory,
      store: data.store,
      location: data.location,
      paymentMethod: data.payment_method,
      receiptData: data.receipt_data,
      transactionDate: new Date(data.transaction_date),
      isRecurring: data.is_recurring,
      recurringFrequency: data.recurring_frequency,
      tags: data.tags || [],
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapDatabaseBudgetToType(data: any): UKStudentBudget {
    return {
      id: data.id,
      userId: data.user_id,
      category: data.category,
      budgetType: data.budget_type,
      limitAmount: data.limit_amount,
      currentSpent: data.current_spent,
      periodStart: new Date(data.period_start),
      periodEnd: new Date(data.period_end),
      alertThreshold: data.alert_threshold,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapDatabaseBankAccountToType(data: any): UKBankAccount {
    return {
      id: data.id,
      userId: data.user_id,
      accountName: data.account_name,
      bankType: data.bank_type,
      accountNumberHash: data.account_number_hash,
      sortCodeHash: data.sort_code_hash,
      balance: data.balance,
      currency: data.currency,
      lastSync: data.last_sync ? new Date(data.last_sync) : undefined,
      isActive: data.is_active,
      syncEnabled: data.sync_enabled,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapDatabaseReceiptToType(data: any): UKStudentReceipt {
    return {
      id: data.id,
      userId: data.user_id,
      expenseId: data.expense_id,
      imageUrl: data.image_url,
      ocrText: data.ocr_text,
      parsedData: data.parsed_data,
      confidenceScore: data.confidence_score,
      processingStatus: data.processing_status,
      errorMessage: data.error_message,
      requiresManualReview: data.requires_manual_review,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapDatabasePriceReferenceToType(data: any): PriceReference {
    return {
      id: data.id,
      itemName: data.item_name,
      category: data.category,
      averagePrice: data.average_price,
      priceRangeMin: data.price_range_min,
      priceRangeMax: data.price_range_max,
      storeType: data.store_type,
      location: data.location,
      lastUpdated: new Date(data.last_updated),
      dataSource: data.data_source,
      sampleSize: data.sample_size,
      createdAt: new Date(data.created_at)
    };
  }

  private mapDatabaseAlertToType(data: any): BudgetAlert {
    return {
      id: data.id,
      userId: data.user_id,
      budgetId: data.budget_id,
      alertType: data.alert_type,
      message: data.message,
      severity: data.severity,
      isRead: data.is_read,
      isDismissed: data.is_dismissed,
      metadata: data.metadata,
      createdAt: new Date(data.created_at)
    };
  }

  private mapDatabaseBudgetTemplateToType(data: any): BudgetTemplate {
    return {
      id: data.id,
      category: data.category,
      suggestedWeeklyAmount: data.suggested_weekly_amount,
      suggestedMonthlyAmount: data.suggested_monthly_amount,
      description: data.description,
      isEssential: data.is_essential,
      createdAt: new Date(data.created_at)
    };
  }
}

// Export singleton instance
export const ukFinanceService = new UKFinanceService();