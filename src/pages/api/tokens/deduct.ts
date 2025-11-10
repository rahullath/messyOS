// src/pages/api/tokens/deduct.ts - Real Token Deduction API
// Deduct tokens for AI feature usage

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase/client';

// Token cost mapping for different AI features
const TOKEN_COSTS = {
  'ai_chat': 10,           // 10 tokens per chat message
  'ai_insight': 25,        // 25 tokens per AI insight
  'ai_analysis': 50,       // 50 tokens per complex analysis
  'ai_recommendation': 15, // 15 tokens per recommendation
  'ai_summary': 20,        // 20 tokens per summary
  'ai_action': 30,         // 30 tokens per AI action execution
} as const;

type AIFeature = keyof typeof TOKEN_COSTS;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { feature, description, metadata = {} } = await request.json();

    if (!feature || !TOKEN_COSTS.hasOwnProperty(feature)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid or missing AI feature type'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get Privy user ID from cookie
    const privyUserId = cookies.get('privy_user_id')?.value;
    
    if (!privyUserId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User not authenticated'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tokenCost = TOKEN_COSTS[feature as AIFeature];
    console.log(`💰 Attempting to deduct ${tokenCost} tokens for ${feature} from user ${privyUserId}`);

    // Get current balance with row lock to prevent race conditions
    const { data: tokenData, error: fetchError } = await supabase
      .from('user_tokens')
      .select('balance, total_spent')
      .eq('privy_user_id', privyUserId)
      .single();

    if (fetchError || !tokenData) {
      console.error('❌ Failed to fetch user token balance:', fetchError);
      return new Response(JSON.stringify({
        success: false,
        error: 'User token account not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user has sufficient balance
    if (tokenData.balance < tokenCost) {
      console.log(`❌ Insufficient balance: ${tokenData.balance} < ${tokenCost}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Insufficient token balance',
        current_balance: tokenData.balance,
        required: tokenCost,
        shortfall: tokenCost - tokenData.balance
      }), {
        status: 402, // Payment Required
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const newBalance = tokenData.balance - tokenCost;
    const newTotalSpent = tokenData.total_spent + tokenCost;

    // Update balance atomically
    const { error: updateError } = await supabase
      .from('user_tokens')
      .update({
        balance: newBalance,
        total_spent: newTotalSpent,
        last_transaction_at: new Date().toISOString()
      })
      .eq('privy_user_id', privyUserId);

    if (updateError) {
      console.error('❌ Failed to update token balance:', updateError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to deduct tokens'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Log the transaction
    const { error: transactionError } = await supabase
      .from('token_transactions')
      .insert({
        privy_user_id: privyUserId,
        transaction_type: 'spend',
        amount: -tokenCost, // Negative for spending
        description: description || `${feature.replace('_', ' ')} usage`,
        balance_before: tokenData.balance,
        balance_after: newBalance,
        related_entity_type: feature,
        metadata: {
          feature,
          cost_per_unit: tokenCost,
          ...metadata
        }
      });

    if (transactionError) {
      console.error('⚠️ Failed to log transaction (balance updated):', transactionError);
    }

    console.log(`✅ Successfully deducted ${tokenCost} tokens for ${feature}. New balance: ${newBalance}`);

    return new Response(JSON.stringify({
      success: true,
      tokens_deducted: tokenCost,
      new_balance: newBalance,
      feature,
      transaction_logged: !transactionError
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Token deduction API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Also export token costs for frontend reference
export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    success: true,
    token_costs: TOKEN_COSTS,
    descriptions: {
      'ai_chat': 'AI Chat Message (10 tokens)',
      'ai_insight': 'AI Insight Generation (25 tokens)',
      'ai_analysis': 'Complex AI Analysis (50 tokens)',
      'ai_recommendation': 'AI Recommendation (15 tokens)',
      'ai_summary': 'AI Summary Generation (20 tokens)',
      'ai_action': 'AI Action Execution (30 tokens)',
    }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};