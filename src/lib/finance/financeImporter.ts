// Enhanced Finance Importer - Fixed version for MeshOS
// src/lib/finance/enhancedFinanceImporter.ts

interface ExpenseItem {
  date: Date;
  description: string;
  amount: number;
  category: string;
  subcategory?: string;
  source: string;
  items?: string[];
  vendor?: string;
}

interface CryptoHolding {
  symbol: string;
  network: string;
  price: number;
  quantity: number;
  currentValue: number;
  change: number;
}

interface BankTransaction {
  date: Date;
  valueDate: Date;
  description: string;
  amount: number;
  balance: number;
  type: string;
  drCr: string;
  reference?: string;
}

export class EnhancedFinanceImporter {
  
  // Enhanced categorization system based on your actual expenses
  private categorizeExpense(description: string, amount: number, vendor?: string): { category: string; subcategory?: string } {
    const desc = description.toLowerCase();
    
    // Food & Grocery (detailed breakdown)
    if (desc.includes('zepto') || desc.includes('blinkit') || desc.includes('swiggy instamart') || desc.includes('groceries')) {
      if (desc.includes('bread') || desc.includes('milk') || desc.includes('eggs') || desc.includes('rice')) {
        return { category: 'Food & Grocery', subcategory: 'Staples' };
      } else if (desc.includes('snacks') || desc.includes('chips') || desc.includes('chocolate')) {
        return { category: 'Food & Grocery', subcategory: 'Snacks' };
      } else if (desc.includes('vegetables') || desc.includes('fruits') || desc.includes('tomato')) {
        return { category: 'Food & Grocery', subcategory: 'Fresh Produce' };
      }
      return { category: 'Food & Grocery', subcategory: 'General' };
    }
    
    // Pet Care (your major expense category)
    if (desc.includes('royal canin') || desc.includes('pet') || desc.includes('supertails') || 
        desc.includes('poop bags') || desc.includes('cat') || desc.includes('litter')) {
      if (desc.includes('food') || desc.includes('royal canin')) {
        return { category: 'Pet Care', subcategory: 'Food' };
      } else if (desc.includes('litter') || desc.includes('poop bags')) {
        return { category: 'Pet Care', subcategory: 'Hygiene' };
      }
      return { category: 'Pet Care', subcategory: 'General' };
    }
    
    // Food Delivery
    if (desc.includes('swiggy') || desc.includes('zomato') || desc.includes('food delivery') || 
        desc.includes('dominos') || desc.includes('pizza') || desc.includes('burger')) {
      return { category: 'Food Delivery', subcategory: 'Meals' };
    }
    
    // Beverages (your energy drinks, etc.)
    if (desc.includes('mountain dew') || desc.includes('energy drink') || desc.includes('coffee') || 
        desc.includes('tea') || desc.includes('drink') || desc.includes('beverage')) {
      return { category: 'Food & Grocery', subcategory: 'Beverages' };
    }
    
    // MK Retail (your biggest optimization target)
    if (desc.includes('mk retail') || vendor?.toLowerCase().includes('mk retail')) {
      return { category: 'Food & Grocery', subcategory: 'MK Retail' };
    }
    
    // Rent & Housing
    if (desc.includes('rent') || desc.includes('shettyarjun') || amount === 10872) {
      return { category: 'Housing', subcategory: 'Rent' };
    }
    
    // Healthcare & Medicine
    if (desc.includes('bupropion') || desc.includes('medicine') || desc.includes('pharmacy') || 
        desc.includes('apollo') || desc.includes('doctor')) {
      return { category: 'Healthcare', subcategory: 'Medicine' };
    }
    
    // Transportation
    if (desc.includes('yulu') || desc.includes('uber') || desc.includes('ola') || desc.includes('taxi')) {
      return { category: 'Transportation', subcategory: 'Rides' };
    }
    
    // Subscriptions
    if (desc.includes('spotify') || desc.includes('netflix') || desc.includes('google one') || 
        desc.includes('apple tv') || desc.includes('jiostar') || desc.includes('subscription')) {
      return { category: 'Subscriptions', subcategory: 'Entertainment' };
    }
    
    // Fitness & Health
    if (desc.includes('gym') || desc.includes('fitness') || desc.includes('workout')) {
      return { category: 'Health & Fitness', subcategory: 'Gym' };
    }
    
    // Savings/Investment
    if (desc.includes('transfer to pot') || desc.includes('investment') || desc.includes('saving')) {
      return { category: 'Savings/Investment', subcategory: 'Pot Transfer' };
    }
    
    // Domestic Help
    if (desc.includes('cook') || desc.includes('maid') || desc.includes('domestic')) {
      return { category: 'Domestic Help', subcategory: 'Salary' };
    }
    
    // UPI Transfers (need better categorization)
    if (desc.includes('upi') || desc.includes('transfer')) {
      return { category: 'UPI Transfer', subcategory: 'General' };
    }
    
    return { category: 'Other', subcategory: 'Uncategorized' };
  }
  
