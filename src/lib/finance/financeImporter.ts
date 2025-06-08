// src/lib/finance/financeImporter.ts - FIXED VERSION
import { createServerClient } from '../supabase/server';
import type { AstroCookies } from 'astro';

export interface FinanceData {
  expenses: any[];
  crypto: any[];
  bank: any[];
}

export async function importFinanceData(
  files: { bank?: string; crypto?: string; expenses?: string },
  userId: string,
  cookies: AstroCookies
): Promise<{ success: boolean; message: string; data?: any }> {
  
  console.log('🏦 Starting finance import for user:', userId);
  
  const supabase = createServerClient(cookies);
  const financeData: FinanceData = { expenses: [], crypto: [], bank: [] };
  
  try {
    // Parse bank statement if provided
    if (files.bank) {
      console.log('🏦 Parsing bank statement...');
      const bankTransactions = parseBankCSV(files.bank);
      console.log(`🏦 Total bank transactions: ${bankTransactions.length}`);
      financeData.bank = bankTransactions;
      
      // Convert bank transactions to metrics
      const bankMetrics = bankTransactions
        .filter(transaction => isValidTransaction(transaction)) // Filter out invalid transactions
        .map(transaction => {
          const parsedDate = parseFlexibleDate(transaction.date);
          if (!parsedDate) {
            console.warn(`⚠️ Invalid date found: ${transaction.date}`);
            return null;
          }
          
          return {
            user_id: userId,
            type: transaction.amount > 0 ? 'income' : 'expense',
            value: Math.abs(transaction.amount),
            unit: 'INR',
            metadata: {
              description: transaction.description,
              category: categorizeTransaction(transaction.description),
              originalAmount: transaction.amount,
              transactionType: transaction.amount > 0 ? 'credit' : 'debit',
              reference: transaction.reference || null,
              balance: transaction.balance || null
            },
            recorded_at: parsedDate.toISOString()
          };
        })
        .filter(metric => metric !== null); // Remove null entries
      
      financeData.expenses = bankMetrics;
      
      console.log(`💰 Processed ${bankMetrics.length} valid bank metrics`);
      
      if (bankMetrics.length > 0) {
        const { error: bankError } = await supabase
          .from('metrics')
          .insert(bankMetrics);
          
        if (bankError) {
          console.error('❌ Bank metrics insert error:', bankError);
          throw bankError;
        }
      }
    }
    
    // Parse crypto holdings if provided
    if (files.crypto) {
      console.log('₿ Parsing crypto holdings...');
      const cryptoHoldings = parseCryptoHoldings(files.crypto);
      console.log(`₿ Total crypto holdings: ${cryptoHoldings.length}`);
      financeData.crypto = cryptoHoldings;
      
      // Convert crypto to metrics
      const cryptoMetrics = cryptoHoldings.map(holding => ({
        user_id: userId,
        type: 'crypto_value',
        value: holding.currentValue,
        unit: 'USD',
        metadata: {
          symbol: holding.symbol,
          quantity: holding.quantity,
          price: holding.price,
          change: holding.change,
          network: holding.network
        },
        recorded_at: new Date().toISOString()
      }));
      
      if (cryptoMetrics.length > 0) {
        const { error: cryptoError } = await supabase
          .from('metrics')
          .insert(cryptoMetrics);
          
        if (cryptoError) {
          console.error('❌ Crypto metrics insert error:', cryptoError);
          throw cryptoError;
        }
      }
    }
    
    // Parse manual expenses if provided (from expenses.txt)
    if (files.expenses) {
      console.log('🛒 Parsing manual expenses...');
      const expenseData = parseManualExpenses(files.expenses);
      console.log(`🛒 Total manual expenses: ${expenseData.length}`);
      
      // Convert to metrics
      const expenseMetrics = expenseData.map(expense => ({
        user_id: userId,
        type: 'expense',
        value: expense.amount,
        unit: 'INR',
        metadata: {
          description: expense.description,
          category: expense.category,
          source: expense.source,
          items: expense.items || null
        },
        recorded_at: expense.date.toISOString()
      }));
      
      financeData.expenses = [...financeData.expenses, ...expenseMetrics];
      
      if (expenseMetrics.length > 0) {
        const { error: expenseError } = await supabase
          .from('metrics')
          .insert(expenseMetrics);
          
        if (expenseError) {
          console.error('❌ Manual expense metrics insert error:', expenseError);
          throw expenseError;
        }
      }
    }
    if (files.subscriptions) {
      console.log('📱 Parsing subscriptions...');
      const subscriptions = parseSubscriptions(files.subscriptions);
      
      // Convert subscriptions to metrics
      const subscriptionMetrics = subscriptions.map(sub => ({
        user_id: userId,
        type: 'subscription',
        value: sub.cost,
        unit: sub.currency,
        metadata: {
          service: sub.service,
          plan: sub.plan,
          renewalDate: sub.renewalDate,
          status: sub.status
        },
        recorded_at: new Date().toISOString()
      }));
      
      if (subscriptionMetrics.length > 0) {
        const { error: subError } = await supabase
          .from('metrics')
          .insert(subscriptionMetrics);
          
        if (subError) {
          console.error('❌ Subscription metrics insert error:', subError);
          throw subError;
        }
      }
    }
    
    console.log('📊 Parsed finance data:', {
      expenses: financeData.expenses.length,
      crypto: financeData.crypto.length,
      bank: financeData.bank.length
    });
    
    return {
      success: true,
      message: `Successfully imported finance data: ${financeData.expenses.length} expenses, ${financeData.crypto.length} crypto holdings`,
      data: financeData
    };
    
  } catch (error: any) {
    console.error('❌ Finance import error:', error);
    return {
      success: false,
      message: `Finance import failed: ${error.message}`
    };
  }
}

