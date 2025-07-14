// Crypto Portfolio Tracker with Real-time Data and Investment Suggestions
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';

interface CryptoPrice {
  symbol: string;
  price: number;
  change_24h: number;
  market_cap: number;
  volume_24h: number;
}

interface PortfolioItem {
  symbol: string;
  amount: number;
  avg_buy_price?: number;
  current_price: number;
  value: number;
  pnl: number;
  pnl_percentage: number;
}

interface InvestmentSuggestion {
  type: 'buy' | 'sell' | 'hold' | 'stake';
  symbol: string;
  reason: string;
  confidence: number;
  suggested_amount?: number;
  target_price?: number;
}

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'portfolio';
    
    // Get authenticated user
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), { status: 401 });
    }

    switch (action) {
      case 'portfolio':
        const portfolio = await getCryptoPortfolio(supabase, user.id);
        return new Response(JSON.stringify({
          success: true,
          portfolio,
          timestamp: new Date().toISOString()
        }), { status: 200 });

      case 'suggestions':
        const suggestions = await getInvestmentSuggestions(supabase, user.id);
        return new Response(JSON.stringify({
          success: true,
          suggestions,
          timestamp: new Date().toISOString()
        }), { status: 200 });

      case 'market':
        const marketData = await getMarketData();
        return new Response(JSON.stringify({
          success: true,
          market_data: marketData,
          timestamp: new Date().toISOString()
        }), { status: 200 });

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid action'
        }), { status: 400 });
    }

  } catch (error) {
    console.error('Crypto portfolio API error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Portfolio analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { action, data } = await request.json();
    
    // Get authenticated user
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), { status: 401 });
    }

    switch (action) {
      case 'add_holding':
        await addCryptoHolding(supabase, user.id, data);
        return new Response(JSON.stringify({
          success: true,
          message: 'Crypto holding added'
        }), { status: 200 });

      case 'update_holding':
        await updateCryptoHolding(supabase, user.id, data);
        return new Response(JSON.stringify({
          success: true,
          message: 'Crypto holding updated'
        }), { status: 200 });

      case 'execute_suggestion':
        const result = await executeTradeSuggestion(supabase, user.id, data);
        return new Response(JSON.stringify({
          success: true,
          result,
          message: 'Trade suggestion executed'
        }), { status: 200 });

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid action'
        }), { status: 400 });
    }

  } catch (error) {
    console.error('Crypto portfolio POST error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Get current crypto portfolio
async function getCryptoPortfolio(supabase: any, userId: string): Promise<{
  holdings: PortfolioItem[];
  total_value: number;
  total_pnl: number;
  total_pnl_percentage: number;
}> {
  // Get user's crypto holdings
  const { data: holdings } = await supabase
    .from('crypto_holdings')
    .select('*')
    .eq('user_id', userId);

  if (!holdings || holdings.length === 0) {
    return {
      holdings: [],
      total_value: 0,
      total_pnl: 0,
      total_pnl_percentage: 0
    };
  }

  // Get current prices for all symbols
  const symbols = holdings.map((h: any) => h.symbol);
  const prices = await getCurrentPrices(symbols);

  const portfolioItems: PortfolioItem[] = [];
  let totalValue = 0;
  let totalInvested = 0;

  for (const holding of holdings) {
    const currentPrice = prices[holding.symbol] || 0;
    const value = holding.amount * currentPrice;
    const invested = holding.amount * (holding.avg_buy_price || currentPrice);
    const pnl = value - invested;
    const pnlPercentage = invested > 0 ? (pnl / invested) * 100 : 0;

    portfolioItems.push({
      symbol: holding.symbol,
      amount: holding.amount,
      avg_buy_price: holding.avg_buy_price,
      current_price: currentPrice,
      value,
      pnl,
      pnl_percentage: pnlPercentage
    });

    totalValue += value;
    totalInvested += invested;
  }

  const totalPnl = totalValue - totalInvested;
  const totalPnlPercentage = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  return {
    holdings: portfolioItems,
    total_value: totalValue,
    total_pnl: totalPnl,
    total_pnl_percentage: totalPnlPercentage
  };
}

// Get investment suggestions based on market analysis and user's portfolio
async function getInvestmentSuggestions(supabase: any, userId: string): Promise<InvestmentSuggestion[]> {
  const suggestions: InvestmentSuggestion[] = [];
  
  // Get user's current portfolio
  const portfolio = await getCryptoPortfolio(supabase, userId);
  
  // Get market data for analysis
  const marketData = await getMarketData();
  
  // Get user's risk tolerance and investment goals (from profile or defaults)
  const { data: profile } = await supabase
    .from('profiles')
    .select('settings')
    .eq('id', userId)
    .single();
  
  const riskTolerance = profile?.settings?.crypto_risk_tolerance || 'medium';
  const investmentGoal = profile?.settings?.crypto_goal || 'growth';

  // Analyze current holdings for rebalancing
  const currentHoldings = portfolio.holdings.reduce((acc, holding) => {
    acc[holding.symbol] = holding.value;
    return acc;
  }, {} as Record<string, number>);

  // Suggest based on market conditions and portfolio analysis
  
  // 1. Diversification suggestions
  if (portfolio.holdings.length < 3) {
    suggestions.push({
      type: 'buy',
      symbol: 'ETH',
      reason: 'Portfolio lacks diversification. Ethereum provides good balance to Bitcoin holdings.',
      confidence: 0.8,
      suggested_amount: Math.min(portfolio.total_value * 0.3, 50000) // 30% of portfolio or ₹50k max
    });
  }

  // 2. DCA suggestions for major coins
  if (!currentHoldings['BTC'] || currentHoldings['BTC'] < portfolio.total_value * 0.4) {
    suggestions.push({
      type: 'buy',
      symbol: 'BTC',
      reason: 'Bitcoin should be 40-60% of crypto portfolio. Consider DCA strategy.',
      confidence: 0.9,
      suggested_amount: 10000 // ₹10k DCA
    });
  }

  // 3. Market-based suggestions
  for (const coin of marketData) {
    if (coin.change_24h < -10 && ['BTC', 'ETH', 'SOL', 'MATIC'].includes(coin.symbol)) {
      suggestions.push({
        type: 'buy',
        symbol: coin.symbol,
        reason: `${coin.symbol} is down ${Math.abs(coin.change_24h).toFixed(1)}% in 24h. Good buying opportunity.`,
        confidence: 0.7,
        suggested_amount: 5000
      });
    }
  }

  // 4. Profit-taking suggestions
  for (const holding of portfolio.holdings) {
    if (holding.pnl_percentage > 50) {
      suggestions.push({
        type: 'sell',
        symbol: holding.symbol,
        reason: `${holding.symbol} is up ${holding.pnl_percentage.toFixed(1)}%. Consider taking some profits.`,
        confidence: 0.6,
        suggested_amount: holding.amount * 0.25 // Sell 25%
      });
    }
  }

  // 5. Staking suggestions
  for (const holding of portfolio.holdings) {
    if (['ETH', 'SOL', 'MATIC', 'DOT'].includes(holding.symbol) && holding.amount > 0.1) {
      suggestions.push({
        type: 'stake',
        symbol: holding.symbol,
        reason: `Stake ${holding.symbol} to earn passive income (4-8% APY).`,
        confidence: 0.8,
        suggested_amount: holding.amount * 0.8 // Stake 80%
      });
    }
  }

  // Sort by confidence and return top 5
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

// Get current market data
async function getMarketData(): Promise<CryptoPrice[]> {
  try {
    // Using CoinGecko API (free tier)
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=inr&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h'
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch market data');
    }
    
    const data = await response.json();
    
    return data.map((coin: any) => ({
      symbol: coin.symbol.toUpperCase(),
      price: coin.current_price,
      change_24h: coin.price_change_percentage_24h || 0,
      market_cap: coin.market_cap,
      volume_24h: coin.total_volume
    }));
  } catch (error) {
    console.error('Failed to fetch market data:', error);
    
    // Fallback mock data
    return [
      { symbol: 'BTC', price: 3500000, change_24h: -2.5, market_cap: 70000000000000, volume_24h: 2000000000000 },
      { symbol: 'ETH', price: 280000, change_24h: 1.2, market_cap: 35000000000000, volume_24h: 1500000000000 },
      { symbol: 'SOL', price: 12000, change_24h: -5.8, market_cap: 5000000000000, volume_24h: 800000000000 }
    ];
  }
}

// Get current prices for specific symbols
async function getCurrentPrices(symbols: string[]): Promise<Record<string, number>> {
  try {
    const symbolsLower = symbols.map(s => s.toLowerCase()).join(',');
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${symbolsLower}&vs_currencies=inr`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch prices');
    }
    
    const data = await response.json();
    const prices: Record<string, number> = {};
    
    // Map CoinGecko IDs to symbols
    const idToSymbol: Record<string, string> = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'solana': 'SOL',
      'polygon': 'MATIC',
      'polkadot': 'DOT'
    };
    
    Object.entries(data).forEach(([id, priceData]: [string, any]) => {
      const symbol = idToSymbol[id] || id.toUpperCase();
      prices[symbol] = priceData.inr;
    });
    
    return prices;
  } catch (error) {
    console.error('Failed to fetch prices:', error);
    return {};
  }
}

// Add new crypto holding
async function addCryptoHolding(supabase: any, userId: string, data: any) {
  await supabase
    .from('crypto_holdings')
    .insert({
      user_id: userId,
      symbol: data.symbol.toUpperCase(),
      amount: data.amount,
      avg_buy_price: data.buy_price,
      created_at: new Date().toISOString()
    });
}

// Update existing crypto holding
async function updateCryptoHolding(supabase: any, userId: string, data: any) {
  await supabase
    .from('crypto_holdings')
    .update({
      amount: data.amount,
      avg_buy_price: data.avg_buy_price
    })
    .eq('user_id', userId)
    .eq('symbol', data.symbol.toUpperCase());
}

// Execute trade suggestion
async function executeTradeSuggestion(supabase: any, userId: string, suggestion: InvestmentSuggestion) {
  // Log the trade decision
  await supabase
    .from('crypto_trades')
    .insert({
      user_id: userId,
      symbol: suggestion.symbol,
      type: suggestion.type,
      amount: suggestion.suggested_amount,
      reason: suggestion.reason,
      executed_at: new Date().toISOString()
    });

  // Update holdings based on suggestion type
  if (suggestion.type === 'buy') {
    // Add to existing holding or create new
    const { data: existing } = await supabase
      .from('crypto_holdings')
      .select('*')
      .eq('user_id', userId)
      .eq('symbol', suggestion.symbol)
      .single();

    if (existing) {
      // Update existing holding
      const newAmount = existing.amount + (suggestion.suggested_amount || 0);
      await supabase
        .from('crypto_holdings')
        .update({ amount: newAmount })
        .eq('id', existing.id);
    } else {
      // Create new holding
      await supabase
        .from('crypto_holdings')
        .insert({
          user_id: userId,
          symbol: suggestion.symbol,
          amount: suggestion.suggested_amount || 0,
          avg_buy_price: suggestion.target_price
        });
    }
  }

  return { executed: true, suggestion };
}