/ src/pages/api/finance/smart-expense-categorizer.ts

import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    
    const { expense_text } = await request.json();
    
    // Smart categorization based on your specific patterns
    const categories = {
      'Royal Canin|Carniwel|cat food|cat litter': 'Pet Care',
      'MK Retail|Zepto|Swiggy Instamart|Blinkit': 'Grocery',
      'Swiggy|Zomato|Dominos|Crusto|pizza|burger': 'Food Delivery',
      'Spotify|Apple|Google|Netflix|subscription': 'Subscriptions',
      'Yulu|uber|ola|transport': 'Transportation',
      'bupropion|apollo|medicine|pharmacy': 'Healthcare',
      'protein|creatine|supplement|whey': 'Health & Fitness',
      'Birmingham|visa|university|tuition': 'UK Preparation',
      'cat|pet|vet|vaccination': 'Pet Care',
      'transfer to pot|savings': 'Savings'
    };

    let category = 'Other';
    let subcategory = '';
    
    const text = expense_text.toLowerCase();
    
    for (const [pattern, cat] of Object.entries(categories)) {
      if (new RegExp(pattern, 'i').test(text)) {
        category = cat;
        
        // Add subcategories for detailed tracking
        if (cat === 'Pet Care') {
          if (text.includes('food')) subcategory = 'Food';
          else if (text.includes('litter')) subcategory = 'Hygiene';
          else if (text.includes('vet')) subcategory = 'Healthcare';
        } else if (cat === 'Grocery') {
          if (text.includes('mk retail')) subcategory = 'Bulk Shopping';
          else if (text.includes('zepto')) subcategory = 'Quick Delivery';
        }
        break;
      }
    }

    // Calculate optimization suggestions
    let suggestion = '';
    if (category === 'Grocery' && subcategory === 'Quick Delivery') {
      suggestion = 'Consider bulk shopping at MK Retail to reduce per-item costs';
    } else if (category === 'Food Delivery') {
      suggestion = 'Track delivery frequency - cooking saves ~₹200 per meal';
    } else if (category === 'Pet Care') {
      suggestion = 'Stock check: Do you have enough cat supplies for UK move?';
    }

    return new Response(JSON.stringify({
      category,
      subcategory,
      optimization_suggestion: suggestion,
      confidence: 0.9
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};