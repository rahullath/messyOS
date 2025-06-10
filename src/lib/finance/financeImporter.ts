// CORRECTED FINANCE IMPORT SYSTEM
// src/lib/finance/correctedFinanceImporter.ts

import { createServerClient } from '../supabase/server';
import type { AstroCookies } from 'astro';

export interface ImportResult {
  success: boolean;
  message: string;
  stats: {
    totalProcessed: number;
    realExpenses: number;
    internalTransfers: number;
    duplicatesSkipped: number;
    cryptoHoldings: number;
    dateRange: string;
  };
}

export class CorrectedFinanceImporter {
  private supabase: any;
  private userId: string;

  constructor(cookies: AstroCookies, userId: string) {
    this.supabase = createServerClient(cookies);
    this.userId = userId;
  }

  async importFinanceData(files: {
    bank?: string;
    crypto?: string;
    expenses?: string;
  }): Promise<ImportResult> {
    console.log('🔄 Starting CORRECTED finance import...');
    
    let stats = {
      totalProcessed: 0,
      realExpenses: 0,
      internalTransfers: 0,
      duplicatesSkipped: 0,
      cryptoHoldings: 0,
      dateRange: ''
    };

    try {
      // 1. Import Crypto (if provided) - REPLACE existing
      if (files.crypto) {
        await this.importCryptoHoldings(files.crypto, stats);
      }

      // 2. Import Bank Statement (if provided) - APPEND with duplicate prevention
      if (files.bank) {
        await this.importBankTransactions(files.bank, stats);
      }

      // 3. Manual expenses (if provided) - legacy support
      if (files.expenses) {
        await this.importManualExpenses(files.expenses, stats);
      }

      return {
        success: true,
        message: this.generateSuccessMessage(stats),
        stats
      };

    } catch (error: any) {
      console.error('❌ Import error:', error);
      return {
        success: false,
        message: `Import failed: ${error.message}`,
        stats
      };
    }
  }

  // 1. CRYPTO IMPORT - Replace existing data
  private async importCryptoHoldings(cryptoText: string, stats: any) {
    console.log('₿ Processing crypto holdings...');

    // Clear existing crypto data first
    await this.supabase
      .from('metrics')
      .delete()
      .eq('user_id', this.userId)
      .eq('type', 'crypto_value');

    const holdings = this.parseCryptoHoldings(cryptoText);
    
    if (holdings.length > 0) {
      const cryptoMetrics = holdings.map(holding => ({
        user_id: this.userId,
        type: 'crypto_value',
        value: holding.currentValue,
        unit: 'USD',
        metadata: {
          symbol: holding.symbol,
          network: holding.network,
          quantity: holding.quantity,
          price: holding.price,
          change: holding.change
        },
        recorded_at: new Date().toISOString()
      }));

      const { error } = await this.supabase
        .from('metrics')
        .insert(cryptoMetrics);

      if (error) throw error;

      stats.cryptoHoldings = holdings.length;
      const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
      console.log(`✅ Imported ${holdings.length} crypto holdings worth $${totalValue.toFixed(2)}`);
    }
  }

  // 2. BANK IMPORT - Append with duplicate prevention
  private async importBankTransactions(bankText: string, stats: any) {
    console.log('🏦 Processing bank transactions...');

    // Get existing transaction dates to prevent duplicates
    const existingDates = await this.getExistingTransactionDates();
    
    const transactions = this.parseJupiterBankCSV(bankText, existingDates);
    
    if (transactions.realTransactions.length > 0) {
      const bankMetrics = transactions.realTransactions.map(tx => ({
        user_id: this.userId,
        type: tx.amount > 0 ? 'income' : 'expense',
        value: Math.abs(tx.amount),
        unit: 'INR',
        metadata: {
          description: tx.description,
          category: tx.category,
          vendor: tx.vendor,
          source: 'bank',
          reference: tx.reference,
          balance: tx.balance
        },
        recorded_at: tx.date.toISOString()
      }));

      const { error } = await this.supabase
        .from('metrics')
        .insert(bankMetrics);

      if (error) throw error;

      // Update stats
      stats.totalProcessed = transactions.totalProcessed;
      stats.realExpenses = transactions.realTransactions.length;
      stats.internalTransfers = transactions.internalTransfers;
      stats.duplicatesSkipped = transactions.duplicatesSkipped;
      stats.dateRange = transactions.dateRange;

      console.log(`✅ Imported ${transactions.realTransactions.length} real transactions`);
      console.log(`🚫 Excluded ${transactions.internalTransfers} internal transfers`);
      console.log(`⏭️ Skipped ${transactions.duplicatesSkipped} duplicates`);
    }
  }

