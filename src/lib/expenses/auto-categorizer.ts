// src/lib/expenses/auto-categorizer.ts - Smart Expense Categorization System
// Uses merchant patterns, ML-like rules, and user learning

interface CategoryPattern {
  keywords: string[];
  merchants: string[];
  patterns: RegExp[];
  confidence: number;
  categoryName: string;
  subcategories?: string[];
}

interface UKSpecificPattern {
  postcode?: string;
  region?: string;
  priceRange?: { min: number; max: number };
  timePattern?: string; // 'weekend', 'weekday', 'evening', etc.
}

interface CategoryRule {
  pattern: CategoryPattern;
  ukSpecific?: UKSpecificPattern;
  globalApplicable: boolean;
}

export class AutoCategorizer {
  private rules: CategoryRule[] = [];

  constructor() {
    this.initializeRules();
  }

  private initializeRules(): void {
    this.rules = [
      // Grocery & Food
      {
        pattern: {
          keywords: ['grocery', 'food', 'market', 'supermarket', 'organic', 'deli', 'bakery', 'butcher'],
          merchants: ['TESCO', 'SAINSBURYS', 'ASDA', 'MORRISONS', 'WAITROSE', 'LIDL', 'ALDI', 'MARKS & SPENCER', 'WHOLE FOODS', 'TRADER JOES', 'KROGER', 'WALMART'],
          patterns: [
            /tesco.*stores?/i,
            /sainsbury'?s/i,
            /asda.*store/i,
            /morrisons/i,
            /waitrose/i,
            /marks.*spencer/i,
            /m&s/i,
            /co.op/i,
            /iceland.*foods?/i,
            /big.*bazaar/i,
            /reliance.*fresh/i,
            /more.*megastore/i
          ],
          confidence: 0.9,
          categoryName: 'Food & Dining',
          subcategories: ['Groceries', 'Supermarket']
        },
        ukSpecific: {
          priceRange: { min: 5, max: 200 } // Typical UK grocery range
        },
        globalApplicable: true
      },

      // Restaurants & Takeaway
      {
        pattern: {
          keywords: ['restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'chinese', 'indian', 'takeaway', 'delivery'],
          merchants: ['MCDONALDS', 'KFC', 'SUBWAY', 'STARBUCKS', 'COSTA', 'GREGGS', 'NANDOS', 'DOMINOS', 'PIZZA HUT', 'UBER EATS', 'DELIVEROO', 'JUST EAT'],
          patterns: [
            /mcdonald'?s/i,
            /burger.*king/i,
            /kfc/i,
            /subway/i,
            /starbucks/i,
            /costa.*coffee/i,
            /greggs/i,
            /nando'?s/i,
            /pizza.*hut/i,
            /domino'?s/i,
            /uber.*eats/i,
            /deliveroo/i,
            /just.*eat/i,
            /zomato/i,
            /swiggy/i,
            /food.*panda/i
          ],
          confidence: 0.85,
          categoryName: 'Food & Dining',
          subcategories: ['Restaurants', 'Fast Food', 'Coffee', 'Takeaway']
        },
        globalApplicable: true
      },

      // Transportation
      {
        pattern: {
          keywords: ['transport', 'bus', 'train', 'taxi', 'uber', 'lyft', 'petrol', 'diesel', 'fuel', 'parking'],
          merchants: ['TFL', 'UBER', 'LYFT', 'SHELL', 'BP', 'ESSO', 'TEXACO', 'OLA', 'RAPIDO'],
          patterns: [
            /tfl.*travel/i,
            /transport.*london/i,
            /national.*express/i,
            /virgin.*trains/i,
            /uber/i,
            /lyft/i,
            /shell/i,
            /bp.*petrol/i,
            /esso/i,
            /texaco/i,
            /parking/i,
            /congestion.*charge/i,
            /oyster/i,
            /ola.*cabs/i,
            /rapido/i,
            /indian.*oil/i,
            /bharat.*petroleum/i
          ],
          confidence: 0.85,
          categoryName: 'Transportation',
          subcategories: ['Public Transport', 'Fuel', 'Taxi', 'Parking']
        },
        ukSpecific: {
          priceRange: { min: 2, max: 100 } // TFL/transport typical range
        },
        globalApplicable: true
      },

      // Shopping
      {
        pattern: {
          keywords: ['clothing', 'fashion', 'shoes', 'electronics', 'amazon', 'shopping', 'retail'],
          merchants: ['AMAZON', 'ARGOS', 'JOHN LEWIS', 'CURRYS', 'H&M', 'ZARA', 'PRIMARK', 'NEXT', 'UNIQLO'],
          patterns: [
            /amazon/i,
            /argos/i,
            /john.*lewis/i,
            /currys/i,
            /h&m/i,
            /zara/i,
            /primark/i,
            /next.*retail/i,
            /uniqlo/i,
            /flipkart/i,
            /myntra/i,
            /ajio/i,
            /nykaa/i,
            /ebay/i
          ],
          confidence: 0.8,
          categoryName: 'Shopping',
          subcategories: ['Clothing', 'Electronics', 'Online Shopping']
        },
        globalApplicable: true
      },

      // Bills & Utilities
      {
        pattern: {
          keywords: ['electric', 'gas', 'water', 'internet', 'mobile', 'phone', 'council tax', 'rent', 'mortgage'],
          merchants: ['EDF', 'BRITISH GAS', 'THAMES WATER', 'BT', 'VIRGIN MEDIA', 'EE', 'VODAFONE', 'O2'],
          patterns: [
            /british.*gas/i,
            /edf.*energy/i,
            /thames.*water/i,
            /council.*tax/i,
            /virgin.*media/i,
            /bt.*group/i,
            /vodafone/i,
            /o2.*uk/i,
            /ee.*limited/i,
            /sky.*uk/i,
            /direct.*debit/i,
            /standing.*order/i,
            /reliance.*jio/i,
            /airtel/i,
            /bsnl/i,
            /tata.*power/i,
            /adani.*power/i
          ],
          confidence: 0.9,
          categoryName: 'Bills & Utilities',
          subcategories: ['Electricity', 'Gas', 'Water', 'Internet', 'Mobile', 'Council Tax']
        },
        globalApplicable: true
      },

      // Entertainment & Subscriptions
      {
        pattern: {
          keywords: ['netflix', 'spotify', 'cinema', 'theatre', 'gym', 'subscription', 'streaming'],
          merchants: ['NETFLIX', 'SPOTIFY', 'AMAZON PRIME', 'DISNEY+', 'APPLE', 'YOUTUBE', 'ODEON', 'CINEWORLD', 'VUE'],
          patterns: [
            /netflix/i,
            /spotify/i,
            /amazon.*prime/i,
            /disney.*plus/i,
            /apple.*music/i,
            /youtube.*premium/i,
            /odeon.*cinemas/i,
            /cineworld/i,
            /vue.*cinemas/i,
            /gym/i,
            /fitness/i,
            /pure.*gym/i,
            /virgin.*active/i,
            /hotstar/i,
            /zee5/i,
            /sony.*liv/i,
            /jio.*cinema/i
          ],
          confidence: 0.85,
          categoryName: 'Entertainment',
          subcategories: ['Streaming', 'Cinema', 'Gym', 'Subscriptions']
        },
        globalApplicable: true
      },

      // Healthcare
      {
        pattern: {
          keywords: ['pharmacy', 'doctor', 'hospital', 'medical', 'dental', 'health', 'prescription'],
          merchants: ['BOOTS', 'SUPERDRUG', 'NHS', 'BUPA', 'APOLLO', 'FORTIS', 'MAX HEALTHCARE'],
          patterns: [
            /boots.*pharmacy/i,
            /superdrug/i,
            /nhs/i,
            /bupa/i,
            /private.*healthcare/i,
            /dental/i,
            /apollo.*hospital/i,
            /fortis.*healthcare/i,
            /max.*healthcare/i,
            /medplus/i,
            /pharmacy/i,
            /chemist/i
          ],
          confidence: 0.8,
          categoryName: 'Healthcare',
          subcategories: ['Pharmacy', 'Medical', 'Dental', 'Insurance']
        },
        globalApplicable: true
      },

      // UK-Specific Categories
      {
        pattern: {
          keywords: ['tv licence', 'bbc', 'council tax'],
          merchants: ['TV LICENSING', 'BBC'],
          patterns: [
            /tv.*licens/i,
            /bbc.*tv/i,
            /council.*tax/i
          ],
          confidence: 0.95,
          categoryName: 'Bills & Utilities',
          subcategories: ['TV Licence', 'Council Tax']
        },
        ukSpecific: {
          priceRange: { min: 10, max: 200 }
        },
        globalApplicable: false
      },

      // Pub & Social (UK)
      {
        pattern: {
          keywords: ['pub', 'bar', 'social', 'drinks', 'wetherspoon'],
          merchants: ['WETHERSPOON', 'GREENE KING', 'PUNCH TAVERNS'],
          patterns: [
            /wetherspoon/i,
            /greene.*king/i,
            /punch.*taverns/i,
            /pub/i,
            /bar.*\w+/i,
            /social.*club/i
          ],
          confidence: 0.8,
          categoryName: 'Entertainment',
          subcategories: ['Pub & Drinks', 'Social']
        },
        ukSpecific: {
          priceRange: { min: 5, max: 80 },
          timePattern: 'evening'
        },
        globalApplicable: false
      }
    ];
  }

  public categorizeTransaction(
    description: string,
    merchant?: string,
    amount?: number,
    userCountry?: string,
    userSettings?: any
  ): {
    categoryName: string;
    subcategory?: string;
    confidence: number;
    reason: string;
  } {
    const searchText = `${description} ${merchant || ''}`.toLowerCase();
    const isUKUser = userCountry === 'UK';

    let bestMatch: {
      categoryName: string;
      subcategory?: string;
      confidence: number;
      reason: string;
    } | null = null;

    for (const rule of this.rules) {
      // Skip UK-specific rules for non-UK users
      if (rule.ukSpecific && !rule.globalApplicable && !isUKUser) {
        continue;
      }

      let confidence = 0;
      const matchReasons: string[] = [];

      // Check merchant exact match
      for (const rulemerchant of rule.pattern.merchants) {
        if (merchant && merchant.toUpperCase().includes(rulemerchant)) {
          confidence += 0.4;
          matchReasons.push(`merchant: ${rulemerchant}`);
          break;
        }
      }

      // Check pattern matching
      for (const pattern of rule.pattern.patterns) {
        if (pattern.test(searchText)) {
          confidence += 0.35;
          matchReasons.push(`pattern: ${pattern.source}`);
          break;
        }
      }

      // Check keyword matching
      const keywordMatches = rule.pattern.keywords.filter(keyword =>
        searchText.includes(keyword.toLowerCase())
      );
      if (keywordMatches.length > 0) {
        confidence += 0.2 * (keywordMatches.length / rule.pattern.keywords.length);
        matchReasons.push(`keywords: ${keywordMatches.join(', ')}`);
      }

      // Apply UK-specific boosts
      if (rule.ukSpecific && isUKUser && amount) {
        const { priceRange } = rule.ukSpecific;
        if (priceRange && amount >= priceRange.min && amount <= priceRange.max) {
          confidence += 0.1;
          matchReasons.push('UK price range match');
        }
      }

      // Normalize confidence by pattern's base confidence
      confidence *= rule.pattern.confidence;

      // Check if this is the best match so far
      if (confidence > 0.3 && (!bestMatch || confidence > bestMatch.confidence)) {
        // Determine subcategory
        let subcategory: string | undefined;
        if (rule.pattern.subcategories && rule.pattern.subcategories.length > 0) {
          // Simple subcategory matching based on keywords
          subcategory = this.determineSubcategory(searchText, rule.pattern.subcategories);
        }

        bestMatch = {
          categoryName: rule.pattern.categoryName,
          subcategory,
          confidence: Math.min(confidence, 1.0),
          reason: matchReasons.join('; ')
        };
      }
    }

    // Return best match or fallback
    return bestMatch || {
      categoryName: 'Other',
      confidence: 0.1,
      reason: 'No clear category match found'
    };
  }

  private determineSubcategory(searchText: string, subcategories: string[]): string | undefined {
    const subcategoryMap: Record<string, string[]> = {
      'Groceries': ['grocery', 'supermarket', 'food shopping'],
      'Fast Food': ['mcdonald', 'kfc', 'burger', 'quick'],
      'Coffee': ['coffee', 'starbucks', 'costa', 'cafe'],
      'Takeaway': ['takeaway', 'delivery', 'uber eats', 'deliveroo'],
      'Public Transport': ['tfl', 'bus', 'train', 'tube', 'metro'],
      'Fuel': ['petrol', 'diesel', 'fuel', 'shell', 'bp'],
      'Taxi': ['uber', 'lyft', 'taxi', 'cab'],
      'Electronics': ['electronics', 'computer', 'phone', 'tech'],
      'Clothing': ['clothing', 'fashion', 'shoes', 'wear'],
      'Streaming': ['netflix', 'spotify', 'prime', 'disney'],
      'Cinema': ['cinema', 'movie', 'film', 'odeon'],
      'Pharmacy': ['pharmacy', 'boots', 'medicine', 'prescription']
    };

    for (const subcategory of subcategories) {
      const keywords = subcategoryMap[subcategory] || [subcategory.toLowerCase()];
      if (keywords.some(keyword => searchText.includes(keyword))) {
        return subcategory;
      }
    }

    return subcategories[0]; // Default to first subcategory
  }

  public learnFromUserCorrection(
    description: string,
    merchant: string | undefined,
    amount: number,
    userCorrectedCategory: string,
    userCorrectedSubcategory?: string
  ): void {
    // This would update the ML model or rules based on user feedback
    // For now, we'll log it for future implementation
    console.log('Learning from user correction:', {
      description,
      merchant,
      amount,
      correctedCategory: userCorrectedCategory,
      correctedSubcategory: userCorrectedSubcategory
    });

    // In a real implementation, this would:
    // 1. Update merchant intelligence table
    // 2. Add new pattern rules
    // 3. Adjust confidence scores
    // 4. Train ML model with new data point
  }

  public analyzeSpendingPatterns(
    transactions: Array<{
      date: string;
      amount: number;
      category: string;
      merchant?: string;
      description: string;
    }>,
    userCountry?: string
  ): {
    insights: string[];
    recommendations: string[];
    alerts: string[];
  } {
    const insights: string[] = [];
    const recommendations: string[] = [];
    const alerts: string[] = [];

    if (transactions.length === 0) {
      return { insights, recommendations, alerts };
    }

    // Analyze spending by category
    const categorySpending: Record<string, number> = {};
    const merchantFrequency: Record<string, number> = {};
    
    for (const tx of transactions) {
      categorySpending[tx.category] = (categorySpending[tx.category] || 0) + tx.amount;
      if (tx.merchant) {
        merchantFrequency[tx.merchant] = (merchantFrequency[tx.merchant] || 0) + 1;
      }
    }

    // Find top spending category
    const topCategory = Object.entries(categorySpending)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topCategory) {
      const [category, amount] = topCategory;
      const percentage = (amount / transactions.reduce((sum, tx) => sum + tx.amount, 0) * 100).toFixed(1);
      insights.push(`Highest spending: ${category} (${percentage}% of total)`);
      
      // Category-specific insights
      if (category === 'Food & Dining' && parseFloat(percentage) > 30) {
        recommendations.push('Consider meal planning to reduce dining expenses');
        if (userCountry === 'UK') {
          recommendations.push('Try shopping at discount supermarkets like Aldi or Lidl');
        }
      }
      
      if (category === 'Transportation' && parseFloat(percentage) > 20 && userCountry === 'UK') {
        recommendations.push('Consider a monthly Oyster card or season ticket for savings');
      }
    }

    // Find most frequent merchant
    const topMerchant = Object.entries(merchantFrequency)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topMerchant) {
      const [merchant, frequency] = topMerchant;
      if (frequency > 5) {
        insights.push(`Most visited: ${merchant} (${frequency} transactions)`);
      }
    }

