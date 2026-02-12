// TypeScript interfaces for UK Student Financial System

export type UKBankType = 'monzo' | 'iq-prepaid' | 'icici-uk' | 'other';
export type PaymentMethod = 'monzo' | 'iq-prepaid' | 'icici-uk' | 'cash' | 'card' | 'other';
export type BudgetType = 'weekly' | 'monthly' | 'yearly';
export type AlertType = 'threshold_reached' | 'budget_exceeded' | 'unusual_spending' | 'overpaying_detected';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type ReceiptProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type InsightType = 'weekly_summary' | 'monthly_summary' | 'category_trend' | 'savings_opportunity' | 'spending_pattern';

export interface UKStudentExpense {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  subcategory?: string;
  store?: string;
  location?: string;
  paymentMethod: PaymentMethod;
  receiptData?: ReceiptData;
  transactionDate: Date;
  isRecurring: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UKStudentBudget {
  id: string;
  userId: string;
  category: string;
  budgetType: BudgetType;
  limitAmount: number;
  currentSpent: number;
  periodStart: Date;
  periodEnd: Date;
  alertThreshold: number; // 0-1, e.g., 0.8 for 80%
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UKBankAccount {
  id: string;
  userId: string;
  accountName: string;
  bankType: UKBankType;
  accountNumberHash?: string;
  sortCodeHash?: string;
  balance: number;
  currency: string;
  lastSync?: Date;
  isActive: boolean;
  syncEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceiptData {
  store: string;
  items: ReceiptItem[];
  total: number;
  date: Date;
  confidence: number;
  requiresManualInput?: boolean;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string;
}

export interface UKStudentReceipt {
  id: string;
  userId: string;
  expenseId: string;
  imageUrl?: string;
  ocrText?: string;
  parsedData?: ReceiptData;
  confidenceScore?: number;
  processingStatus: ReceiptProcessingStatus;
  errorMessage?: string;
  requiresManualReview: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceReference {
  id: string;
  itemName: string;
  category: string;
  averagePrice: number;
  priceRangeMin: number;
  priceRangeMax: number;
  storeType?: 'budget' | 'mid' | 'premium';
  location: string;
  lastUpdated: Date;
  dataSource: 'manual' | 'scraped' | 'user-reported';
  sampleSize: number;
  createdAt: Date;
}

export interface BudgetAlert {
  id: string;
  userId: string;
  budgetId: string;
  alertType: AlertType;
  message: string;
  severity: AlertSeverity;
  isRead: boolean;
  isDismissed: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface SpendingInsight {
  id: string;
  userId: string;
  insightType: InsightType;
  title: string;
  description: string;
  data: Record<string, any>;
  priority: number; // 1-5
  isActionable: boolean;
  actionTaken: boolean;
  validUntil?: Date;
  createdAt: Date;
}

export interface BudgetTemplate {
  id: string;
  category: string;
  suggestedWeeklyAmount: number;
  suggestedMonthlyAmount: number;
  description: string;
  isEssential: boolean;
  createdAt: Date;
}

// Service interfaces
export interface UKFinanceServiceInterface {
  // Expense management
  addExpense(expense: Omit<UKStudentExpense, 'id' | 'createdAt' | 'updatedAt'>): Promise<UKStudentExpense>;
  updateExpense(id: string, updates: Partial<UKStudentExpense>): Promise<UKStudentExpense>;
  deleteExpense(id: string): Promise<void>;
  getExpenses(userId: string, filters?: ExpenseFilters): Promise<UKStudentExpense[]>;
  
  // Budget management
  createBudget(budget: Omit<UKStudentBudget, 'id' | 'currentSpent' | 'createdAt' | 'updatedAt'>): Promise<UKStudentBudget>;
  updateBudget(id: string, updates: Partial<UKStudentBudget>): Promise<UKStudentBudget>;
  deleteBudget(id: string): Promise<void>;
  getBudgets(userId: string): Promise<UKStudentBudget[]>;
  getBudgetHealth(userId: string): Promise<BudgetHealth>;
  
  // Bank account integration
  addBankAccount(account: Omit<UKBankAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<UKBankAccount>;
  updateBankAccount(id: string, updates: Partial<UKBankAccount>): Promise<UKBankAccount>;
  deleteBankAccount(id: string): Promise<void>;
  getBankAccounts(userId: string): Promise<UKBankAccount[]>;
  parseUKBankStatement(file: File, bankType: UKBankType): Promise<Transaction[]>;
  
  // Receipt processing
  processReceiptOCR(file: File): Promise<ReceiptData>;
  saveReceipt(receipt: Omit<UKStudentReceipt, 'id' | 'createdAt' | 'updatedAt'>): Promise<UKStudentReceipt>;
  getReceipts(userId: string): Promise<UKStudentReceipt[]>;
  
  // Price comparison and overpaying detection
  checkForOverpaying(expense: UKStudentExpense): Promise<OverpayingAlert | null>;
  getPriceReferences(category?: string): Promise<PriceReference[]>;
  
  // Analytics and insights
  generateSpendingInsights(userId: string): Promise<SpendingInsight[]>;
  getSpendingAnalytics(userId: string, period: AnalyticsPeriod): Promise<SpendingAnalytics>;
  
  // Alerts
  getBudgetAlerts(userId: string, unreadOnly?: boolean): Promise<BudgetAlert[]>;
  markAlertAsRead(alertId: string): Promise<void>;
  dismissAlert(alertId: string): Promise<void>;
  
  // Categories and templates
  getBudgetTemplates(): Promise<BudgetTemplate[]>;
  categorizeExpense(description: string, store?: string): Promise<string>;
}

export interface ExpenseFilters {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  store?: string;
  paymentMethod?: PaymentMethod;
  minAmount?: number;
  maxAmount?: number;
  tags?: string[];
}

export interface Transaction {
  date: Date;
  description: string;
  amount: number;
  balance?: number;
  category?: string;
  reference?: string;
}

export interface BudgetHealth {
  overallScore: number; // 0-100
  status: 'good' | 'warning' | 'critical';
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  categoryBreakdown: CategorySpending[];
  recommendations: string[];
  alerts: BudgetAlert[];
}

export interface CategorySpending {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'under' | 'near' | 'over';
}

export interface OverpayingAlert {
  itemName: string;
  paidPrice: number;
  averagePrice: number;
  overpaidAmount: number;
  overpaidPercentage: number;
  suggestion: string;
}

export interface AnalyticsPeriod {
  startDate: Date;
  endDate: Date;
  groupBy: 'day' | 'week' | 'month';
}

export interface SpendingAnalytics {
  totalSpent: number;
  averageDaily: number;
  averageWeekly: number;
  categoryBreakdown: Record<string, number>;
  storeBreakdown: Record<string, number>;
  paymentMethodBreakdown: Record<string, number>;
  trendData: TrendDataPoint[];
  topExpenses: UKStudentExpense[];
  savingsOpportunities: SavingsOpportunity[];
}

export interface TrendDataPoint {
  date: Date;
  amount: number;
  category?: string;
}

export interface SavingsOpportunity {
  type: 'store_comparison' | 'bulk_buying' | 'timing' | 'alternative';
  title: string;
  description: string;
  potentialSavings: number;
  effort: 'low' | 'medium' | 'high';
  actionable: boolean;
}

// Component props interfaces
export interface BudgetManagerProps {
  userId: string;
  budgets: UKStudentBudget[];
  expenses: UKStudentExpense[];
  budgetHealth: BudgetHealth;
  onBudgetUpdate: (budget: UKStudentBudget) => void;
  onExpenseAdd: (expense: UKStudentExpense) => void;
}

export interface ExpenseTrackerProps {
  userId: string;
  expenses: UKStudentExpense[];
  categories: string[];
  onExpenseAdd: (expense: UKStudentExpense) => void;
  onExpenseUpdate: (expense: UKStudentExpense) => void;
  onExpenseDelete: (expenseId: string) => void;
}

export interface ReceiptScannerProps {
  onReceiptProcessed: (receiptData: ReceiptData) => void;
  onError: (error: string) => void;
}

export interface SpendingAnalyticsProps {
  userId: string;
  analytics: SpendingAnalytics;
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
}

export interface BudgetAlertsProps {
  alerts: BudgetAlert[];
  onAlertRead: (alertId: string) => void;
  onAlertDismiss: (alertId: string) => void;
}

// Validation interfaces
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface ExpenseValidation {
  validateAmount(amount: number): ValidationResult;
  validateDescription(description: string): ValidationResult;
  validateCategory(category: string): ValidationResult;
  validateStore(store: string): ValidationResult;
  validateDate(date: Date): ValidationResult;
}

// Error types
export class UKFinanceError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'UKFinanceError';
  }
}

export class ReceiptProcessingError extends UKFinanceError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'RECEIPT_PROCESSING_ERROR', details);
    this.name = 'ReceiptProcessingError';
  }
}

export class BudgetValidationError extends UKFinanceError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'BUDGET_VALIDATION_ERROR', details);
    this.name = 'BudgetValidationError';
  }
}

export class BankIntegrationError extends UKFinanceError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'BANK_INTEGRATION_ERROR', details);
    this.name = 'BankIntegrationError';
  }
}