  // 3. MANUAL EXPENSES - Legacy support
  private async importManualExpenses(expensesText: string, stats: any) {
    console.log('📝 Processing manual expenses (legacy)...');
    
    const expenses = this.parseManualExpenses(expensesText);
    
    if (expenses.length > 0) {
      const expenseMetrics = expenses.map(expense => ({
        user_id: this.userId,
        type: 'expense',
        value: expense.amount,
        unit: 'INR',
        metadata: {
          description: expense.description,
          category: expense.category,
          source: expense.source,
          vendor: expense.vendor || 'Manual'
        },
        recorded_at: expense.date.toISOString()
      }));

      const { error } = await this.supabase
        .from('metrics')
        .insert(expenseMetrics);

      if (error) throw error;

      stats.realExpenses += expenses.length;
      console.log(`✅ Imported ${expenses.length} manual expenses`);
    }
  }

  // CRYPTO PARSER - Fixed version
  private parseCryptoHoldings(textContent: string) {
    const lines = textContent.split('\n');
    const holdings = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Parse format: "1. USDC (Base)"
      const symbolMatch = line.match(/^\d+\.\s*(\w+)\s*\(([^)]+)\)/);
      if (symbolMatch) {
        const symbol = symbolMatch[1];
        const network = symbolMatch[2];
        
        let price = 0, change = 0, quantity = 0, value = 0;
        
        // Look ahead for price and quantity data
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const dataLine = lines[j].trim();
          
          const priceMatch = dataLine.match(/Price:\s*\$?([\d,]+\.?\d*)\s*\|\s*Change:\s*([-+]?[\d.]+)%/);
          if (priceMatch) {
            price = parseFloat(priceMatch[1].replace(/,/g, ''));
            change = parseFloat(priceMatch[2]);
          }
          
          const quantityMatch = dataLine.match(/Quantity:\s*([\d,]+\.?\d*)\s*\|\s*Value:\s*\$?([\d,]+\.?\d*)/);
          if (quantityMatch) {
            quantity = parseFloat(quantityMatch[1].replace(/,/g, ''));
            value = parseFloat(quantityMatch[2].replace(/,/g, ''));
            break;
          }
        }
        
