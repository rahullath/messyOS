// src/pages/api/ai/test.ts
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const GET: APIRoute = async ({ cookies }) => {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
  try {
    
    // Test environment variables
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    
    // Test LangChain imports
    let langchainStatus = 'unknown';
    try {
      const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
      langchainStatus = 'available';
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
      langchainStatus = 'error: ' + error.message;
    }

    // Test Supabase connection
    let supabaseStatus = 'unknown';
    try {
      
      const { data, error } = await supabase.from('habits').select('count').limit(1);
      supabaseStatus = error ? 'error: ' + error.message : 'connected';
    } catch (error: any) {
      supabaseStatus = 'error: ' + error.message;
    }

    // Test AI Agent import
    let aiAgentStatus = 'unknown';
    try {
      const { MessyOSAIAgent } = await import('../../../lib/intelligence/meshos-ai-agent');
      aiAgentStatus = 'available';
    } catch (error: any) {
      aiAgentStatus = 'error: ' + error.message;
    }

    const testResults = {
      timestamp: new Date().toISOString(),
      environment: {
        geminiApiKey: hasGeminiKey ? 'configured' : 'missing',
        nodeEnv: process.env.NODE_ENV || 'unknown'
      },
      dependencies: {
        langchain: langchainStatus,
        supabase: supabaseStatus,
        aiAgent: aiAgentStatus
      },
      recommendations: [] as string[]
    };

    // Add recommendations based on test results
    if (!hasGeminiKey) {
      testResults.recommendations.push('Add GEMINI_API_KEY to your .env file');
    }
    
    if (langchainStatus.includes('error')) {
      testResults.recommendations.push('Install LangChain dependencies: npm install @langchain/google-genai @langchain/core @langchain/langgraph');
    }
    
    if (supabaseStatus.includes('error')) {
      testResults.recommendations.push('Check Supabase connection and run database schema');
    }
    
    if (aiAgentStatus.includes('error')) {
      testResults.recommendations.push('Check AI agent implementation for syntax errors');
    }

    if (testResults.recommendations.length === 0) {
      testResults.recommendations.push('All systems ready! Visit /ai-agent to start using Mesh');
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'AI Agent system test completed',
      ...testResults
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('AI Agent test error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Failed to run AI agent tests',
      details: error instanceof Error ? error.message : 'Unknown error',
      recommendations: [
        'Check server logs for detailed error information',
        'Verify all dependencies are installed',
        'Ensure environment variables are properly set'
      ]
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
