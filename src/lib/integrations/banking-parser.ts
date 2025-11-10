// src/lib/integrations/banking-parser.ts - UK Banking Smart Dump Parser
// Secure parsing for Monzo, Starling, Revolut, and traditional UK bank statements

import { createSupabaseClient } from '../supabase/client';

export interface BankTransaction {
  id: string;
  date: string;
  amount: number; // In pence (e.g., £10.50 = 1050)
  currency: string;
  description: string;
  reference?: string;
  category: TransactionCategory;
  subcategory?: string;
  merchant?: string;
  location?: string;
  confidence: number; // AI categorization confidence 0-1
  isRecurring: boolean;
  tags: string[];
  metadata: {
    rawDescription: string;
    bank: string;
    accountType: string;
    balance?: number;
    cardLast4?: string;
  };
}

export type TransactionCategory = 
  | 'groceries' | 'transport' | 'entertainment' | 'education' 
  | 'healthcare' | 'utilities' | 'rent' | 'income' | 'savings'
  | 'dining' | 'shopping' | 'subscriptions' | 'travel' | 'other';

export interface SpendingInsight {
  type: 'budget_alert' | 'spending_pattern' | 'savings_opportunity' | 'unusual_activity';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'alert';
  amount?: number;
  category?: TransactionCategory;
  actionItems: string[];
  timeframe: string;
  confidence: number;
}

export interface BudgetAnalysis {
  totalIncome: number;
  totalExpenses: number;
  netPosition: number;
  categoryBreakdown: Array<{
    category: TransactionCategory;
    amount: number;
    percentage: number;
    transactionCount: number;
    avgTransaction: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    income: number;
    expenses: number;
    topCategory: TransactionCategory;
  }>;
}

class BankingParser {
  private supabase = createSupabaseClient();

  // UK Bank patterns for different formats
  private bankPatterns = {
    monzo: {
      format: 'csv',
      headers: ['id', 'created', 'description', 'amount', 'currency', 'local_amount', 'local_currency', 'category', 'notes', 'address', 'receipt', 'attachments'],
      dateFormat: 'iso',
      amountField: 'amount',
      descriptionField: 'description'
    },
    starling: {
      format: 'csv',
      headers: ['Date', 'Counter Party', 'Reference', 'Type', 'Amount (GBP)', 'Balance (GBP)', 'Spending Category'],
      dateFormat: 'dd/mm/yyyy',
      amountField: 'Amount (GBP)',
      descriptionField: 'Counter Party'
    },
    revolut: {
      format: 'csv',
      headers: ['Type', 'Product', 'Started Date', 'Completed Date', 'Description', 'Amount', 'Fee', 'Currency', 'State', 'Balance'],
      dateFormat: 'yyyy-mm-dd',
      amountField: 'Amount',
      descriptionField: 'Description'
    },
    hsbc: {
      format: 'csv',
      headers: ['Date', 'Description', 'Amount', 'Balance'],
      dateFormat: 'dd/mm/yyyy',
      amountField: 'Amount',
      descriptionField: 'Description'
    },
    lloyds: {
      format: 'csv',
      headers: ['Transaction Date', 'Transaction Type', 'Sort Code', 'Account Number', 'Transaction Description', 'Debit Amount', 'Credit Amount', 'Balance'],
      dateFormat: 'dd/mm/yyyy',
      amountField: ['Debit Amount', 'Credit Amount'],
      descriptionField: 'Transaction Description'
    },
    natwest: {
      format: 'csv',
      headers: ['Date', 'Type', 'Description', 'Value', 'Balance', 'Account Name', 'Account Number'],
      dateFormat: 'dd/mm/yyyy',
      amountField: 'Value',
      descriptionField: 'Description'
    }
  };