    // Check for unusual spending patterns
    const recentTransactions = transactions
      .filter(tx => new Date(tx.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .sort((a, b) => b.amount - a.amount);
    
    if (recentTransactions.length > 0) {
      const highestRecent = recentTransactions[0];
      const avgAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0) / transactions.length;
      
      if (highestRecent.amount > avgAmount * 3) {
        alerts.push(`Unusually high expense: ${highestRecent.merchant || 'Unknown'} - ${userCountry === 'UK' ? '£' : '$'}${highestRecent.amount.toFixed(2)}`);
      }
    }

    // UK-specific insights
    if (userCountry === 'UK') {
      const grocerySpending = categorySpending['Food & Dining'] || 0;
      const monthlyGroceryAvg = grocerySpending * 4; // Rough monthly estimate
      
      if (monthlyGroceryAvg > 400) {
        alerts.push('Monthly grocery spending appears high for UK standards (avg £300-400)');
        recommendations.push('Compare prices using apps like Honey or check weekly deals');
      }
      
      // Check for council tax payments
      const hasCouncilTax = transactions.some(tx => 
        tx.description.toLowerCase().includes('council tax') ||
        tx.category.includes('Council Tax')
      );
      
      if (!hasCouncilTax && transactions.length > 20) {
        recommendations.push('Set up automatic council tax payments to avoid late fees');
      }
    }

    return { insights, recommendations, alerts };
  }

  // Get category suggestions based on partial input
  public getCategorySuggestions(partialInput: string, userCountry?: string): string[] {
    const suggestions = new Set<string>();
    const input = partialInput.toLowerCase();
    
    for (const rule of this.rules) {
      // Skip UK-specific rules for non-UK users
      if (rule.ukSpecific && !rule.globalApplicable && userCountry !== 'UK') {
        continue;
      }
      
      // Check if any keywords match the input
      const matchingKeywords = rule.pattern.keywords.filter(keyword =>
        keyword.toLowerCase().includes(input) || input.includes(keyword.toLowerCase())
      );
      
      if (matchingKeywords.length > 0) {
        suggestions.add(rule.pattern.categoryName);
      }
      
      // Check merchants
      const matchingMerchants = rule.pattern.merchants.filter(merchant =>
        merchant.toLowerCase().includes(input)
      );
      
      if (matchingMerchants.length > 0) {
        suggestions.add(rule.pattern.categoryName);
      }
    }
    
    return Array.from(suggestions).slice(0, 5); // Return top 5 suggestions
  }
}

// Export singleton instance
export const autoCategorizer = new AutoCategorizer();