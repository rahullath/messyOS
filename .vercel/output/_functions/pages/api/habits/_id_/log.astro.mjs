import { createServerClient } from '../../../../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../../../../renderers.mjs';

const POST = async ({ request, params, cookies }) => {
  const supabase = createServerClient(cookies);
  const habitId = params.id;
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const body = await request.json();
    const { value = 1, notes } = body;
    const todayIso = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const { data: existingEntry } = await supabase.from("habit_entries").select("id").eq("habit_id", habitId).eq("user_id", user.id).gte("logged_at", `${todayIso}T00:00:00.000Z`).lt("logged_at", `${todayIso}T23:59:59.999Z`).single();
    if (existingEntry) {
      return new Response(JSON.stringify({ error: "Already logged today" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const { data: entry, error } = await supabase.from("habit_entries").insert([{
      habit_id: habitId,
      user_id: user.id,
      value,
      notes,
      logged_at: (/* @__PURE__ */ new Date()).toISOString()
    }]).select().single();
    if (error) throw error;
    await updateHabitStreak(supabase, habitId, user.id);
    return new Response(JSON.stringify(entry), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
async function updateHabitStreak(supabase, habitId, userId) {
  const thirtyDaysAgo = /* @__PURE__ */ new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: entries } = await supabase.from("habit_entries").select("logged_at").eq("habit_id", habitId).eq("user_id", userId).gte("logged_at", thirtyDaysAgo.toISOString()).order("logged_at", { ascending: false });
  let streak = 0;
  const today = /* @__PURE__ */ new Date();
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const checkDateStr = checkDate.toISOString().split("T")[0];
    const hasEntry = entries?.some(
      (entry) => entry.logged_at?.split("T")[0] === checkDateStr
    );
    if (hasEntry) {
      streak++;
    } else {
      break;
    }
  }
  await supabase.from("habits").update({ streak_count: streak }).eq("id", habitId);
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