  // Parse your expenses.txt format with enhanced categorization
  parseManualExpenses(textContent: string): ExpenseItem[] {
    const expenses: ExpenseItem[] = [];
    const lines = textContent.split('\n');
    
    let currentDate: Date | null = null;
    let currentSource = 'Manual';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Parse date entries like "2/4 - oil+ocean peach drink - 221 total"
      const dateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\s*-\s*(.+?)\s*-\s*(\d+)\s*total/i);
      if (dateMatch) {
        const [, day, month, description, amount] = dateMatch;
        currentDate = new Date(2025, parseInt(month) - 1, parseInt(day));
        
        const { category, subcategory } = this.categorizeExpense(description, parseInt(amount));
        
        expenses.push({
          date: currentDate,
          description: description.trim(),
          amount: parseInt(amount),
          category,
          subcategory,
          source: currentSource
        });
        continue;
      }
      
      // Enhanced source detection
      const sourceDetection = [
        { keywords: ['zepto'], source: 'Zepto' },
        { keywords: ['swiggy'], source: 'Swiggy' },
        { keywords: ['blinkit'], source: 'Blinkit' },
        { keywords: ['supertails'], source: 'Supertails' },
        { keywords: ['mk retail'], source: 'MK Retail' }
      ];
      
      for (const { keywords, source } of sourceDetection) {
        if (keywords.some(keyword => trimmed.toLowerCase().includes(keyword))) {
          currentSource = source;
          break;
        }
      }
      
