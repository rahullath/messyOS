import { createServerClient } from '../../../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../../../renderers.mjs';

const POST = async ({ cookies }) => {
  const supabase = createServerClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    console.log("🔄 Recalculating streaks for user:", user.id);
    const { data: habits } = await supabase.from("habits").select("id, name, type").eq("user_id", user.id);
    if (!habits) throw new Error("No habits found");
    const results = [];
    for (const habit of habits) {
      const { data: entries } = await supabase.from("habit_entries").select("date, value").eq("habit_id", habit.id).order("date", { ascending: false });
      if (!entries || entries.length === 0) {
        results.push({ habit: habit.name, current: 0, best: 0 });
        continue;
      }
      const isSuccess = (value, habitName, habitType) => {
        const lower = habitName.toLowerCase();
        if (lower.includes("vap")) {
          return value === 0;
        } else if (habitType === "break") {
          return value > 0;
        } else {
          return value > 0;
        }
      };
      let currentStreak = 0;
      let bestStreak = 0;
      let tempStreak = 0;
      const today = /* @__PURE__ */ new Date();
      const entryMap = new Map(entries.map((e) => [e.date, e.value]));
      for (let i = 0; i < 90; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().split("T")[0];
        const value = entryMap.get(dateStr);
        const hasEntry = value !== void 0;
        const success = hasEntry ? isSuccess(value, habit.name, habit.type) : false;
        if (success) {
          currentStreak++;
        } else if (hasEntry) {
          break;
        } else {
          if (currentStreak > 0) break;
        }
      }
      const allEntries = [...entries].reverse();
      for (const entry of allEntries) {
        if (isSuccess(entry.value, habit.name, habit.type)) {
          tempStreak++;
          bestStreak = Math.max(bestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }
      await supabase.from("habits").update({
        streak_count: currentStreak,
        best_streak: Math.max(bestStreak, currentStreak),
        total_completions: entries.filter(
          (e) => isSuccess(e.value, habit.name, habit.type)
        ).length
      }).eq("id", habit.id);
      results.push({
        habit: habit.name,
        current: currentStreak,
        best: Math.max(bestStreak, currentStreak),
        type: habit.type
      });
      console.log(`🔥 ${habit.name}: current=${currentStreak}, best=${bestStreak}`);
    }
    return new Response(JSON.stringify({
      success: true,
      message: `Recalculated streaks for ${habits.length} habits`,
      results
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Error recalculating streaks:", error);
    return new Response(JSON.stringify({
      error: "Failed to recalculate streaks",
      details: error.message
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
