// CORRECTED IMPORT API ENDPOINT
// src/pages/api/import/finance.ts

import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/multi-user';
import { CorrectedFinanceImporter } from '../../../lib/finance/financeImporter';

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = serverAuth.supabase;
  
  try {
    // Get authenticated user
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const formData = await request.formData();
    const bankFile = formData.get('bank') as File;
    const cryptoFile = formData.get('crypto') as File;
    const expensesFile = formData.get('expenses') as File;
    
    console.log('📊 CORRECTED IMPORT - Files received:', {
      bank: !!bankFile,
      crypto: !!cryptoFile,
      expenses: !!expensesFile,
      bankSize: bankFile?.size || 0,
      cryptoSize: cryptoFile?.size || 0,
      expensesSize: expensesFile?.size || 0
    });

    // Prepare file contents
    const files: { bank?: string; crypto?: string; expenses?: string } = {};
    
    if (bankFile && bankFile.size > 0) {
      files.bank = await bankFile.text();
    }
    
    if (cryptoFile && cryptoFile.size > 0) {
      files.crypto = await cryptoFile.text();
    }
    
    if (expensesFile && expensesFile.size > 0) {
      files.expenses = await expensesFile.text();
    }

    // Use the corrected importer
    const importer = new CorrectedFinanceImporter(cookies, user.id);
    const result = await importer.importFinanceData(files);

    // Log detailed results
    console.log('📊 IMPORT RESULTS:', {
      success: result.success,
      stats: result.stats,
      message: result.message
    });

    return new Response(JSON.stringify({
      success: result.success,
      message: result.message,
      stats: result.stats,
      recommendations: generateImportRecommendations(result.stats)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    // Handle auth errors
    if (error.message === 'Authentication required') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Please sign in to continue'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.error('API Error:', error);
    console.error('❌ CORRECTED IMPORT ERROR:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: 'Import failed - check console for details'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Generate smart recommendations based on import results
function generateImportRecommendations(stats: any): string[] {
  const recommendations = [];
  
  if (stats.internalTransfers > stats.realExpenses) {
    recommendations.push('✅ Good: Successfully filtered out internal transfers that would have inflated expenses');
  }
  
  if (stats.duplicatesSkipped > 0) {
    recommendations.push(`✅ Prevented ${stats.duplicatesSkipped} duplicate transactions from previous imports`);
  }
  
  if (stats.cryptoHoldings > 0) {
    recommendations.push(`✅ Updated crypto portfolio with ${stats.cryptoHoldings} holdings`);
  }
  
  if (stats.realExpenses > 100) {
    recommendations.push('⚠️ Large number of transactions imported - consider setting up automatic categorization rules');
  }
  
  if (stats.dateRange) {
    recommendations.push(`📅 Data covers: ${stats.dateRange}`);
  }
  
  return recommendations;
}