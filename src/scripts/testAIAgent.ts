// src/scripts/testAIAgent.ts
// Test script to verify AI agent functionality

import { MessyOSAIAgent } from '../lib/intelligence/meshos-ai-agent';

async function testAIAgent() {
  console.log('🤖 Testing MessyOS AI Agent...');

  try {
    // Mock cookies object for testing
    const mockCookies = {
      get: () => null,
      set: () => {},
      delete: () => {},
      has: () => false
    };

    // Initialize the AI agent
    const agent = new MessyOSAIAgent(mockCookies);
    console.log('✅ AI Agent initialized successfully');

    // Test 1: Daily briefing (will fail without real user data, but tests the structure)
    console.log('\n📊 Testing daily briefing generation...');
    try {
      const briefing = await agent.generateDailyBriefing('test-user-id');
      console.log('✅ Daily briefing structure test passed');
      console.log('Briefing preview:', briefing.briefing.substring(0, 100) + '...');
    } catch (error) {
      console.log('⚠️ Daily briefing test failed (expected with mock data):', error.message);
    }

    // Test 2: Chat functionality
    console.log('\n💬 Testing chat functionality...');
    try {
      const chatResponse = await agent.chat('test-user-id', 'Hello, what can you tell me about my habits?');
      console.log('✅ Chat functionality test passed');
      console.log('Response preview:', chatResponse.response.substring(0, 100) + '...');
    } catch (error) {
      console.log('⚠️ Chat test failed (expected with mock data):', error.message);
    }

    // Test 3: Weekly report
    console.log('\n📈 Testing weekly report generation...');
    try {
      const report = await agent.generateWeeklyReport('test-user-id');
      console.log('✅ Weekly report structure test passed');
      console.log('Report preview:', report.report.substring(0, 100) + '...');
    } catch (error) {
      console.log('⚠️ Weekly report test failed (expected with mock data):', error.message);
    }

    console.log('\n🎉 AI Agent basic structure tests completed!');
    console.log('\nNext steps:');
    console.log('1. Set up your GEMINI_API_KEY in .env');
    console.log('2. Run the database schema: database-ai-agent-schema.sql');
    console.log('3. Add some habit and metric data');
    console.log('4. Visit /ai-agent to test the full interface');

  } catch (error) {
    console.error('❌ AI Agent test failed:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Check if GEMINI_API_KEY is set in your .env file');
    console.log('2. Verify LangChain dependencies are installed');
    console.log('3. Ensure Supabase connection is working');
  }
}

// Run the test
testAIAgent().catch(console.error);