import { createServerClient } from '../../../../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../../../../renderers.mjs';

const POST = async ({ request, params, cookies }) => {
  const supabase = createServerClient(cookies);
  const habitId = params.id;
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  try {
    const body = await request.json();
    const {
      value = 1,
      // 0=missed, 1=completed, 2=skipped, 3=partial
      date,
      // ✅ Allow custom date
      notes,
      effort,
      duration,
      completion_time,
      energy_level,
      mood,
      location,
      weather,
      context = []
    } = body;
    const targetDate = date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const { data: existingEntry } = await supabase.from("habit_entries").select("id").eq("habit_id", habitId).eq("user_id", user.id).eq("date", targetDate).single();
    if (existingEntry) {
      const { data: updatedEntry, error: updateError } = await supabase.from("habit_entries").update({
        value,
        notes,
        effort,
        duration,
        completion_time,
        energy_level,
        mood,
        location,
        weather,
        context: Array.isArray(context) ? context : context.split(",").filter((c) => c.trim()),
        logged_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", existingEntry.id).select().single();
      if (updateError) throw updateError;
      await updateHabitStreak(supabase, habitId, user.id);
      return new Response(JSON.stringify({
        ...updatedEntry,
        message: "Entry updated successfully"
      }));
    }
    const { data: entry, error } = await supabase.from("habit_entries").insert([{
      habit_id: habitId,
      user_id: user.id,
      value,
      notes,
      effort,
      duration,
      completion_time,
      energy_level,
      mood,
      location,
      weather,
      context: Array.isArray(context) ? context : context.split(",").filter((c) => c.trim()),
      logged_at: (/* @__PURE__ */ new Date()).toISOString(),
      date: targetDate
    }]).select().single();
    if (error) throw error;
    await updateHabitStreak(supabase, habitId, user.id);
    return new Response(JSON.stringify({
      ...entry,
      message: "Enhanced habit entry logged successfully"
    }));
  } catch (error) {
    console.error("Enhanced logging error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
};
async function updateHabitStreak(supabase, habitId, userId) {
  const { data: entries } = await supabase.from("habit_entries").select("date, value").eq("habit_id", habitId).eq("user_id", userId).order("date", { ascending: false }).limit(100);
  if (!entries) return;
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  const today = /* @__PURE__ */ new Date();
  for (let i = 0; i < 100; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toISOString().split("T")[0];
    const entry = entries.find((e) => e.date === dateStr);
    if (entry) {
      if (entry.value === 1 || entry.value === 3) {
        if (i === 0 || currentStreak > 0) currentStreak++;
        tempStreak++;
      } else if (entry.value === 2) {
        tempStreak++;
        continue;
      } else {
        if (currentStreak === 0) currentStreak = tempStreak;
        break;
      }
    } else {
      if (currentStreak > 0) break;
    }
    bestStreak = Math.max(bestStreak, tempStreak);
  }
  await supabase.from("habits").update({
    streak_count: currentStreak,
    best_streak: Math.max(bestStreak, currentStreak)
  }).eq("id", habitId);
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
