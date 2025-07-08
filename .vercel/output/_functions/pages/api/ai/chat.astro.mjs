import { MessyOSAIAgent } from '../../../chunks/meshos-ai-agent_D9mwRyjQ.mjs';
import { createServerClient } from '../../../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../../../renderers.mjs';

const POST = async ({ request, cookies }) => {
  try {
    const { message, conversationHistory } = await request.json();
    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const supabase = createServerClient(cookies);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const agent = new MessyOSAIAgent(cookies);
    const result = await agent.chat(
      session.user.id,
      message,
      conversationHistory || []
    );
    return new Response(JSON.stringify({
      success: true,
      ...result
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("AI Chat error:", error);
    return new Response(JSON.stringify({
      error: "Failed to process chat message",
      details: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
