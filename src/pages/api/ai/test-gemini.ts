// src/pages/api/ai/test-gemini.ts - Test endpoint for Gemini AI integration
import type { APIRoute } from 'astro';
import { GeminiLifeAgent } from '../../../lib/intelligence/gemini-life-agent';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();

    // Get Gemini API key
    const geminiApiKey = import.meta.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Gemini API key not configured',
        message: 'Please add GEMINI_API_KEY to your .env file'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 503
      });
    }

    // Test basic Gemini functionality
    const agent = new GeminiLifeAgent(cookies, user.id, geminiApiKey);
    
    const testMessage = "Hi! Can you analyze my current situation and help me prioritize my day?";
    const response = await agent.chat(testMessage);

    return new Response(JSON.stringify({
      success: true,
      message: 'Gemini AI agent is working correctly',
      test_input: testMessage,
      ai_response: response.substring(0, 500) + (response.length > 500 ? '...' : ''),
      response_length: response.length,
      api_key_configured: true,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Gemini test error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: 'Gemini AI test failed',
      troubleshooting: {
        api_key: import.meta.env.GEMINI_API_KEY ? 'Configured' : 'Missing',
        error_type: error.name || 'Unknown',
        suggestion: error.message.includes('API_KEY') ? 
          'Check your GEMINI_API_KEY in .env file' : 
          'Check your network connection and API quota'
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};