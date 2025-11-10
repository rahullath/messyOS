// src/lib/expenses/bank-statement-parser.ts - Multi-format Bank Statement Parser
// Supports UK banks (Barclays, HSBC, Santander, etc.) + international formats

export interface ParsedTransaction {
  date: string; // ISO date string
  amount: number;
  currency: string;
  description: string;
  merchant?: string;
  reference?: string;
  balance?: number;
  transactionType: 'debit' | 'credit';
  
  // UK-specific fields
  sortCode?: string;
  accountNumber?: string;
  
  // Raw data for debugging
  rawData: Record<string, any>;
}

export interface BankFormat {
  name: string;
  identifier: string; // How to identify this format
  country: string;
  dateFormat: string;
  columns: {
    date: string | number;
    amount?: string | number;
    debit?: string | number;
    credit?: string | number;
    description: string | number;
    balance?: string | number;
    reference?: string | number;
    merchant?: string | number;
  };
  currencySymbol: string;
}

// Supported bank formats
export const BANK_FORMATS: BankFormat[] = [
  // UK Banks
  {
    name: 'Barclays UK',
    identifier: 'Number,Date,Account,Amount,Subcategory,Memo',
    country: 'UK',
    dateFormat: 'DD/MM/YYYY',
    columns: {
      date: 1,
      amount: 3,
      description: 5,
      reference: 4
    },
    currencySymbol: '£'
  },
  {
    name: 'HSBC UK',
    identifier: 'Date,Description,Amount,Balance',
    country: 'UK',
    dateFormat: 'DD MMM YYYY',
    columns: {
      date: 0,
      description: 1,
      amount: 2,
      balance: 3
    },
    currencySymbol: '£'
  },
  {
    name: 'Santander UK',
    identifier: 'Date,Description,Debit,Credit,Balance',
    country: 'UK',
    dateFormat: 'DD/MM/YYYY',
    columns: {
      date: 0,
      description: 1,
      debit: 2,
      credit: 3,
      balance: 4
    },
    currencySymbol: '£'
  },
  {
    name: 'Lloyds Bank UK',
    identifier: 'Transaction Date,Transaction Type,Sort Code,Account Number,Transaction Description,Debit Amount,Credit Amount,Balance',
    country: 'UK',
    dateFormat: 'DD/MM/YYYY',
    columns: {
      date: 0,
      description: 4,
      debit: 5,
      credit: 6,
      balance: 7
    },
    currencySymbol: '£'
  },
  {
    name: 'NatWest UK',
    identifier: 'Date,Type,Description,Value,Balance,Account Name,Account Number',
    country: 'UK',
    dateFormat: 'DD MMM YYYY',
    columns: {
      date: 0,
      description: 2,
      amount: 3,
      balance: 4
    },
    currencySymbol: '£'
  },
  
  // International Banks
  {
    name: 'Chase USA',
    identifier: 'Transaction Date,Post Date,Description,Category,Type,Amount,Memo',
    country: 'US',
    dateFormat: 'MM/DD/YYYY',
    columns: {
      date: 0,
      description: 2,
      amount: 5,
      merchant: 6
    },
    currencySymbol: '$'
  },
  {
    name: 'Bank of America',
    identifier: 'Date,Description,Amount,Running Balance',
    country: 'US',
    dateFormat: 'MM/DD/YYYY',
    columns: {
      date: 0,
      description: 1,
      amount: 2,
      balance: 3
    },
    currencySymbol: '$'
  },
  {
    name: 'HDFC India',
    identifier: 'Date,Narration,Value Dt,Debit Amount,Credit Amount,Chq/Ref Number,Closing Balance',
    country: 'IN',
    dateFormat: 'DD/MM/YY',
    columns: {
      date: 0,
      description: 1,
      debit: 3,
      credit: 4,
      reference: 5,
      balance: 6
    },
    currencySymbol: '₹'
  },
  {
    name: 'ICICI Bank India',
    identifier: 'S.No.,Transaction Date,Value Date,Description,Debit,Credit,Balance',
    country: 'IN',
    dateFormat: 'DD-MM-YYYY',
    columns: {
      date: 1,
      description: 3,
      debit: 4,
      credit: 5,
      balance: 6
    },
    currencySymbol: '₹'
  },
  
  // Generic formats
  {
    name: 'Generic CSV',
    identifier: 'date,description,amount',
    country: 'GLOBAL',
    dateFormat: 'YYYY-MM-DD',
    columns: {
      date: 0,
      description: 1,
      amount: 2
    },
    currencySymbol: '$'
  }
];

export class BankStatementParser {
  private detectFormat(csvContent: string): BankFormat | null {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return null;
    
    const header = lines[0].toLowerCase();
    
    // Try to match against known formats
    for (const format of BANK_FORMATS) {
      const identifierLower = format.identifier.toLowerCase();
      
      // Check if header contains all required columns
      const requiredColumns = identifierLower.split(',').map(col => col.trim());
      const headerMatches = requiredColumns.every(col => 
        header.includes(col) || this.findSimilarColumn(header, col)
      );
      
      if (headerMatches) {
        return format;
      }
    }
    
    // Fallback to generic format if common columns are found
    if (header.includes('date') && header.includes('amount') && header.includes('description')) {
      return BANK_FORMATS.find(f => f.name === 'Generic CSV') || null;
    }
    
    return null;
  }
  