// ROBUST DATE PARSER - Handles multiple Indian date formats
function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') {
    return null;
  }
  
  const cleanDate = dateStr.trim();
  
  // Try multiple date formats common in Indian banking
  const formats = [
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // YYYY-MM-DD (ISO format)
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // DD.MM.YYYY
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    // MM/DD/YYYY (US format)
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  ];
  
  for (const format of formats) {
    const match = cleanDate.match(format);
    if (match) {
      let day: number, month: number, year: number;
      
      if (format.source.startsWith('^(\\d{4})')) {
        // YYYY-MM-DD format
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      } else {
        // DD/MM/YYYY or DD-MM-YYYY format (most common in India)
        day = parseInt(match[1]);
        month = parseInt(match[2]);
        year = parseInt(match[3]);
      }
      
      // Validate date components
      if (year >= 1900 && year <= 2030 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        const date = new Date(year, month - 1, day); // month is 0-indexed in JS
        
        // Verify the date is valid (handles leap years, month lengths, etc.)
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
          return date;
        }
      }
    }
  }
  
  // Try native Date parsing as fallback
  const fallbackDate = new Date(cleanDate);
  if (!isNaN(fallbackDate.getTime())) {
    return fallbackDate;
  }
  
  console.warn(`⚠️ Unable to parse date: "${dateStr}"`);
  return null;
}

// Validate transaction has required fields
function isValidTransaction(transaction: any): boolean {
  return transaction && 
         transaction.date && 
         typeof transaction.amount === 'number' && 
         !isNaN(transaction.amount) &&
         transaction.description;
}

