export { renderers } from '../../../renderers.mjs';

const GET = async ({ cookies }) => {
  try {
    const hasGeminiKey = !!process.env.GEMINI_API_KEY;
    let langchainStatus = "unknown";
    try {
      const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
      langchainStatus = "available";
    } catch (error) {
      langchainStatus = "error: " + error.message;
    }
    let supabaseStatus = "unknown";
    try {
      const { createServerClient } = await import('../../../chunks/server_CMU3AJFs.mjs');
      const supabase = createServerClient(cookies);
      const { data, error } = await supabase.from("habits").select("count").limit(1);
      supabaseStatus = error ? "error: " + error.message : "connected";
    } catch (error) {
      supabaseStatus = "error: " + error.message;
    }
    let aiAgentStatus = "unknown";
    try {
      const { MessyOSAIAgent } = await import('../../../chunks/meshos-ai-agent_D9mwRyjQ.mjs');
      aiAgentStatus = "available";
    } catch (error) {
      aiAgentStatus = "error: " + error.message;
    }
    const testResults = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      environment: {
        geminiApiKey: hasGeminiKey ? "configured" : "missing",
        nodeEnv: process.env.NODE_ENV || "unknown"
      },
      dependencies: {
        langchain: langchainStatus,
        supabase: supabaseStatus,
        aiAgent: aiAgentStatus
      },
      recommendations: []
    };
    if (!hasGeminiKey) {
      testResults.recommendations.push("Add GEMINI_API_KEY to your .env file");
    }
    if (langchainStatus.includes("error")) {
      testResults.recommendations.push("Install LangChain dependencies: npm install @langchain/google-genai @langchain/core @langchain/langgraph");
    }
    if (supabaseStatus.includes("error")) {
      testResults.recommendations.push("Check Supabase connection and run database schema");
    }
    if (aiAgentStatus.includes("error")) {
      testResults.recommendations.push("Check AI agent implementation for syntax errors");
    }
    if (testResults.recommendations.length === 0) {
      testResults.recommendations.push("All systems ready! Visit /ai-agent to start using Mesh");
    }
    return new Response(JSON.stringify({
      success: true,
      message: "AI Agent system test completed",
      ...testResults
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("AI Agent test error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to run AI agent tests",
      details: error instanceof Error ? error.message : "Unknown error",
      recommendations: [
        "Check server logs for detailed error information",
        "Verify all dependencies are installed",
        "Ensure environment variables are properly set"
      ]
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
