// src/pages/api/tokens/transactions.ts - Token Transactions API
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    console.log('📊 Token transactions API called');
    
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      console.log('❌ No authenticated user found');
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get query parameters
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const type = url.searchParams.get('type'); // 'earn', 'spend', 'bonus', etc.

    console.log('🔍 Fetching transactions for user:', user.id, { limit, offset, type });

    // Build query
    let query = serverAuth.supabase
      .from('token_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply type filter if specified
    if (type && ['earn', 'spend', 'bonus', 'purchase', 'refund'].includes(type)) {
      query = query.eq('transaction_type', type);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('❌ Failed to fetch transactions:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch transaction history'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Found ${transactions?.length || 0} transactions`);

    // Get total count for pagination
    let countQuery = serverAuth.supabase
      .from('token_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (type && ['earn', 'spend', 'bonus', 'purchase', 'refund'].includes(type)) {
      countQuery = countQuery.eq('transaction_type', type);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('⚠️ Failed to get transaction count:', countError);
    }

    return new Response(JSON.stringify({
      success: true,
      transactions: transactions || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_more: (count || 0) > offset + limit
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Token transactions API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST endpoint for adding transactions (for admin/system use)
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { user_id, transaction_type, amount, description, metadata } = await request.json();

    // Validate required fields
    if (!user_id || !transaction_type || !amount || !description) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields: user_id, transaction_type, amount, description'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate transaction type
    if (!['earn', 'spend', 'bonus', 'purchase', 'refund'].includes(transaction_type)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid transaction type'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const serverAuth = createServerAuth(cookies);
    const currentUser = await serverAuth.getUser();
    
    if (!currentUser) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For now, only allow users to add transactions for themselves
    // In the future, this could be restricted to admin users
    if (currentUser.id !== user_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Cannot add transactions for other users'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get current balance
    const { data: tokenData, error: balanceError } = await serverAuth.supabase
      .from('user_tokens')
      .select('balance')
      .eq('user_id', user_id)
      .single();

    if (balanceError || !tokenData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User token account not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const currentBalance = tokenData.balance;
    const newBalance = currentBalance + amount; // amount can be negative for spending

    // Insert transaction record
    const { data: transaction, error: insertError } = await serverAuth.supabase
      .from('token_transactions')
      .insert({
        user_id,
        transaction_type,
        amount,
        description,
        balance_before: currentBalance,
        balance_after: newBalance,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to insert transaction:', insertError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create transaction record'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Transaction created:', transaction.id);

    return new Response(JSON.stringify({
      success: true,
      transaction
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Create transaction API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};