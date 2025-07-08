import { MessyOSAIAgent } from '../../../chunks/meshos-ai-agent_D9mwRyjQ.mjs';
import { createServerClient } from '../../../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async ({ cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const agent = new MessyOSAIAgent(cookies);
    const briefing = await agent.generateDailyBriefing(session.user.id);
    return new Response(JSON.stringify({
      success: true,
      ...briefing,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Daily briefing error:", error);
    return new Response(JSON.stringify({
      error: "Failed to generate daily briefing",
      details: error instanceof Error ? error.message : "Unknown error"
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
