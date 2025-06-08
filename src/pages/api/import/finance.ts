// src/pages/api/import/finance.ts
import type { APIRoute } from 'astro';
import { importFinanceData } from '../../../lib/finance/financeImporter';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;
    const expensesFile = formData.get('expenses') as File | null;
    const cryptoFile = formData.get('crypto') as File | null;
    const bankStatementFile = formData.get('bankStatement') as File | null;
    
    if (!userId) {
      return new Response(JSON.stringify({ 
        error: 'Missing user ID' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!expensesFile && !cryptoFile && !bankStatementFile) {
      return new Response(JSON.stringify({ 
        error: 'At least one file is required',
        required: 'expenses, crypto, or bankStatement file'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Read file contents
    const files: any = {};
    
    if (expensesFile) {
      files.expenses = await expensesFile.text();
    }
    
    if (cryptoFile) {
      files.crypto = await cryptoFile.text();
    }
    
    if (bankStatementFile) {
      files.bankStatement = await bankStatementFile.text();
    }
    
    // Validate file formats
    if (files.expenses && !files.expenses.includes('zepto\|swiggy\|blinkit\|supertails')) {
      // Basic validation - check for common expense keywords
      if (!files.expenses.toLowerCase().includes('total') && !files.expenses.toLowerCase().includes('order')) {
        return new Response(JSON.stringify({ 
          error: 'Invalid expense file format. Expected manual expense tracking format with totals and orders.' 
        }), { status: 400 });
      }
    }
    
    if (files.crypto && !files.crypto.includes('Trust Wallet\|Total Balance')) {
      if (!files.crypto.toLowerCase().includes('price:') && !files.crypto.toLowerCase().includes('quantity:')) {
        return new Response(JSON.stringify({ 
          error: 'Invalid crypto file format. Expected Trust Wallet export format.' 
        }), { status: 400 });
      }
    }
    
    if (files.bankStatement && !files.bankStatement.includes('Date\|Particulars')) {
      if (!files.bankStatement.toLowerCase().includes('withdrawals') && !files.bankStatement.toLowerCase().includes('deposits')) {
        return new Response(JSON.stringify({ 
          error: 'Invalid bank statement format. Expected CSV with Date, Particulars, Withdrawals, Deposits columns.' 
        }), { status: 400 });
      }
    }
    
    const result = await importFinanceData(files, userId, cookies);
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('Finance import API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Finance import failed', 
      details: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};