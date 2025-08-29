// src/pages/api/expenses/upload-statement.ts - Bank Statement Upload & Processing
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import { bankParser } from '../../../lib/expenses/bank-statement-parser';
import { autoCategorizer } from '../../../lib/expenses/auto-categorizer';

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const accountId = formData.get('account_id') as string;
    const bankFormat = formData.get('bank_format') as string;
    
    if (!file) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No file provided'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Read CSV content
    const csvContent = await file.text();
    
    // Parse the statement
    const { transactions, format, errors } = bankParser.parseCSV(csvContent);
    
    if (errors.length > 0 && transactions.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to parse statement',
        details: errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user settings for categorization
    const { data: userSettings } = await serverAuth.supabase
      .from('user_expense_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const userCountry = userSettings?.country_code || 'US';
    const primaryCurrency = userSettings?.primary_currency || 'USD';

    // Generate batch ID for this import
    const batchId = crypto.randomUUID();
    
    // Process transactions
    const processedTransactions = [];
    
    for (const transaction of transactions) {
      try {
        // Auto-categorize
        const categorization = autoCategorizer.categorizeTransaction(
          transaction.description,
          transaction.merchant,
          transaction.amount,
          userCountry,
          userSettings
        );

        // Get category ID
        const { data: category } = await serverAuth.supabase
          .from('expense_categories')
          .select('id')
          .eq('name', categorization.categoryName)
          .single();

        // Convert currency if needed
        let amountPrimaryCurrency = transaction.amount;
        let exchangeRateUsed = 1.0;
        
        if (transaction.currency !== primaryCurrency) {
          // In a real app, you'd call an exchange rate API
          // For now, use mock conversion rates
          const mockRates: Record<string, Record<string, number>> = {
            'GBP': { 'USD': 1.27, 'INR': 104.5, 'EUR': 1.17 },
            'USD': { 'GBP': 0.79, 'INR': 82.3, 'EUR': 0.92 },
            'INR': { 'GBP': 0.0096, 'USD': 0.012, 'EUR': 0.011 }
          };
          
          if (mockRates[transaction.currency]?.[primaryCurrency]) {
            exchangeRateUsed = mockRates[transaction.currency][primaryCurrency];
            amountPrimaryCurrency = transaction.amount * exchangeRateUsed;
          }
        }

        // Calculate secondary currency amount (for UK users showing INR equivalent)
        let amountSecondaryCurrency: number | undefined;
        if (userSettings?.secondary_currency) {
          const secondaryRates: Record<string, Record<string, number>> = {
            'GBP': { 'INR': 104.5 },
            'USD': { 'INR': 82.3 }
          };
          
          if (secondaryRates[transaction.currency]?.[userSettings.secondary_currency]) {
            const secondaryRate = secondaryRates[transaction.currency][userSettings.secondary_currency];
            amountSecondaryCurrency = transaction.amount * secondaryRate;
          }
        }

        const expenseData = {
          user_id: user.id,
          account_id: accountId,
          transaction_date: transaction.date,
          amount: transaction.amount,
          currency: transaction.currency,
          transaction_type: transaction.transactionType,
          merchant_name: transaction.merchant,
          description: transaction.description,
          original_description: transaction.description,
          category_id: category?.id,
          subcategory: categorization.subcategory,
          auto_categorized: true,
          confidence_score: categorization.confidence,
          amount_primary_currency: amountPrimaryCurrency,
          amount_secondary_currency: amountSecondaryCurrency,
          exchange_rate_used: exchangeRateUsed,
          import_source: 'csv_upload',
          import_batch_id: batchId,
          original_file_name: file.name,
          tags: [],
          notes: errors.length > 0 ? `Import warnings: ${errors.join('; ')}` : null
        };

        processedTransactions.push(expenseData);
      } catch (error) {
        console.error('Error processing transaction:', error);
        // Continue with other transactions
      }
    }

    // Insert transactions in batches
    const batchSize = 50;
    const insertedTransactions = [];
    
    for (let i = 0; i < processedTransactions.length; i += batchSize) {
      const batch = processedTransactions.slice(i, i + batchSize);
      
      const { data: inserted, error: insertError } = await serverAuth.supabase
        .from('expenses')
        .insert(batch)
        .select();

      if (insertError) {
        console.error('Batch insert error:', insertError);
        continue;
      }

      if (inserted) {
        insertedTransactions.push(...inserted);
      }
    }

    // Calculate import statistics
    const totalAmount = processedTransactions.reduce((sum, tx) => 
      sum + (tx.transaction_type === 'debit' ? tx.amount_primary_currency : 0), 0
    );

    const categoryBreakdown = processedTransactions.reduce((acc, tx) => {
      if (tx.transaction_type === 'debit') {
        acc[tx.subcategory || 'Other'] = (acc[tx.subcategory || 'Other'] || 0) + tx.amount_primary_currency;
      }
      return acc;
    }, {} as Record<string, number>);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total_transactions: insertedTransactions.length,
        failed_transactions: processedTransactions.length - insertedTransactions.length,
        total_amount: totalAmount,
        currency: primaryCurrency,
        date_range: {
          start: Math.min(...processedTransactions.map(tx => new Date(tx.transaction_date).getTime())),
          end: Math.max(...processedTransactions.map(tx => new Date(tx.transaction_date).getTime()))
        },
        category_breakdown: categoryBreakdown,
        bank_format: format?.name || 'Unknown',
        import_batch_id: batchId
      },
      transactions: insertedTransactions.slice(0, 10), // Return first 10 for preview
      warnings: errors
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Statement upload error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process bank statement',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};