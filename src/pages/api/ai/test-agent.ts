// src/pages/api/ai/test-agent.ts - Simple test endpoint for the AI agent
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import { SimpleLifeAgent } from '../../../lib/intelligence/simple-life-agent';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();

    // Initialize the agent
    const agent = new SimpleLifeAgent(cookies, user.id);
    
    // Test different functionalities
    const tests = {
      dailyBriefing: null,
      quickOptimizations: null,
      chatResponse: null,
      error: null
    };

    try {
      // Test daily briefing
      tests.dailyBriefing = await agent.generateDailyBriefing();
      
      // Test quick optimizations
      tests.quickOptimizations = await agent.getQuickOptimizations();
      
      // Test chat
      tests.chatResponse = await agent.chat("What should I focus on today?");
      
    } catch (error) {
      tests.error = error.message;
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'AI Agent test completed',
      tests: {
        dailyBriefingWorking: tests.dailyBriefing !== null,
        quickOptimizationsWorking: tests.quickOptimizations !== null,
        chatWorking: tests.chatResponse !== null,
        anyErrors: tests.error
      },
      sampleData: {
        briefingGreeting: tests.dailyBriefing?.greeting,
        optimizationCount: tests.quickOptimizations?.length || 0,
        chatResponseLength: tests.chatResponse?.length || 0
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: 'AI Agent test failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};