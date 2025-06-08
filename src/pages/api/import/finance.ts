// src/pages/api/import/finance.ts - UPDATED
import type { APIRoute } from 'astro';
import { EnhancedFinanceImporter } from '../../../lib/finance/financeImporter';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;
    const bankFile = formData.get('bank') as File;
    const cryptoFile = formData.get('crypto') as File;
    const expensesFile = formData.get('expenses') as File;
    
    if (!userId) {
      return new Response(JSON.stringify({ 
        error: 'Missing user ID' 
      }), { status: 400 });
    }
    
    if (!bankFile && !cryptoFile && !expensesFile) {
      return new Response(JSON.stringify({ 
        error: 'At least one file is required' 
      }), { status: 400 });
    }
    
    const csvFiles: { bank?: string; crypto?: string; expenses?: string } = {};
    
    if (bankFile && bankFile.size > 0) {
      csvFiles.bank = await bankFile.text();
    }
    
    if (cryptoFile && cryptoFile.size > 0) {
      csvFiles.crypto = await cryptoFile.text();
    }
    
    if (expensesFile && expensesFile.size > 0) {
      csvFiles.expenses = await expensesFile.text();
    }
    
    console.log('📊 Files received:', {
      bank: !!csvFiles.bank,
      crypto: !!csvFiles.crypto,
      expenses: !!csvFiles.expenses,
      bankSize: bankFile?.size || 0,
      cryptoSize: cryptoFile?.size || 0,
      expensesSize: expensesFile?.size || 0
    });
    
    const importer = new EnhancedFinanceImporter();
    const result = await importer.importFinanceData(csvFiles, userId, cookies);
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('❌ Finance API error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Import failed', 
      details: error.message 
    }), { status: 500 });
  }
};
