// UK Student Receipts API Endpoint
// Handles receipt OCR processing and storage

import type { APIRoute } from 'astro';
import { ukFinanceService } from '../../../lib/uk-student/uk-finance-service';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('receipt') as File;
    const userId = formData.get('userId') as string;
    
    if (!file || !userId) {
      return new Response(JSON.stringify({ error: 'Receipt file and user ID are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process the receipt with OCR
    const receiptData = await ukFinanceService.processReceiptOCR(file);

    return new Response(JSON.stringify({ receiptData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing receipt:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process receipt',
      requiresManualInput: true 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = url.searchParams.get('userId');
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const receipts = await ukFinanceService.getReceipts(userId);
    
    return new Response(JSON.stringify({ receipts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching receipts:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch receipts' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};