        if (price > 0 && quantity > 0 && value > 0) {
          holdings.push({
            symbol: symbol.toUpperCase(),
            network: network,
            price: price,
            quantity: quantity,
            currentValue: value,
            change: change
          });
        }
      }
    }
    
    return holdings;
  }

  // BANK PARSER - Enhanced with filtering and duplicate prevention
  private parseJupiterBankCSV(csvContent: string, existingDates: Set<string>) {
    const lines = csvContent.split('\n');
    const realTransactions = [];
    let totalProcessed = 0;
    let internalTransfers = 0;
    let duplicatesSkipped = 0;
    const dates = [];
    
    // Skip header lines and process records
    let i = 2;
    while (i < lines.length) {
      const record = this.parseMultiLineCSVRecord(lines, i);
      if (!record.transaction) {
        i = record.nextIndex;
        continue;
      }
      
      totalProcessed++;
      const tx = record.transaction;
      i = record.nextIndex;
      
      // Check for duplicates
      const dateStr = tx.date.toISOString().split('T')[0];
      const duplicateKey = `${dateStr}-${tx.description.substring(0, 30)}-${Math.abs(tx.amount)}`;
      
      if (existingDates.has(duplicateKey)) {
        duplicatesSkipped++;
        continue;
      }
      
      // Filter internal transfers
      if (this.isInternalTransfer(tx.description, tx.amount)) {
        internalTransfers++;
        continue;
      }
      
      realTransactions.push(tx);
      dates.push(dateStr);
    }
    
    // Calculate date range
    const uniqueDates = [...new Set(dates)].sort();
    const dateRange = uniqueDates.length > 0 ? 
      `${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}` : 'No dates';
    
    return {
      realTransactions,
      totalProcessed,
      internalTransfers,
      duplicatesSkipped,
      dateRange
    };
  }

  // MULTI-LINE CSV PARSER - Handles Jupiter's complex format
  private parseMultiLineCSVRecord(lines: string[], startIndex: number) {
    let currentRecord = '';
    let i = startIndex;
    
    // Combine lines until we have a complete record
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) {
        i++;
        continue;
      }
      
      currentRecord += (currentRecord ? ' ' : '') + line;
      
      // Check if record is complete (even number of quotes)
      const quoteCount = (currentRecord.match(/"/g) || []).length;
      const isComplete = quoteCount % 2 === 0;
      
      i++;
      
      if (isComplete && currentRecord.includes(',')) {
        const transaction = this.parseJupiterTransaction(currentRecord);
        return { transaction, nextIndex: i };
      }
    }
    
    return { transaction: null, nextIndex: i };
  }

  // TRANSACTION PARSER - Enhanced
  private parseJupiterTransaction(record: string) {
    try {
      const fields = this.parseCSVFields(record);
      if (fields.length < 8) return null;
      
      const [date, valueDate, particulars, tranType, chequeDetails, withdrawals, deposits, balance] = fields;
      
      if (!date || date.includes('*') || !particulars) return null;
      
      const withdrawalAmount = parseFloat(withdrawals?.replace(/,/g, '') || '0');
      const depositAmount = parseFloat(deposits?.replace(/,/g, '') || '0');
      const amount = depositAmount > 0 ? depositAmount : -withdrawalAmount;
      
      if (amount === 0) return null;
      
      const parsedDate = this.parseIndianDate(date);
      if (!parsedDate) return null;
      
      const cleanDescription = particulars.replace(/"/g, '').trim();
      
      return {
        date: parsedDate,
        description: cleanDescription,
        amount: amount,
        balance: parseFloat(balance?.replace(/,/g, '') || '0'),
        type: tranType,
        reference: chequeDetails || '',
        category: this.categorizeTransaction(cleanDescription),
        vendor: this.extractVendor(cleanDescription)
      };
      
    } catch (error) {
      return null;
    }
  }

  // INTERNAL TRANSFER DETECTION - Critical for accurate expenses
  private isInternalTransfer(description: string, amount: number): boolean {
    const desc = description.toLowerCase();
    
    // 1. Jupiter internal transfers
    if (desc.includes('transfer to pot') || desc.includes('ifn/neosiexeddd')) {
      return true;
    }
    
    // 2. Large amounts (user specified no expense >₹20k)
    if (Math.abs(amount) > 20000) {
      console.log(`🚫 Excluding large transfer: ₹${amount.toLocaleString()} - ${description.substring(0, 50)}...`);
      return true;
    }
    
    // 3. Common internal transfer patterns
    const internalPatterns = [
      'pot to main',
      'savings account',
      'internal fund transfer',
      'account transfer'
    ];
    
    for (const pattern of internalPatterns) {
      if (desc.includes(pattern)) return true;
    }
    
    return false;
  }

  // ENHANCED CATEGORIZATION
  private categorizeTransaction(description: string): string {
    const desc = description.toLowerCase();
    
    // Food & Grocery
    if (desc.includes('zepto') || desc.includes('blinkit') || desc.includes('swiggy instamart')) {
      return 'Food & Grocery';
    }
    if (desc.includes('mkretailco') || desc.includes('mk retail')) {
      return 'Food & Grocery';
    }
    
    // Food Delivery
    if (desc.includes('swiggy') || desc.includes('zomato')) {
      return 'Food Delivery';
    }
    
    // Pet Care
    if (desc.includes('supertails') || desc.includes('pawsome')) {
      return 'Pet Care';
    }
    
    // Housing
    if (desc.includes('shettyarjun29') || desc.includes('rent')) {
      return 'Housing';
    }
    
    // Transportation
    if (desc.includes('yulu')) {
      return 'Transportation';
    }
    
    // Subscriptions
    if (desc.includes('spotify') || desc.includes('netflix') || desc.includes('myjio')) {
      return 'Subscriptions';
    }
    
    // Healthcare
    if (desc.includes('apollo') || desc.includes('medicine')) {
      return 'Healthcare';
    }
    
    // UPI transfers (might be various)
    if (desc.includes('upi')) {
      return 'UPI Transfer';
    }
    
    return 'Other';
  }

  // VENDOR EXTRACTION
  private extractVendor(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('zepto')) return 'Zepto';
    if (desc.includes('swiggy')) return 'Swiggy';
    if (desc.includes('blinkit')) return 'Blinkit';
    if (desc.includes('supertails')) return 'Supertails';
    if (desc.includes('mkretailco')) return 'MK Retail';
    if (desc.includes('yulu')) return 'Yulu';
    if (desc.includes('spotify')) return 'Spotify';
    if (desc.includes('zomato')) return 'Zomato';
    if (desc.includes('myjio')) return 'Jio';
    if (desc.includes('shettyarjun29')) return 'Rent';
    
    return 'Unknown';
  }

  // UTILITY METHODS
  private async getExistingTransactionDates(): Promise<Set<string>> {
    const { data } = await this.supabase
      .from('metrics')
      .select('recorded_at, metadata')
      .eq('user_id', this.userId)
      .in('type', ['expense', 'income']);
    
    const existingKeys = new Set<string>();
    
    for (const metric of data || []) {
      const dateStr = metric.recorded_at.split('T')[0];
      const description = metric.metadata?.description || '';
      const duplicateKey = `${dateStr}-${description.substring(0, 30)}-*`;
      existingKeys.add(duplicateKey);
    }
    
    return existingKeys;
  }

  private parseCSVFields(record: string): string[] {
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < record.length; i++) {
      const char = record[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    fields.push(current.trim());
    return fields;
  }

  private parseIndianDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.includes('*')) return null;
    
    try {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parseInt(parts[2]);
        
        if (year >= 2020 && year <= 2030 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
          return new Date(year, month, day);
        }
      }
    } catch (error) {
      return null;
    }
    
    return null;
  }

  private parseManualExpenses(textContent: string) {
    // Legacy manual expense parsing
    const expenses = [];
    const lines = textContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Simple parsing for manual entries
      const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\s*-\s*(.+?)\s*-\s*(\d+)\s*total/i);
      if (match) {
        const [, day, month, description, amount] = match;
        const date = new Date(2025, parseInt(month) - 1, parseInt(day));
        
        expenses.push({
          date: date,
          description: description.trim(),
          amount: parseInt(amount),
          category: this.categorizeTransaction(description),
          source: 'manual',
          vendor: this.extractVendor(description)
        });
      }
    }
    
    return expenses;
  }

  private generateSuccessMessage(stats: any): string {
    const parts = [];
    
    if (stats.cryptoHoldings > 0) {
      parts.push(`${stats.cryptoHoldings} crypto holdings`);
    }
    
    if (stats.realExpenses > 0) {
      parts.push(`${stats.realExpenses} transactions`);
    }
    
    if (stats.internalTransfers > 0) {
      parts.push(`excluded ${stats.internalTransfers} internal transfers`);
    }
    
    if (stats.duplicatesSkipped > 0) {
      parts.push(`skipped ${stats.duplicatesSkipped} duplicates`);
    }
    
    if (stats.dateRange) {
      parts.push(`covering ${stats.dateRange}`);
    }
    
    return `✅ Successfully imported: ${parts.join(', ')}`;
  }
}