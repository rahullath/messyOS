import { createServerClient } from '../../../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../../../renderers.mjs';

const POST = async ({ request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({
        error: "Authentication required"
      }), { status: 401 });
    }
    const { data: activeSession, error: sessionError } = await supabase.from("task_sessions").select("*, tasks(title)").eq("user_id", user.id).is("ended_at", null).single();
    if (sessionError || !activeSession) {
      return new Response(JSON.stringify({
        error: "No active task session found"
      }), { status: 404 });
    }
    const body = await request.json().catch(() => ({}));
    const endTime = (/* @__PURE__ */ new Date()).toISOString();
    const startTime = new Date(activeSession.started_at);
    const duration = Math.floor((new Date(endTime).getTime() - startTime.getTime()) / 1e3);
    const updateData = {
      ended_at: endTime,
      duration,
      productivity_score: body.productivity_score || null,
      energy_level: body.energy_level || activeSession.energy_level,
      mood: body.mood || activeSession.mood,
      notes: body.notes || null,
      interruptions: body.interruptions || 0,
      focus_rating: body.focus_rating || null
    };
    const { data: updatedSession, error: updateError } = await supabase.from("task_sessions").update(updateData).eq("id", activeSession.id).select().single();
    if (updateError) {
      return new Response(JSON.stringify({
        error: "Failed to stop task session",
        details: updateError.message
      }), { status: 500 });
    }
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor(duration % 3600 / 60);
    const seconds = duration % 60;
    let durationText = "";
    if (hours > 0) durationText += `${hours}h `;
    if (minutes > 0) durationText += `${minutes}m `;
    if (seconds > 0 || durationText === "") durationText += `${seconds}s`;
    return new Response(JSON.stringify({
      success: true,
      session: updatedSession,
      duration: {
        seconds: duration,
        formatted: durationText.trim()
      },
      message: `Stopped working on "${activeSession.tasks?.title}". Duration: ${durationText.trim()}`
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }), { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