  /**
   * Parse bank statement file and extract transactions
   */
  async parseStatementFile(
    file: File, 
    bankType: keyof typeof this.bankPatterns,
    userId: string
  ): Promise<{ success: boolean; transactions?: BankTransaction[]; error?: string }> {
    try {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.csv')) {
        return { success: false, error: 'Only CSV files are supported' };
      }

      // Read file content
      const fileContent = await this.readFileContent(file);
      const bankConfig = this.bankPatterns[bankType];

      // Parse CSV
      const rawTransactions = this.parseCSV(fileContent, bankConfig);
      
      // Process and categorize transactions
      const processedTransactions = await this.processTransactions(rawTransactions, bankType, userId);

      // Store transactions (keeping only insights, not raw sensitive data)
      await this.storeTransactionInsights(processedTransactions, userId);

      return { success: true, transactions: processedTransactions };
    } catch (error) {
      console.error('Error parsing statement file:', error);
      return { success: false, error: 'Failed to parse statement file' };
    }
  }

  /**
   * Read file content safely
   */
  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Parse CSV content based on bank format
   */
  private parseCSV(content: string, bankConfig: any): any[] {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    // Validate headers match expected format
    const expectedHeaders = bankConfig.headers;
    const headerMatch = expectedHeaders.every(expected => 
      headers.some(actual => actual.toLowerCase().includes(expected.toLowerCase()))
    );

    if (!headerMatch && bankConfig !== this.bankPatterns.monzo) {
      // Try to auto-detect bank type if headers don't match
      console.warn('Headers don\'t match expected format, attempting auto-detection');
    }

    // Parse data rows
    const transactions = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length >= headers.length - 2) { // Allow for minor variations
        const transaction: any = {};
        headers.forEach((header, index) => {
          if (values[index]) {
            transaction[header] = values[index].replace(/"/g, '').trim();
          }
        });
        transactions.push(transaction);
      }
    }

    return transactions;
  }

  /**
   * Parse CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  /**
   * Process raw transactions and add intelligent categorization
   */
  private async processTransactions(
    rawTransactions: any[], 
    bankType: keyof typeof this.bankPatterns,
    userId: string
  ): Promise<BankTransaction[]> {
    const processed: BankTransaction[] = [];
    const config = this.bankPatterns[bankType];

    for (const raw of rawTransactions) {
      try {
        // Extract amount
        const amount = this.extractAmount(raw, config);
        if (amount === null) continue;

        // Extract date
        const date = this.extractDate(raw, config);
        if (!date) continue;

        // Extract description
        const description = this.extractDescription(raw, config);
        
        // Generate unique ID (hash of key fields)
        const id = this.generateTransactionId(date, amount, description, bankType);

        // Categorize transaction
        const category = this.categorizeTransaction(description, amount);
        const subcategory = this.getSubcategory(description, category);
        const merchant = this.extractMerchant(description);
        const isRecurring = await this.detectRecurring(description, amount, userId);

        // Extract metadata
        const metadata = {
          rawDescription: description,
          bank: bankType,
          accountType: this.detectAccountType(raw),
          balance: this.extractBalance(raw, config),
          cardLast4: this.extractCardInfo(description)
        };

        const transaction: BankTransaction = {
          id,
          date: date.toISOString(),
          amount,
          currency: raw.currency || raw.Currency || 'GBP',
          description: this.cleanDescription(description),
          reference: raw.reference || raw.Reference,
          category,
          subcategory,
          merchant,
          confidence: this.calculateCategoryConfidence(description, category),
          isRecurring,
          tags: this.generateTags(description, category),
          metadata
        };

        processed.push(transaction);
      } catch (error) {
        console.warn('Error processing transaction:', error);
      }
    }

    return processed;
  }

  /**
   * Extract amount from transaction
   */
  private extractAmount(raw: any, config: any): number | null {
    try {
      let amountField = config.amountField;
      let amountStr = '';

      if (Array.isArray(amountField)) {
        // Handle debit/credit columns (e.g., Lloyds)
        const debit = raw[amountField[0]] || '';
        const credit = raw[amountField[1]] || '';
        amountStr = debit ? `-${debit}` : credit;
      } else {
        amountStr = raw[amountField] || '';
      }

      if (!amountStr) return null;

      // Clean amount string and convert to pence
      const cleanAmount = amountStr
        .replace(/[£$€,\s]/g, '')
        .replace(/\(([^)]+)\)/, '-$1'); // Handle negative amounts in parentheses

      const pounds = parseFloat(cleanAmount);
      return Math.round(pounds * 100); // Convert to pence
    } catch {
      return null;
    }
  }

  /**
   * Extract date from transaction
   */
  private extractDate(raw: any, config: any): Date | null {
    try {
      const dateFields = ['Date', 'created', 'Started Date', 'Completed Date', 'Transaction Date'];
      let dateStr = '';

      for (const field of dateFields) {
        if (raw[field]) {
          dateStr = raw[field];
          break;
        }
      }

      if (!dateStr) return null;

      // Handle different date formats
      if (config.dateFormat === 'iso') {
        return new Date(dateStr);
      } else if (config.dateFormat === 'dd/mm/yyyy') {
        const parts = dateStr.split('/');
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else if (config.dateFormat === 'yyyy-mm-dd') {
        return new Date(dateStr);
      }

      // Try auto-parsing
      return new Date(dateStr);
    } catch {
      return null;
    }
  }

  /**
   * Extract description from transaction
   */
  private extractDescription(raw: any, config: any): string {
    const descField = config.descriptionField;
    return raw[descField] || raw.Description || raw.description || 'Unknown transaction';
  }

  /**
   * Categorize transaction based on description and amount
   */
  private categorizeTransaction(description: string, amount: number): TransactionCategory {
    const desc = description.toLowerCase();

    // Income patterns
    if (amount > 0) {
      if (desc.includes('salary') || desc.includes('wage') || desc.includes('payroll')) {
        return 'income';
      }
      if (desc.includes('interest') || desc.includes('dividend') || desc.includes('cashback')) {
        return 'income';
      }
    }

    // Expense patterns
    const patterns: { [key in TransactionCategory]: string[] } = {
      groceries: ['tesco', 'sainsbury', 'asda', 'morrisons', 'lidl', 'aldi', 'waitrose', 'co-op', 'iceland', 'marks & spencer'],
      transport: ['tfl', 'uber', 'train', 'bus', 'parking', 'petrol', 'fuel', 'oyster', 'rail', 'taxi'],
      dining: ['restaurant', 'cafe', 'pub', 'mcdonald', 'kfc', 'pizza', 'takeaway', 'food', 'deliveroo', 'just eat'],
      entertainment: ['cinema', 'netflix', 'spotify', 'amazon prime', 'disney', 'theatre', 'concert', 'game'],
      education: ['university', 'college', 'school', 'course', 'tuition', 'book', 'academic', 'student'],
      healthcare: ['pharmacy', 'doctor', 'hospital', 'dental', 'medical', 'boots', 'nhs'],
      utilities: ['electric', 'gas', 'water', 'council tax', 'broadband', 'phone', 'internet', 'mobile'],
      rent: ['rent', 'mortgage', 'estate', 'letting', 'property', 'housing'],
      shopping: ['amazon', 'ebay', 'argos', 'john lewis', 'next', 'primark', 'h&m', 'zara'],
      subscriptions: ['subscription', 'monthly', 'annual', 'membership', 'premium'],
      savings: ['savings', 'investment', 'pension', 'isa', 'transfer'],
      travel: ['booking', 'hotel', 'flight', 'holiday', 'travel', 'airbnb'],
      income: ['salary', 'wage', 'payroll', 'benefits', 'refund', 'cashback'],
      other: []
    };

    // Match against patterns
    for (const [category, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => desc.includes(keyword))) {
        return category as TransactionCategory;
      }
    }

    // Default categorization based on amount
    if (amount > 0) return 'income';
    if (Math.abs(amount) > 50000) return 'rent'; // > £500
    return 'other';
  }

  /**
   * Get subcategory for transaction
   */
  private getSubcategory(description: string, category: TransactionCategory): string | undefined {
    const desc = description.toLowerCase();

    const subcategories: { [key in TransactionCategory]: { [key: string]: string[] } } = {
      groceries: {
        'supermarket': ['tesco', 'sainsbury', 'asda', 'morrisons'],
        'discount': ['lidl', 'aldi', 'iceland'],
        'premium': ['waitrose', 'marks & spencer']
      },
      transport: {
        'public': ['tfl', 'bus', 'train', 'rail', 'oyster'],
        'taxi': ['uber', 'taxi', 'cab'],
        'fuel': ['petrol', 'fuel', 'shell', 'bp']
      },
      dining: {
        'fast_food': ['mcdonald', 'kfc', 'subway', 'burger'],
        'delivery': ['deliveroo', 'just eat', 'uber eats'],
        'restaurant': ['restaurant', 'pub', 'cafe']
      },
      entertainment: { 'streaming': ['netflix', 'spotify', 'disney'], 'gaming': ['game', 'steam'], 'cinema': ['cinema', 'theatre'] },
      education: { 'tuition': ['tuition', 'course'], 'materials': ['book', 'supplies'], 'accommodation': ['student', 'halls'] },
      healthcare: { 'pharmacy': ['pharmacy', 'boots'], 'medical': ['doctor', 'hospital', 'dental'] },
      utilities: { 'energy': ['electric', 'gas'], 'water': ['water'], 'internet': ['broadband', 'internet'], 'mobile': ['mobile', 'phone'] },
      rent: { 'rent': ['rent', 'letting'], 'mortgage': ['mortgage'], 'council_tax': ['council tax'] },
      shopping: { 'online': ['amazon', 'ebay'], 'clothing': ['next', 'h&m', 'zara'], 'department': ['john lewis', 'argos'] },
      subscriptions: { 'software': ['adobe', 'microsoft'], 'media': ['netflix', 'spotify'], 'fitness': ['gym', 'fitness'] },
      savings: { 'investment': ['investment', 'stocks'], 'pension': ['pension'], 'isa': ['isa'] },
      travel: { 'accommodation': ['hotel', 'airbnb'], 'transport': ['flight', 'train'], 'booking': ['booking.com'] },
      income: { 'salary': ['salary', 'wage'], 'benefits': ['benefits', 'allowance'], 'other': ['refund', 'cashback'] },
      other: {}
    };

    const categorySubcats = subcategories[category] || {};
    for (const [subcat, keywords] of Object.entries(categorySubcats)) {
      if (keywords.some(keyword => desc.includes(keyword))) {
        return subcat;
      }
    }

    return undefined;
  }

  /**
   * Extract merchant name from description
   */
  private extractMerchant(description: string): string | undefined {
    // Remove common prefixes and suffixes
    let merchant = description
      .replace(/^(CARD PAYMENT TO|PAYMENT TO|DD|SO|TFR|POS)\s*/i, '')
      .replace(/\s*(LONDON|UK|GB)?\s*\d{2}\/\d{2}$/, '')
      .replace(/\s*\d{4}$/, '')
      .trim();

    // Extract merchant name before location/date info
    merchant = merchant.split(/\s+\d{2}\/\d{2}|\s+LONDON|\s+UK/)[0];
    
    return merchant.length > 2 ? merchant : undefined;
  }

  /**
   * Detect if transaction is recurring
   */
  private async detectRecurring(description: string, amount: number, userId: string): Promise<boolean> {
    try {
      // Look for similar transactions in the past
      const { data: similarTxns } = await this.supabase
        .from('bank_transaction_insights')
        .select('amount, description')
        .eq('user_id', userId)
        .eq('amount', amount)
        .ilike('description', `%${description.slice(0, 10)}%`)
        .limit(5);

      return (similarTxns?.length || 0) >= 2;
    } catch {
      return false;
    }
  }

  /**
   * Calculate confidence score for categorization
   */
  private calculateCategoryConfidence(description: string, category: TransactionCategory): number {
    const desc = description.toLowerCase();
    
    // High confidence keywords
    const highConfidenceMap: { [key in TransactionCategory]: string[] } = {
      groceries: ['tesco', 'sainsbury', 'grocery'],
      transport: ['tfl', 'uber', 'oyster'],
      dining: ['restaurant', 'mcdonald', 'cafe'],
      entertainment: ['netflix', 'cinema', 'spotify'],
      education: ['university', 'tuition', 'student'],
      healthcare: ['pharmacy', 'nhs', 'medical'],
      utilities: ['electric', 'gas', 'council tax'],
      rent: ['rent', 'mortgage', 'estate'],
      shopping: ['amazon', 'shop', 'store'],
      subscriptions: ['subscription', 'monthly'],
      savings: ['savings', 'investment'],
      travel: ['booking', 'hotel', 'flight'],
      income: ['salary', 'wage', 'payroll'],
      other: []
    };

    const keywords = highConfidenceMap[category] || [];
    if (keywords.some(keyword => desc.includes(keyword))) {
      return 0.9;
    }

    return 0.6; // Medium confidence for pattern-based matches
  }

  /**
   * Generate tags for transaction
   */
  private generateTags(description: string, category: TransactionCategory): string[] {
    const tags = [category];
    const desc = description.toLowerCase();

    // Add contextual tags
    if (desc.includes('online') || desc.includes('amazon') || desc.includes('ebay')) {
      tags.push('online');
    }
    if (desc.includes('contactless') || desc.includes('card')) {
      tags.push('card');
    }
    if (desc.includes('london') || desc.includes('central')) {
      tags.push('london');
    }

    return tags;
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(date: Date, amount: number, description: string, bank: string): string {
    const hashInput = `${date.toISOString().split('T')[0]}-${amount}-${description.slice(0, 20)}-${bank}`;
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Store transaction insights (not raw data) in database
   */
  private async storeTransactionInsights(transactions: BankTransaction[], userId: string): Promise<void> {
    try {
      // Store aggregated insights only, not individual transaction details
      const insights = this.generateTransactionInsights(transactions);
      
      for (const insight of insights) {
        await this.supabase
          .from('bank_transaction_insights')
          .upsert({
            user_id: userId,
            transaction_id: insight.id,
            date: insight.date,
            amount: insight.amount,
            category: insight.category,
            subcategory: insight.subcategory,
            merchant: insight.merchant,
            is_recurring: insight.isRecurring,
            confidence: insight.confidence,
            tags: insight.tags,
            bank: insight.metadata.bank,
            processed_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error storing transaction insights:', error);
    }
  }

  /**
   * Generate insights from transactions (removes sensitive details)
   */
  private generateTransactionInsights(transactions: BankTransaction[]): Array<{
    id: string;
    date: string;
    amount: number;
    category: TransactionCategory;
    subcategory?: string;
    merchant?: string;
    isRecurring: boolean;
    confidence: number;
    tags: string[];
    metadata: { bank: string };
  }> {
    return transactions.map(tx => ({
      id: tx.id,
      date: tx.date,
      amount: tx.amount,
      category: tx.category,
      subcategory: tx.subcategory,
      merchant: tx.merchant,
      isRecurring: tx.isRecurring,
      confidence: tx.confidence,
      tags: tx.tags,
      metadata: { bank: tx.metadata.bank }
    }));
  }

  /**
   * Clean description for display (remove sensitive info)
   */
  private cleanDescription(description: string): string {
    return description
      .replace(/\d{16}/g, 'CARD****') // Mask card numbers
      .replace(/\d{6,}/g, 'REF****') // Mask reference numbers
      .replace(/SORT CODE \d{6}/gi, 'SORT****');
  }

  /**
   * Extract balance if available
   */
  private extractBalance(raw: any, config: any): number | undefined {
    const balanceFields = ['Balance', 'balance', 'Balance (GBP)'];
    for (const field of balanceFields) {
      if (raw[field]) {
        const cleanBalance = raw[field].replace(/[£$€,\s]/g, '');
        const pounds = parseFloat(cleanBalance);
        return Math.round(pounds * 100);
      }
    }
    return undefined;
  }

  /**
   * Extract card info from description
   */
  private extractCardInfo(description: string): string | undefined {
    const cardMatch = description.match(/\*{4}(\d{4})/);
    return cardMatch ? cardMatch[1] : undefined;
  }

  /**
   * Detect account type
   */
  private detectAccountType(raw: any): string {
    if (raw['Account Name'] || raw['Product']) {
      const accountInfo = (raw['Account Name'] || raw['Product']).toLowerCase();
      if (accountInfo.includes('current')) return 'current';
      if (accountInfo.includes('savings')) return 'savings';
      if (accountInfo.includes('credit')) return 'credit';
    }
    return 'current';
  }

  /**
   * Analyze spending patterns and generate insights
   */
  async generateSpendingInsights(userId: string, days: number = 30): Promise<SpendingInsight[]> {
    try {
      const insights: SpendingInsight[] = [];
      const since = new Date();
      since.setDate(since.getDate() - days);

      // Get transaction insights
      const { data: transactions } = await this.supabase
        .from('bank_transaction_insights')
        .select('*')
        .eq('user_id', userId)
        .gte('date', since.toISOString());

      if (!transactions || transactions.length === 0) return insights;

      // Calculate category spending
      const categoryTotals: { [key: string]: number } = {};
      let totalSpent = 0;

      transactions.forEach(tx => {
        if (tx.amount < 0) { // Expenses only
          const amount = Math.abs(tx.amount);
          categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amount;
          totalSpent += amount;
        }
      });

      // Budget alerts
      Object.entries(categoryTotals).forEach(([category, amount]) => {
        const percentage = (amount / totalSpent) * 100;
        
        if (percentage > 30 && category !== 'rent') {
          insights.push({
            type: 'budget_alert',
            title: `High ${category} spending`,
            description: `You've spent £${(amount / 100).toFixed(2)} on ${category} (${percentage.toFixed(1)}% of total spending) in the last ${days} days.`,
            severity: 'warning',
            amount,
            category: category as TransactionCategory,
            actionItems: [
              `Review ${category} expenses`,
              'Set a monthly budget limit',
              'Look for cost-saving alternatives'
            ],
            timeframe: `Last ${days} days`,
            confidence: 0.8
          });
        }
      });

      // Recurring payment analysis
      const recurringTransactions = transactions.filter(tx => tx.is_recurring);
      const monthlyRecurring = recurringTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      
      if (monthlyRecurring > 20000) { // > £200
        insights.push({
          type: 'spending_pattern',
          title: 'High recurring payments',
          description: `You have £${(monthlyRecurring / 100).toFixed(2)} in recurring payments. Consider reviewing subscriptions and direct debits.`,
          severity: 'info',
          amount: monthlyRecurring,
          actionItems: [
            'Review all subscriptions',
            'Cancel unused services',
            'Negotiate better rates',
            'Consider annual vs monthly payments'
          ],
          timeframe: 'Monthly',
          confidence: 0.9
        });
      }

      // Unusual activity detection
      const avgDailySpending = totalSpent / days;
      const dailyTotals: { [key: string]: number } = {};

      transactions.forEach(tx => {
        if (tx.amount < 0) {
          const date = tx.date.split('T')[0];
          dailyTotals[date] = (dailyTotals[date] || 0) + Math.abs(tx.amount);
        }
      });

      Object.entries(dailyTotals).forEach(([date, amount]) => {
        if (amount > avgDailySpending * 3) { // 3x average
          insights.push({
            type: 'unusual_activity',
            title: 'Unusual spending day',
            description: `High spending of £${(amount / 100).toFixed(2)} on ${new Date(date).toLocaleDateString()} (${((amount / avgDailySpending) - 1) * 100}% above average).`,
            severity: 'info',
            amount,
            actionItems: [
              'Review transactions for this date',
              'Check for unauthorized transactions',
              'Categorize large expenses'
            ],
            timeframe: date,
            confidence: 0.7
          });
        }
      });

      // Savings opportunities
      const grocerySpend = categoryTotals['groceries'] || 0;
      const diningSpend = categoryTotals['dining'] || 0;
      
      if (diningSpend > grocerySpend) {
        const potential = diningSpend - grocerySpend;
        insights.push({
          type: 'savings_opportunity',
          title: 'Dining vs grocery spending',
          description: `You spend more on dining (£${(diningSpend / 100).toFixed(2)}) than groceries (£${(grocerySpend / 100).toFixed(2)}). Cooking more could save £${(potential / 100).toFixed(2)}.`,
          severity: 'info',
          amount: potential,
          actionItems: [
            'Plan weekly meals',
            'Cook more at home',
            'Limit takeaway orders',
            'Use grocery delivery to avoid impulse purchases'
          ],
          timeframe: `Last ${days} days`,
          confidence: 0.8
        });
      }

      return insights.sort((a, b) => {
        const severityOrder = { alert: 3, warning: 2, info: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });
    } catch (error) {
      console.error('Error generating spending insights:', error);
      return [];
    }
  }

  /**
   * Generate budget analysis
   */
  async generateBudgetAnalysis(userId: string, months: number = 6): Promise<BudgetAnalysis> {
    try {
      const since = new Date();
      since.setMonth(since.getMonth() - months);

      const { data: transactions } = await this.supabase
        .from('bank_transaction_insights')
        .select('*')
        .eq('user_id', userId)
        .gte('date', since.toISOString());

      const income = transactions?.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0) || 0;
      const expenses = Math.abs(transactions?.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0) || 0);

      // Category breakdown
      const categoryBreakdown: BudgetAnalysis['categoryBreakdown'] = [];
      const categoryData: { [key: string]: { total: number; count: number } } = {};

      transactions?.forEach(tx => {
        if (tx.amount < 0) {
          const category = tx.category;
          if (!categoryData[category]) {
            categoryData[category] = { total: 0, count: 0 };
          }
          categoryData[category].total += Math.abs(tx.amount);
          categoryData[category].count += 1;
        }
      });

      Object.entries(categoryData).forEach(([category, data]) => {
        categoryBreakdown.push({
          category: category as TransactionCategory,
          amount: data.total,
          percentage: (data.total / expenses) * 100,
          transactionCount: data.count,
          avgTransaction: Math.round(data.total / data.count)
        });
      });

      categoryBreakdown.sort((a, b) => b.amount - a.amount);

      // Monthly trends
      const monthlyTrends: BudgetAnalysis['monthlyTrends'] = [];
      const monthlyData: { [key: string]: { income: number; expenses: number; categories: { [key: string]: number } } } = {};

      transactions?.forEach(tx => {
        const month = tx.date.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { income: 0, expenses: 0, categories: {} };
        }
        
        if (tx.amount > 0) {
          monthlyData[month].income += tx.amount;
        } else {
          const amount = Math.abs(tx.amount);
          monthlyData[month].expenses += amount;
          monthlyData[month].categories[tx.category] = (monthlyData[month].categories[tx.category] || 0) + amount;
        }
      });

      Object.entries(monthlyData).forEach(([month, data]) => {
        const topCategory = Object.entries(data.categories)
          .sort(([,a], [,b]) => b - a)[0];
        
        monthlyTrends.push({
          month,
          income: data.income,
          expenses: data.expenses,
          topCategory: (topCategory?.[0] || 'other') as TransactionCategory
        });
      });

      monthlyTrends.sort((a, b) => a.month.localeCompare(b.month));

      return {
        totalIncome: income,
        totalExpenses: expenses,
        netPosition: income - expenses,
        categoryBreakdown,
        monthlyTrends
      };
    } catch (error) {
      console.error('Error generating budget analysis:', error);
      return {
        totalIncome: 0,
        totalExpenses: 0,
        netPosition: 0,
        categoryBreakdown: [],
        monthlyTrends: []
      };
    }
  }
}

// Export singleton instance
export const bankingParser = new BankingParser();

// Helper functions
export const parseStatementFile = (file: File, bankType: keyof typeof bankingParser['bankPatterns'], userId: string) =>
  bankingParser.parseStatementFile(file, bankType, userId);

export const getSpendingInsights = (userId: string, days?: number) =>
  bankingParser.generateSpendingInsights(userId, days);

export const getBudgetAnalysis = (userId: string, months?: number) =>
  bankingParser.generateBudgetAnalysis(userId, months);

export default bankingParser;