// Parse Jupiter Bank CSV format - FIXED for multi-line quoted fields
function parseBankCSV(csvContent: string) {
  console.log('🏦 Starting CSV parse...');
  
  // First, let's properly parse the CSV with quoted fields that may span multiple lines
  const transactions = [];
  const lines = csvContent.split('\n');
  
  // Find the header line (first line with actual column names)
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Date,Value Date,Particulars')) {
      headerIndex = i;
      break;
    }
  }
  
  if (headerIndex === -1) {
    console.warn('⚠️ No header found in CSV');
    return [];
  }
  
  console.log(`🏦 Found header at line ${headerIndex + 1}`);
  
  // Skip header and asterisk lines, find start of data
  let dataStart = headerIndex + 1;
  while (dataStart < lines.length && (lines[dataStart].includes('*') || !lines[dataStart].trim())) {
    dataStart++;
  }
  
  // Parse CSV properly handling quoted multi-line fields
  let currentRecord = '';
  let inQuotedField = false;
  
  for (let i = dataStart; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip empty lines and end markers
    if (!line.trim() || line.includes('GRAND TOTAL') || line.includes('****END')) {
      break;
    }
    
    // Handle quoted fields
    currentRecord += line;
    
    // Count quotes to determine if we're inside a quoted field
    const quoteCount = (line.match(/"/g) || []).length;
    if (quoteCount % 2 === 1) {
      inQuotedField = !inQuotedField;
    }
    
    // If we're not in a quoted field, this record is complete
    if (!inQuotedField) {
      const transaction = parseTransactionRecord(currentRecord);
      if (transaction) {
        transactions.push(transaction);
        console.log(`🏦 Parsed: ${transaction.date} | ${transaction.drCr} ₹${Math.abs(transaction.amount)} | ${transaction.description.substring(0, 30)}...`);
      }
      currentRecord = '';
    } else {
      // Add a space to continue the record on next line
      currentRecord += ' ';
    }
  }
  
  console.log(`🏦 Successfully parsed ${transactions.length} transactions`);
  return transactions;
}

// Parse a complete transaction record
function parseTransactionRecord(record: string) {
  // Clean up the record
  const cleanRecord = record.replace(/\s+/g, ' ').trim();
  
  // Split by commas, but handle quoted fields
  const fields = parseCSVRecord(cleanRecord);
  
  if (fields.length < 8) {
    console.warn(`⚠️ Insufficient fields in record: ${cleanRecord.substring(0, 50)}...`);
    return null;
  }
  
  try {
    const date = fields[0]?.trim();
    const valueDate = fields[1]?.trim();
    const particulars = fields[2]?.trim().replace(/"/g, ''); // Remove quotes
    const tranType = fields[3]?.trim();
    const chequeDetails = fields[4]?.trim();
    const withdrawals = fields[5]?.trim();
    const deposits = fields[6]?.trim();
    const balance = fields[7]?.trim();
    const drCr = fields[8]?.trim();
    
    // Skip opening balance entries
    if (particulars.toLowerCase().includes('opening balance')) {
      return null;
    }
    
    // Parse amount
    let amount = 0;
    if (withdrawals && withdrawals !== '') {
      amount = -parseFloat(withdrawals); // Withdrawal is negative
    } else if (deposits && deposits !== '') {
      amount = parseFloat(deposits); // Deposit is positive
    }
    
    // Parse balance
    const balanceValue = balance ? parseFloat(balance) : 0;
    
    // Validate date
    const parsedDate = parseFlexibleDate(date);
    if (!parsedDate) {
      console.warn(`⚠️ Invalid date: ${date}`);
      return null;
    }
    
    // Skip if no amount
    if (amount === 0) {
      return null;
    }
    
    return {
      date: date,
      valueDate: valueDate,
      description: particulars,
      amount: amount,
      balance: balanceValue,
      type: tranType,
      drCr: drCr,
      chequeDetails: chequeDetails
    };
    
  } catch (error) {
    console.warn(`⚠️ Error parsing record: ${error.message}`);
    return null;
  }
}

// Parse CSV record handling quoted fields properly
function parseCSVRecord(record: string): string[] {
  const fields = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < record.length) {
    const char = record[i];
    
    if (char === '"') {
      // Handle escaped quotes
      if (i + 1 < record.length && record[i + 1] === '"') {
        currentField += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
    i++;
  }
  
  // Add the last field
  fields.push(currentField);
  
  return fields;
}

// Parse CSV line handling quoted values
function parseCSVLine(line: string): string[] {
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

// Parse crypto holdings from text format - FIXED for your exact format
function parseCryptoHoldings(textContent: string) {
  const lines = textContent.split('\n');
  const holdings = [];
  
  console.log('₿ Crypto text content preview:', textContent.substring(0, 200));
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and headers
    if (!line || line.includes('Total Balance') || line.includes('Crypto Holdings')) {
      continue;
    }
    
    // Parse format: "1. USDC (Base)"
    const symbolMatch = line.match(/^\d+\.\s*(\w+)\s*\(([^)]+)\)/);
    if (symbolMatch) {
      const symbol = symbolMatch[1];
      const network = symbolMatch[2];
      
      // Look for the next lines with Price, Quantity, Value
      let priceValue = null, changeValue = null, quantityValue = null, dollarValue = null;
      
      // Check next few lines for data
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const dataLine = lines[j].trim();
        
        // Parse "Price: $0.99 | Change: -0.0%"
        const priceMatch = dataLine.match(/Price:\s*\$?([\d,]+\.?\d*)\s*\|\s*Change:\s*([-+]?[\d.]+)%/);
        if (priceMatch) {
          priceValue = parseFloat(priceMatch[1].replace(/,/g, ''));
          changeValue = parseFloat(priceMatch[2]);
        }
        
        // Parse "Quantity: 62.192612 | Value: $62.18"
        const quantityMatch = dataLine.match(/Quantity:\s*([\d,]+\.?\d*)\s*\|\s*Value:\s*\$?([\d,]+\.?\d*)/);
        if (quantityMatch) {
          quantityValue = parseFloat(quantityMatch[1].replace(/,/g, ''));
          dollarValue = parseFloat(quantityMatch[2].replace(/,/g, ''));
        }
      }
      
      // If we found all required data, add to holdings
      if (priceValue !== null && quantityValue !== null && dollarValue !== null) {
        holdings.push({
          symbol: symbol.toUpperCase(),
          network: network,
          price: priceValue,
          quantity: quantityValue,
          currentValue: dollarValue,
          change: changeValue || 0
        });
        
        console.log(`₿ Parsed: ${symbol} - ${dollarValue} (${quantityValue} @ ${priceValue})`);
      }
    }
  }
  
  console.log(`₿ Total holdings parsed: ${holdings.length}`);
  return holdings;
}

// Parse manual expenses from your expenses.txt format
function parseManualExpenses(textContent: string) {
  const expenses = [];
  const lines = textContent.split('\n');
  
  let currentDate = null;
  let currentSource = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Parse date entries like "2/4 - oil+ocean peach drink - 221 total"
    const dateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\s*-\s*(.+?)\s*-\s*(\d+)\s*total/i);
    if (dateMatch) {
      const [, day, month, description, amount] = dateMatch;
      currentDate = new Date(2025, parseInt(month) - 1, parseInt(day)); // Assuming 2025
      
      expenses.push({
        date: currentDate,
        description: description.trim(),
        amount: parseInt(amount),
        category: categorizeExpense(description),
        source: currentSource || 'Manual'
      });
      continue;
    }
    
    // Parse source headers like "april - zepto -" or "Swiggy Food + Instamart"
    if (trimmed.toLowerCase().includes('zepto') || 
        trimmed.toLowerCase().includes('swiggy') || 
        trimmed.toLowerCase().includes('blinkit') ||
        trimmed.toLowerCase().includes('zomato') ||
        trimmed.toLowerCase().includes('supertails')) {
      
      if (trimmed.toLowerCase().includes('zepto')) currentSource = 'Zepto';
      else if (trimmed.toLowerCase().includes('swiggy')) currentSource = 'Swiggy';
      else if (trimmed.toLowerCase().includes('blinkit')) currentSource = 'Blinkit';
      else if (trimmed.toLowerCase().includes('zomato')) currentSource = 'Zomato';
      else if (trimmed.toLowerCase().includes('supertails')) currentSource = 'Supertails';
      continue;
    }
    
    // Parse specific order entries like "Total Paid: 222"
    const totalMatch = trimmed.match(/Total Paid:\s*(\d+)/i);
    if (totalMatch && currentDate) {
      const amount = parseInt(totalMatch[1]);
      // Look back a few lines for order description
      let description = 'Food Order';
      expenses.push({
        date: currentDate,
        description: description,
        amount: amount,
        category: 'Food',
        source: currentSource || 'Food Delivery'
      });
      continue;
    }
    
    // Parse Instamart entries like "17/5 - Pet Poop Bags 299, Bread 53... Total 550"
    const instamartMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\s*-\s*(.+?)Total\s*(\d+)/i);
    if (instamartMatch) {
      const [, day, month, itemsDesc, total] = instamartMatch;
      const date = new Date(2025, parseInt(month) - 1, parseInt(day));
      
      expenses.push({
        date: date,
        description: itemsDesc.trim(),
        amount: parseInt(total),
        category: categorizeExpense(itemsDesc),
        source: 'Instamart',
        items: itemsDesc.split(',').map(item => item.trim())
      });
      continue;
    }
    
    // Parse Supertails entries like "13/4 - Carniwel Dry Food 2kgs - 890"
    const supertailsMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\s*-\s*(.+?)\s*-\s*(\d+)/i);
    if (supertailsMatch && currentSource === 'Supertails') {
      const [, day, month, description, amount] = supertailsMatch;
      const date = new Date(2025, parseInt(month) - 1, parseInt(day));
      
      expenses.push({
        date: date,
        description: description.trim(),
        amount: parseInt(amount),
        category: 'Pet Care',
        source: 'Supertails'
      });
      continue;
    }
  }
  
  console.log(`🛒 Parsed ${expenses.length} manual expenses`);
  return expenses;
}

