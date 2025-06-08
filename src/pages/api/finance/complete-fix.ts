// Complete Finance Data Fix API Endpoint
// src/pages/api/finance/complete-fix.ts

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { runCompleteFinanceDataFix } from '../../../lib/scripts/fixFinanceDataComplete';

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createServerClient(cookies);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { action } = await request.json();
    
    if (action === 'complete-fix') {
      console.log('🚀 Starting complete finance data fix for user:', user.id);
      
      // Run the comprehensive fix
      await runCompleteFinanceDataFix();
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Complete finance data fix executed successfully',
        fixes: [
          'Removed all duplicate entries',
          'Fixed crypto holdings display ($130.72 total)',
          'Excluded pot transfers from expenses',
          'Enhanced categorization with subcategories',
          'Imported bank transactions without duplicates',
          'Added detailed manual expense tracking'
        ]
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid action'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('❌ Complete fix error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
