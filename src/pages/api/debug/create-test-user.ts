import type { APIRoute } from 'astro';
import { privyAuthService } from '../../../lib/auth/privy-auth';

export const POST: APIRoute = async () => {
  try {
    const testUser = {
      privy_id: 'did:privy:cmeez32s7004tjo0b23hhb1xf',
      email: 'ketaminedevs@gmail.com',
      phone: null,
      wallet_address: '0x6f6d00fDCD7D8adf5bbBeA1e58514eaCfF93c2EE',
      linked_accounts: [
        {
          type: 'google_oauth',
          address: 'ketaminedevs@gmail.com',
          name: 'Rahul Lath'
        }
      ],
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    };

    console.log('Creating test user directly:', testUser);

    // Try direct SQL insert to bypass RLS
    const { data, error } = await privyAuthService.supabase.rpc('create_test_user', {
      user_data: testUser
    });

    if (error) {
      console.error('RPC error:', error);
      
      // Fallback: Try regular insert (will fail due to RLS but let's see the error)
      const { data: fallbackData, error: fallbackError } = await privyAuthService.supabase
        .from('privy_users')
        .insert(testUser)
        .select()
        .single();

      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create test user',
        rpcError: error,
        fallbackError: fallbackError,
        message: 'Both RPC and direct insert failed due to RLS'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      user: data,
      message: 'Test user created successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Exception creating test user:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};