  private findSimilarColumn(header: string, target: string): boolean {
    const synonyms: Record<string, string[]> = {
      'date': ['transaction date', 'trans date', 'dt', 'transaction_date'],
      'description': ['memo', 'details', 'narration', 'transaction description', 'desc'],
      'amount': ['value', 'sum', 'transaction amount', 'amt'],
      'debit': ['debit amount', 'withdrawal', 'out'],
      'credit': ['credit amount', 'deposit', 'in'],
      'balance': ['running balance', 'closing balance', 'current balance']
    };
    
    const targetSynonyms = synonyms[target] || [target];
    return targetSynonyms.some(synonym => header.includes(synonym));
  }
  
  private parseDate(dateStr: string, format: string): string {
    // Clean the date string
    const cleaned = dateStr.trim().replace(/['"]/g, '');
    
    try {
      let date: Date;
      
      switch (format) {
        case 'DD/MM/YYYY':
          const [day1, month1, year1] = cleaned.split('/').map(Number);
          date = new Date(year1, month1 - 1, day1);
          break;
          
        case 'MM/DD/YYYY':
          const [month2, day2, year2] = cleaned.split('/').map(Number);
          date = new Date(year2, month2 - 1, day2);
          break;
          
        case 'DD MMM YYYY':
          // Handle formats like "15 Jan 2024"
          date = new Date(cleaned);
          break;
          
        case 'DD-MM-YYYY':
          const [day3, month3, year3] = cleaned.split('-').map(Number);
          date = new Date(year3, month3 - 1, day3);
          break;
          
        case 'DD/MM/YY':
          const [day4, month4, year4] = cleaned.split('/').map(Number);
          const fullYear = year4 < 50 ? 2000 + year4 : 1900 + year4;
          date = new Date(fullYear, month4 - 1, day4);
          break;
          
        default:
          date = new Date(cleaned);
      }
      
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.warn('Date parsing failed:', dateStr, format, error);
      return new Date().toISOString().split('T')[0];
    }
  }
  
  private parseAmount(amountStr: string, currencySymbol: string): number {
    if (!amountStr) return 0;
    
    // Clean the amount string
    let cleaned = amountStr.toString().trim()
      .replace(/['"]/g, '')
      .replace(/,/g, '')
      .replace(new RegExp(`\\${currencySymbol}`, 'g'), '')
      .replace(/\s/g, '');
    
    // Handle negative amounts (parentheses or minus)
    const isNegative = cleaned.includes('(') || cleaned.startsWith('-');
    cleaned = cleaned.replace(/[()]/g, '').replace('-', '');
    
    const amount = parseFloat(cleaned) || 0;
    return isNegative ? -amount : amount;
  }
  
  private extractMerchantName(description: string): string | undefined {
    // Clean description
    const cleaned = description.trim().toUpperCase();
    
    // Remove common prefixes
    const prefixesToRemove = [
      'CARD PAYMENT TO ',
      'DIRECT DEBIT TO ',
      'FASTER PAYMENT TO ',
      'STANDING ORDER TO ',
      'CARD PAYMENT ',
      'TFR TO ',
      'PAYMENT TO ',
      'BP ',
      'CP ',
      'DD '
    ];
    
    let merchant = cleaned;
    for (const prefix of prefixesToRemove) {
      if (merchant.startsWith(prefix)) {
        merchant = merchant.substring(prefix.length);
        break;
      }
    }
    
    // Extract merchant name (usually before location/reference)
    const parts = merchant.split(/\s+/);
    if (parts.length > 0) {
      // Take first 2-3 words as merchant name
      return parts.slice(0, Math.min(3, parts.length)).join(' ');
    }
    
    return undefined;
  }
  
  private categorizeDescription(description: string): { merchant?: string; category?: string } {
    const desc = description.toUpperCase();
    
    // UK-specific merchant patterns
    const ukMerchants: Record<string, string> = {
      'TESCO': 'TESCO',
      'SAINSBURY': 'SAINSBURYS',
      'ASDA': 'ASDA',
      'MORRISONS': 'MORRISONS',
      'WAITROSE': 'WAITROSE',
      'M&S': 'MARKS & SPENCER',
      'JOHN LEWIS': 'JOHN LEWIS',
      'ARGOS': 'ARGOS',
      'BOOTS': 'BOOTS',
      'WHSmith': 'WHSmith',
      'COSTA': 'COSTA COFFEE',
      'STARBUCKS': 'STARBUCKS',
      'GREGGS': 'GREGGS',
      'MCDONALDS': 'MCDONALDS',
      'SUBWAY': 'SUBWAY',
      'KFC': 'KFC',
      'NANDOS': 'NANDOS',
      'AMAZON': 'AMAZON',
      'PAYPAL': 'PAYPAL',
      'SPOTIFY': 'SPOTIFY',
      'NETFLIX': 'NETFLIX',
      'UBER': 'UBER',
      'TFL': 'TFL'
    };
    
    // Find merchant
    let merchant: string | undefined;
    for (const [key, value] of Object.entries(ukMerchants)) {
      if (desc.includes(key)) {
        merchant = value;
        break;
      }
    }
    
    if (!merchant) {
      merchant = this.extractMerchantName(description);
    }
    
    return { merchant };
  }
  
  public parseCSV(csvContent: string): {
    transactions: ParsedTransaction[];
    format: BankFormat | null;
    errors: string[];
  } {
    const errors: string[] = [];
    const transactions: ParsedTransaction[] = [];
    
    try {
      // Detect format
      const format = this.detectFormat(csvContent);
      if (!format) {
        errors.push('Could not detect bank statement format');
        return { transactions: [], format: null, errors };
      }
      
      const lines = csvContent.trim().split('\n');
      const dataLines = lines.slice(1); // Skip header
      
      for (let i = 0; i < dataLines.length; i++) {
        try {
          const line = dataLines[i].trim();
          if (!line) continue;
          
          // Parse CSV line (handle quoted fields)
          const fields = this.parseCSVLine(line);
          
          // Extract date
          const dateField = typeof format.columns.date === 'number' 
            ? fields[format.columns.date] 
            : fields.find((_, idx) => idx === 0); // Default to first column
          
          if (!dateField) continue;
          
          const date = this.parseDate(dateField, format.dateFormat);
          
          // Extract description
          const descriptionField = typeof format.columns.description === 'number'
            ? fields[format.columns.description]
            : fields.find((_, idx) => idx === 1); // Default to second column
          
          const description = descriptionField || 'Unknown transaction';
          
          // Extract amount
          let amount = 0;
          let transactionType: 'debit' | 'credit' = 'debit';
          
          if (format.columns.amount !== undefined) {
            // Single amount column
            const amountField = typeof format.columns.amount === 'number'
              ? fields[format.columns.amount]
              : '';
            amount = this.parseAmount(amountField, format.currencySymbol);
            transactionType = amount < 0 ? 'debit' : 'credit';
            amount = Math.abs(amount);
          } else {
            // Separate debit/credit columns
            const debitField = format.columns.debit !== undefined && typeof format.columns.debit === 'number'
              ? fields[format.columns.debit] : '';
            const creditField = format.columns.credit !== undefined && typeof format.columns.credit === 'number'
              ? fields[format.columns.credit] : '';
            
            const debitAmount = this.parseAmount(debitField, format.currencySymbol);
            const creditAmount = this.parseAmount(creditField, format.currencySymbol);
            
            if (debitAmount > 0) {
              amount = debitAmount;
              transactionType = 'debit';
            } else if (creditAmount > 0) {
              amount = creditAmount;
              transactionType = 'credit';
            }
          }
          
          // Skip zero amount transactions
          if (amount === 0) continue;
          
          // Extract balance if available
          let balance: number | undefined;
          if (format.columns.balance !== undefined && typeof format.columns.balance === 'number') {
            const balanceField = fields[format.columns.balance];
            if (balanceField) {
              balance = this.parseAmount(balanceField, format.currencySymbol);
            }
          }
          
          // Extract merchant and categorize
          const { merchant } = this.categorizeDescription(description);
          
          // Build transaction
          const transaction: ParsedTransaction = {
            date,
            amount,
            currency: format.country === 'UK' ? 'GBP' : 
                     format.country === 'US' ? 'USD' :
                     format.country === 'IN' ? 'INR' : 'USD',
            description,
            merchant,
            balance,
            transactionType,
            rawData: {
              format: format.name,
              lineNumber: i + 2, // +2 because we skip header and arrays are 0-indexed
              originalFields: fields
            }
          };
          
          // Add reference if available
          if (format.columns.reference !== undefined && typeof format.columns.reference === 'number') {
            const referenceField = fields[format.columns.reference];
            if (referenceField) {
              transaction.reference = referenceField;
            }
          }
          
          transactions.push(transaction);
          
        } catch (error) {
          errors.push(`Line ${i + 2}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      return { transactions, format, errors };
      
    } catch (error) {
      errors.push(`Parsing error: ${error instanceof Error ? error.message : String(error)}`);
      return { transactions: [], format: null, errors };
    }
  }
  
  private parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Don't forget the last field
    fields.push(current.trim());
    
    return fields;
  }
  
  public getSupportedFormats(): BankFormat[] {
    return BANK_FORMATS;
  }
  
  public getFormatsByCountry(country: string): BankFormat[] {
    return BANK_FORMATS.filter(format => 
      format.country === country || format.country === 'GLOBAL'
    );
  }
}

// Export singleton instance
export const bankParser = new BankStatementParser();