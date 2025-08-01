// src/pages/api/ai/weekly-report.ts
import type { APIRoute } from 'astro';
import { MessyOSAIAgent } from '../../../lib/intelligence/meshos-ai-agent';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const GET: APIRoute = async ({ cookies }) => {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
  try {
    

    // Initialize AI agent
    const agent = new MessyOSAIAgent(cookies);
    
    // Generate weekly report
    const report = await agent.generateWeeklyReport(user.id);

    return new Response(JSON.stringify({
      success: true,
      ...report,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
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
    console.error('Weekly report error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate weekly report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
