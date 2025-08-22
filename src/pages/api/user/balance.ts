// src/pages/api/user/balance.ts - Real Token Balance API
// Get current user's token balance and check expiry

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase/client';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    console.log('📊 Real token balance API called');
    
    // Get Privy user ID from cookie
    const privyUserId = cookies.get('privy_user_id')?.value;
    console.log('🔍 Looking for privy_user_id cookie:', privyUserId);
    
    if (!privyUserId) {
      console.log('❌ No Privy user ID found in cookies');
      
      // For development: Return demo data if no cookie (user might not have logged in via new flow)
      console.log('🎁 Returning demo token balance for development');
      return new Response(JSON.stringify({
        success: true,
        tokens: {
          balance: 5000,
          totalEarned: 5000,
          totalSpent: 0,
          isNewUser: true,
          daysRemaining: 30
        },
        development: true,
        note: 'Demo data - please log in via new Privy flow'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Looking up token balance for user:', privyUserId);

    // Get real token balance from Supabase
    const { data: tokenData, error } = await supabase
      .from('user_tokens')
      .select(`
        balance,
        total_earned,
        total_spent,
        last_transaction_at,
        created_at,
        privy_user_id
      `)
      .eq('privy_user_id', privyUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('🆕 User token record not found, creating new user wallet');
        
        // Create new token wallet for user with 5000 welcome tokens
        const { data: newTokenData, error: insertError } = await supabase
          .from('user_tokens')
          .insert({
            privy_user_id: privyUserId,
            balance: 5000,
            total_earned: 5000,
            total_spent: 0,
            last_transaction_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Failed to create token wallet:', insertError);
          throw insertError;
        }

        // Log the welcome bonus transaction
        await supabase
          .from('token_transactions')
          .insert({
            privy_user_id: privyUserId,
            transaction_type: 'bonus',
            amount: 5000,
            description: '🎁 Welcome to meshOS! Free trial tokens',
            balance_before: 0,
            balance_after: 5000,
            related_entity_type: 'welcome_bonus',
            metadata: {
              bonus_type: 'welcome',
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
              auto_deduct: true
            }
          });

        console.log('✅ Created new token wallet with 5000 welcome tokens');
        
        return new Response(JSON.stringify({
          success: true,
          tokens: {
            balance: 5000,
            totalEarned: 5000,
            totalSpent: 0,
            isNewUser: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        console.error('❌ Database error fetching token balance:', error);
        throw error;
      }
    }

    console.log('✅ Found existing token balance:', tokenData.balance);

    // Check if free trial tokens have expired (30 days)
    const createdAt = new Date(tokenData.created_at);
    const now = new Date();
    const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    let currentBalance = tokenData.balance;
    let isExpired = false;

    // If more than 30 days and still has original 5000 tokens, expire them
    if (daysSinceCreation > 30 && tokenData.total_earned === 5000 && tokenData.total_spent === 0) {
      console.log('⏰ Free trial tokens expired after 30 days');
      
      // Deduct expired tokens
      const { error: updateError } = await supabase
        .from('user_tokens')
        .update({
          balance: 0,
          total_spent: tokenData.total_spent + tokenData.balance
        })
        .eq('privy_user_id', privyUserId);

      if (!updateError) {
        // Log expiry transaction
        await supabase
          .from('token_transactions')
          .insert({
            privy_user_id: privyUserId,
            transaction_type: 'spend',
            amount: -tokenData.balance,
            description: '⏰ Free trial tokens expired (30 days)',
            balance_before: tokenData.balance,
            balance_after: 0,
            related_entity_type: 'expiry',
            metadata: {
              reason: 'free_trial_expired',
              days_elapsed: daysSinceCreation
            }
          });

        currentBalance = 0;
        isExpired = true;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      tokens: {
        balance: currentBalance,
        totalEarned: tokenData.total_earned,
        totalSpent: tokenData.total_spent + (isExpired ? tokenData.balance : 0),
        isNewUser: daysSinceCreation < 1,
        isExpired,
        daysRemaining: Math.max(0, 30 - daysSinceCreation),
        createdAt: tokenData.created_at
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Token balance API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch token balance'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};