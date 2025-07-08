import { createServerClient } from '../../../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../../../renderers.mjs';

async function importLoopHabitsData(csvFiles, userId, cookies) {
  console.log("🔄 Starting Loop Habits import for user:", userId);
  const habitsData = parseHabitsCSV(csvFiles.habits);
  console.log("📋 Parsed habits:", habitsData.length);
  const checkmarksData = parseCheckmarksCSV(csvFiles.checkmarks);
  console.log("✅ Parsed checkmarks for habits:", Object.keys(checkmarksData));
  const scoresData = parseScoresCSV(csvFiles.scores);
  console.log("📊 Parsed scores for habits:", Object.keys(scoresData));
  const supabase = createServerClient(cookies);
  try {
    console.log("🗑️ Clearing existing habits...");
    await supabase.from("habits").delete().eq("user_id", userId);
    const habitMap = /* @__PURE__ */ new Map();
    console.log("📝 Inserting habits...");
    for (const habit of habitsData) {
      const { data: insertedHabit } = await supabase.from("habits").insert({
        user_id: userId,
        name: habit.name,
        description: habit.description || habit.question,
        category: categorizeHabit(habit.name),
        type: determineHabitType(habit.name),
        measurement_type: determineMeasurementType(habit),
        color: habit.color,
        position: habit.position,
        target_value: habit.numRepetitions
      }).select("id, name").single();
      if (insertedHabit) {
        habitMap.set(habit.name, insertedHabit.id);
        console.log(`✅ Imported habit: ${habit.name} -> ${insertedHabit.id}`);
      }
    }
    console.log("📅 Processing checkmarks...");
    const entries = [];
    let entryCount = 0;
    for (const [habitName, dateEntries] of Object.entries(checkmarksData)) {
      const habitId = habitMap.get(habitName);
      if (!habitId) {
        console.warn(`⚠️ No habit ID found for: ${habitName}`);
        continue;
      }
      for (const [dateStr, value] of Object.entries(dateEntries)) {
        if (value !== null && value !== void 0 && value > 0) {
          const isoDate = new Date(dateStr).toISOString();
          entries.push({
            habit_id: habitId,
            user_id: userId,
            value,
            logged_at: isoDate,
            date: dateStr
          });
          entryCount++;
        }
      }
    }
    if (entries.length > 0) {
      console.log(`📥 Inserting ${entries.length} habit entries...`);
      const { error: entriesError } = await supabase.from("habit_entries").insert(entries);
      if (entriesError) {
        console.error("❌ Error inserting entries:", entriesError);
      } else {
        console.log(`✅ Successfully inserted ${entries.length} entries`);
      }
    }
    console.log("📊 Processing scores...");
    const scores = [];
    for (const [habitName, dateScores] of Object.entries(scoresData)) {
      const habitId = habitMap.get(habitName);
      if (!habitId) continue;
      for (const [dateStr, score] of Object.entries(dateScores)) {
        if (score !== null && score !== void 0) {
          scores.push({
            habit_id: habitId,
            score,
            date: dateStr
          });
        }
      }
    }
    if (scores.length > 0) {
      console.log(`📊 Inserting ${scores.length} scores...`);
      await supabase.from("habit_scores").insert(scores);
    }
    console.log("🔥 Calculating streaks...");
    await calculateAllStreaks(userId, cookies);
    return {
      success: true,
      message: `Successfully imported ${habitsData.length} habits with ${entries.length} entries and ${scores.length} scores`,
      imported: habitsData.length
    };
  } catch (error) {
    console.error("❌ Import error:", error);
    return {
      success: false,
      message: `Import failed: ${error.message}`,
      imported: 0
    };
  }
}
function parseHabitsCSV(csv) {
  const lines = csv.split("\n").slice(1);
  const habits = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split(",");
    if (parts.length >= 7) {
      habits.push({
        position: parseInt(parts[0]) || 0,
        name: parts[1]?.trim() || "",
        question: parts[2]?.trim() || "",
        description: parts[3]?.trim() || "",
        numRepetitions: parseInt(parts[4]) || 1,
        interval: parseInt(parts[5]) || 1,
        color: parts[6]?.trim() || "#3b82f6"
      });
    }
  }
  console.log("📋 Parsed habits:", habits.map((h) => h.name));
  return habits;
}
function parseCheckmarksCSV(csv) {
  const lines = csv.split("\n");
  const header = lines[0].split(",").map((s) => s.trim());
  const data = {};
  console.log("📅 Checkmarks header:", header);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const values = line.split(",").map((s) => s.trim());
    const dateStr = values[0];
    if (!dateStr) continue;
    for (let j = 1; j < values.length && j < header.length; j++) {
      const habitName = header[j];
      if (!habitName) continue;
      if (!data[habitName]) data[habitName] = {};
      const rawValue = parseInt(values[j]) || 0;
      if (habitName.toLowerCase().includes("vap") || habitName.toLowerCase().includes("no ") || habitName.toLowerCase().includes("quit")) {
        if (rawValue === 0) {
          data[habitName][dateStr] = 0;
        } else if (rawValue === 2) {
          data[habitName][dateStr] = 1;
        } else if (rawValue === 3) {
          data[habitName][dateStr] = 3;
        } else {
          data[habitName][dateStr] = 0;
        }
      } else {
        if (rawValue === 0) {
          data[habitName][dateStr] = 0;
        } else if (rawValue === 2) {
          data[habitName][dateStr] = 1;
        } else if (rawValue === 3) {
          data[habitName][dateStr] = 3;
        } else {
          data[habitName][dateStr] = 0;
        }
      }
    }
  }
  return data;
}
function parseScoresCSV(csv) {
  const lines = csv.split("\n");
  const header = lines[0].split(",").map((s) => s.trim());
  const data = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const values = line.split(",").map((s) => s.trim());
    const dateStr = values[0];
    if (!dateStr) continue;
    for (let j = 1; j < values.length && j < header.length; j++) {
      const habitName = header[j];
      if (!habitName) continue;
      if (!data[habitName]) data[habitName] = {};
      const score = parseFloat(values[j]);
      if (!isNaN(score)) {
        data[habitName][dateStr] = score;
      }
    }
  }
  return data;
}
function categorizeHabit(name) {
  if (!name) return "General";
  const lower = name.toLowerCase().trim();
  if (lower.includes("gym") || lower.includes("walk") || lower.includes("exercise")) return "Fitness";
  if (lower.includes("vap") || lower.includes("smoke") || lower.includes("drink") || lower.includes("pot")) return "Health";
  if (lower.includes("code") || lower.includes("build") || lower.includes("university")) return "Productivity";
  if (lower.includes("shower") || lower.includes("wake")) return "Self Care";
  if (lower.includes("valorant") || lower.includes("game")) return "Entertainment";
  return "General";
}
function determineHabitType(name) {
  if (!name) return "build";
  const lower = name.toLowerCase().trim();
  if (lower.includes("quit") || lower.includes("no ") || lower.includes("stop")) return "break";
  return "build";
}
function determineMeasurementType(habit) {
  if (habit.question?.toLowerCase().includes("did you")) return "boolean";
  if (habit.question?.toLowerCase().includes("how many")) return "count";
  if (habit.numRepetitions === 1) return "boolean";
  return "count";
}
async function calculateAllStreaks(userId, cookies) {
  console.log("🔥 Calculating streaks for user:", userId);
  const supabase = createServerClient(cookies);
  const { data: habits } = await supabase.from("habits").select("id, name, type").eq("user_id", userId);
  if (!habits) return;
  for (const habit of habits) {
    const { data: entries } = await supabase.from("habit_entries").select("date, value").eq("habit_id", habit.id).order("date", { ascending: false });
    if (!entries || entries.length === 0) continue;
    const isSuccess2 = (value, habitName, habitType) => {
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
      const success = hasEntry ? isSuccess2(value, habit.name, habit.type) : false;
      if (success) {
        currentStreak++;
      } else if (hasEntry) {
        break;
      } else {
        if (currentStreak > 0) break;
      }
    }
    const allEntries = entries.reverse();
    for (const entry of allEntries) {
      if (isSuccess2(entry.value, habit.name, habit.type)) {
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
        (e) => isSuccess2(e.value, habit.name, habit.type)
      ).length
    }).eq("id", habit.id);
    console.log(`🔥 ${habit.name}: current=${currentStreak}, best=${bestStreak}, type=${habit.type}`);
  }
}

const POST = async ({ request, cookies }) => {
  try {
    const formData = await request.formData();
    const userId = formData.get("userId");
    const habitsFile = formData.get("habits");
    const checkmarksFile = formData.get("checkmarks");
    const scoresFile = formData.get("scores");
    if (!userId || !habitsFile || !checkmarksFile || !scoresFile) {
      return new Response(JSON.stringify({
        error: "Missing required files or user ID"
      }), { status: 400 });
    }
    const csvFiles = {
      habits: await habitsFile.text(),
      checkmarks: await checkmarksFile.text(),
      scores: await scoresFile.text()
    };
    const result = await importLoopHabitsData(csvFiles, userId, cookies);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Import failed",
      details: error.message
    }), { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