// Categorize expenses based on description and source
function categorizeExpense(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('cat') || desc.includes('pet') || desc.includes('litter') || desc.includes('food') && desc.includes('carniwel')) return 'Pet Care';
  if (desc.includes('pizza') || desc.includes('burger') || desc.includes('chicken') || desc.includes('food')) return 'Food';
  if (desc.includes('milk') || desc.includes('bread') || desc.includes('eggs') || desc.includes('paneer') || desc.includes('grocery')) return 'Groceries';
  if (desc.includes('protein') || desc.includes('creatine') || desc.includes('workout') || desc.includes('gym')) return 'Fitness';
  if (desc.includes('shampoo') || desc.includes('conditioner') || desc.includes('toothpaste') || desc.includes('gel')) return 'Personal Care';
  if (desc.includes('drink') || desc.includes('mountain dew') || desc.includes('energy') || desc.includes('coffee')) return 'Beverages';
  if (desc.includes('candy') || desc.includes('ice cream') || desc.includes('chocolate')) return 'Snacks';
  if (desc.includes('towel') || desc.includes('freshener') || desc.includes('bags') || desc.includes('cleaner')) return 'Household';
  
  return 'Other';
}

// Categorize transactions based on description - Enhanced for Jupiter Bank
function categorizeTransaction(description: string): string {
  if (!description) return 'Other';
  
  const desc = description.toLowerCase();
  
  // UPI transactions
  if (desc.includes('upi')) {
    if (desc.includes('zomato') || desc.includes('swiggy') || desc.includes('food')) return 'Food Delivery';
    if (desc.includes('blinkit') || desc.includes('zepto') || desc.includes('dunzo')) return 'Groceries';
    if (desc.includes('spotify') || desc.includes('netflix') || desc.includes('prime')) return 'Subscriptions';
    if (desc.includes('uber') || desc.includes('ola') || desc.includes('rapido')) return 'Transportation';
    if (desc.includes('paytm') || desc.includes('gpay') || desc.includes('phonepe')) return 'Digital Wallet';
    return 'UPI Transfer';
  }
  
  // Jupiter-specific patterns
  if (desc.includes('transfer to pot') || desc.includes('ifn/neo')) return 'Savings/Investment';
  if (desc.includes('sbint') || desc.includes('interest')) return 'Interest';
  if (desc.includes('atm') || desc.includes('withdrawal')) return 'Cash Withdrawal';
  if (desc.includes('imps') || desc.includes('neft') || desc.includes('rtgs')) return 'Bank Transfer';
  
  // General patterns
  if (desc.includes('grocery') || desc.includes('supermarket') || desc.includes('blinkit') || desc.includes('zepto')) return 'Groceries';
  if (desc.includes('restaurant') || desc.includes('food') || desc.includes('zomato') || desc.includes('swiggy')) return 'Food Delivery';
  if (desc.includes('fuel') || desc.includes('petrol') || desc.includes('diesel')) return 'Fuel';
  if (desc.includes('medical') || desc.includes('pharmacy') || desc.includes('hospital')) return 'Healthcare';
  if (desc.includes('electricity') || desc.includes('gas') || desc.includes('water') || desc.includes('utility')) return 'Utilities';
  if (desc.includes('rent') || desc.includes('maintenance')) return 'Housing';
  if (desc.includes('salary') || desc.includes('income')) return 'Salary';
  if (desc.includes('refund') || desc.includes('cashback')) return 'Refund';
  
  return 'Other';
}