      // Parse detailed order entries like "17/5 - Pet Poop Bags 299, Bread 53... Total 550"
      const detailedMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\s*-\s*(.+?)Total\s*(\d+)/i);
      if (detailedMatch) {
        const [, day, month, itemsDesc, total] = detailedMatch;
        const date = new Date(2025, parseInt(month) - 1, parseInt(day));
        
        const { category, subcategory } = this.categorizeExpense(itemsDesc, parseInt(total), currentSource);
        
        expenses.push({
          date: date,
          description: itemsDesc.trim(),
          amount: parseInt(total),
          category,
          subcategory,
          source: currentSource,
          items: itemsDesc.split(',').map(item => item.trim())
        });
        continue;
      }
      
      // Parse simple totals with context
      const totalMatch = trimmed.match(/Total Paid:\s*(\d+)/i);
      if (totalMatch && currentDate) {
        const amount = parseInt(totalMatch[1]);
        const { category, subcategory } = this.categorizeExpense('Food Order', amount, currentSource);
        
        expenses.push({
          date: currentDate,
          description: `${currentSource} Order`,
          amount: amount,
          category,
          subcategory,
          source: currentSource
        });
      }
    }
    
    return expenses;
  }
  
  // Fixed crypto holdings parser
  parseCryptoHoldings(textContent: string): CryptoHolding[] {
    const lines = textContent.split('\n');
    const holdings: CryptoHolding[] = [];
    
    console.log('₿ Parsing crypto holdings...');
    
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
          
          // Parse "Price: $0.99 | Change: -0.0%"
          const priceMatch = dataLine.match(/Price:\s*\$?([\d,]+\.?\d*)\s*\|\s*Change:\s*([-+]?[\d.]+)%/);
          if (priceMatch) {
            price = parseFloat(priceMatch[1].replace(/,/g, ''));
            change = parseFloat(priceMatch[2]);
          }
          
          // Parse "Quantity: 62.192612 | Value: $62.18"
          const quantityMatch = dataLine.match(/Quantity:\s*([\d,]+\.?\d*)\s*\|\s*Value:\s*\$?([\d,]+\.?\d*)/);
          if (quantityMatch) {
            quantity = parseFloat(quantityMatch[1].replace(/,/g, ''));
            value = parseFloat(quantityMatch[2].replace(/,/g, ''));
            break; // Found all needed data
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
          
          console.log(`₿ Parsed: ${symbol} - $${value} (${quantity} @ $${price})`);
        }
      }
    }
    
    console.log(`₿ Total holdings parsed: ${holdings.length}, Total value: $${holdings.reduce((sum, h) => sum + h.currentValue, 0)}`);
    return holdings;
  }
  
  // Enhanced bank transaction parser
  parseBankTransactions(csvContent: string): BankTransaction[] {
    const lines = csvContent.split('\n');
    const transactions: BankTransaction[] = [];
    
    // Skip header and asterisk line
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.includes('Opening Balance')) continue;
      
      try {
        const fields = this.parseCSVLine(line);
        
        if (fields.length < 9) continue;
        
        const [date, valueDate, particulars, tranType, chequeDetails, withdrawals, deposits, balance, drCr] = fields;
        
        if (!date || date === '******') continue;
        
        const parsedDate = this.parseDate(date);
        const parsedValueDate = this.parseDate(valueDate);
        
        if (!parsedDate) continue;
        
        const withdrawalAmount = parseFloat(withdrawals?.replace(/,/g, '') || '0');
        const depositAmount = parseFloat(deposits?.replace(/,/g, '') || '0');
        const amount = depositAmount > 0 ? depositAmount : -withdrawalAmount;
        
        if (amount === 0) continue;
        
        transactions.push({
          date: parsedDate,
          valueDate: parsedValueDate || parsedDate,
          description: particulars.trim(),
          amount: amount,
          balance: parseFloat(balance?.replace(/,/g, '') || '0'),
          type: tranType,
          drCr: drCr,
          reference: chequeDetails || undefined
        });
        
      } catch (error) {
        console.warn(`⚠️ Error parsing bank record: ${error.message}`);
      }
    }
    
    return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
  }
  
  // Utility methods
  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
  
  private parseDate(dateStr: string): Date | null {
    if (!dateStr || dateStr === '******') return null;
    
    try {
      // Handle DD/MM/YYYY format
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // JS months are 0-based
        const year = parseInt(parts[2]);
        return new Date(year, month, day);
      }
    } catch (error) {
      console.warn(`Invalid date: ${dateStr}`);
    }
    
    return null;
  }
  
  // Generate category breakdown with subcategories
  generateCategoryBreakdown(expenses: ExpenseItem[]): any[] {
    const categoryMap = new Map<string, { total: number; subcategories: Map<string, number>; transactions: ExpenseItem[] }>();
    
    for (const expense of expenses) {
      const category = expense.category;
      const subcategory = expense.subcategory || 'General';
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          total: 0,
          subcategories: new Map(),
          transactions: []
        });
      }
      
      const categoryData = categoryMap.get(category)!;
      categoryData.total += expense.amount;
      categoryData.subcategories.set(subcategory, (categoryData.subcategories.get(subcategory) || 0) + expense.amount);
      categoryData.transactions.push(expense);
    }
    
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        total: data.total,
        percentage: (data.total / totalExpenses) * 100,
        subcategories: Object.fromEntries(data.subcategories),
        transactions: data.transactions.slice(0, 5) // Latest 5 transactions
      }))
      .sort((a, b) => b.total - a.total);
  }
}