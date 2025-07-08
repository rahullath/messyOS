import { c as createComponent, a as createAstro, r as renderComponent, g as renderScript, b as renderTemplate, m as maybeRenderHead, e as addAttribute, F as Fragment } from '../chunks/astro/server_BxgriC_5.mjs';
import 'kleur/colors';
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_BPLTWs40.mjs';
import { createServerClient } from '../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$Habits = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Habits;
  const supabase = createServerClient(Astro2.cookies);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Astro2.redirect("/login");
  }
  const { data: habits, error } = await supabase.from("habits").select(`
    *,
    habit_entries(
      id,
      value,
      logged_at,
      notes,
      date
    )
  `).eq("user_id", user.id).eq("is_active", true).order("position", { ascending: true });
  if (error) {
    console.error("Error fetching habits:", error);
  }
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const isHabitSuccess = (value, habitName, habitType) => {
    return value === 1;
  };
  const habitsWithStatus = (habits || []).map((habit) => {
    const todayEntry = habit.habit_entries?.find(
      (entry) => entry.date === today
    );
    const last90Days = [];
    for (let i = 89; i >= 0; i--) {
      const date = /* @__PURE__ */ new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayEntry = habit.habit_entries?.find(
        (entry) => entry.date === dateStr
      );
      let completed = false;
      if (dayEntry) {
        completed = isHabitSuccess(dayEntry.value, habit.name, habit.type);
      }
      last90Days.push({
        date: dateStr,
        completed,
        value: dayEntry?.value || 0,
        hasEntry: !!dayEntry
      });
    }
    let currentStreak = 0;
    for (let i = last90Days.length - 1; i >= 0; i--) {
      if (last90Days[i].completed) {
        currentStreak++;
      } else if (last90Days[i].hasEntry) {
        break;
      } else {
        if (currentStreak > 0) break;
      }
    }
    const last7Days = last90Days.slice(-7);
    const completedToday2 = todayEntry ? isHabitSuccess(todayEntry.value, habit.name, habit.type) : false;
    return {
      ...habit,
      completedToday: completedToday2,
      todayEntry,
      todayValue: todayEntry?.value || 0,
      last7Days,
      realCurrentStreak: currentStreak,
      weekStreak: last7Days.filter((d) => d.completed).length
    };
  });
  const completedToday = habitsWithStatus.filter((h) => h.completedToday).length;
  const totalHabits = habitsWithStatus.length;
  const completionRate = totalHabits > 0 ? Math.round(completedToday / totalHabits * 100) : 0;
  const longestStreak = Math.max(...habitsWithStatus.map((h) => h.realCurrentStreak), 0);
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Habits - MeshOS" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="space-y-8"> <!-- Header with Import --> <div class="flex items-center justify-between"> <div> <h1 class="text-3xl font-semibold text-text-primary mb-2">Habits</h1> <p class="text-text-secondary">
Build better routines, one day at a time
</p> </div> <div class="flex space-x-3"> <button id="recalc-streaks-btn" class="flex items-center px-4 py-2 bg-accent-warning text-white rounded-lg hover:bg-accent-warning/90 transition-colors"> <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path> </svg>
Fix Streaks
</button> <button id="import-btn" class="flex items-center px-4 py-2 bg-accent-success text-white rounded-lg hover:bg-accent-success/90 transition-colors"> <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path> </svg>
Import Data
</button> <button id="add-habit-btn" class="flex items-center px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"> <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path> </svg>
New Habit
</button> </div> </div> <!-- Enhanced Stats --> <div class="grid grid-cols-1 md:grid-cols-4 gap-6"> <div class="card"> <div class="flex items-center justify-between"> <div> <p class="text-sm font-medium text-text-muted">Today's Progress</p> <p class="text-2xl font-semibold text-text-primary mt-1"> ${completedToday}/${totalHabits} </p> <p class="text-sm text-accent-success mt-1">${completionRate}% complete</p> </div> <div class="w-12 h-12 bg-accent-success/10 rounded-lg flex items-center justify-center"> <svg class="w-6 h-6 text-accent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path> </svg> </div> </div> </div> <div class="card"> <div class="flex items-center justify-between"> <div> <p class="text-sm font-medium text-text-muted">Longest Streak</p> <p class="text-2xl font-semibold text-text-primary mt-1">${longestStreak}</p> <p class="text-sm text-text-muted mt-1">days current</p> </div> <div class="w-12 h-12 bg-accent-warning/10 rounded-lg flex items-center justify-center"> <span class="text-2xl">🔥</span> </div> </div> </div> <div class="card"> <div class="flex items-center justify-between"> <div> <p class="text-sm font-medium text-text-muted">Total Habits</p> <p class="text-2xl font-semibold text-text-primary mt-1">${totalHabits}</p> <p class="text-sm text-text-muted mt-1">active</p> </div> <div class="w-12 h-12 bg-accent-primary/10 rounded-lg flex items-center justify-center"> <svg class="w-6 h-6 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path> </svg> </div> </div> </div> <div class="card"> <div class="flex items-center justify-between"> <div> <p class="text-sm font-medium text-text-muted">Best Streak</p> <p class="text-2xl font-semibold text-text-primary mt-1">${Math.max(...habitsWithStatus.map((h) => h.best_streak || 0), 0)}</p> <p class="text-sm text-text-muted mt-1">days ever</p> </div> <div class="w-12 h-12 bg-accent-purple/10 rounded-lg flex items-center justify-center"> <span class="text-2xl">🏆</span> </div> </div> </div> </div> <!-- Habits Grid with Beautiful UI --> <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> ${habitsWithStatus.map((habit) => renderTemplate`<div class="card hover:bg-surface-hover transition-colors"> <!-- Habit Header --> <div class="flex items-start justify-between mb-4"> <div class="flex-1"> <div class="flex items-center space-x-2 mb-2"> <div class="w-3 h-3 rounded-full"${addAttribute(`background-color: ${habit.color}`, "style")}></div> <h3 class="font-semibold text-text-primary">${habit.name}</h3> </div> <p class="text-sm text-text-muted">${habit.category}</p> ${habit.description && renderTemplate`<p class="text-xs text-text-muted mt-1">${habit.description}</p>`} </div> <div class="flex flex-col items-end space-y-1"> <span${addAttribute(`px-2 py-1 text-xs rounded-full ${habit.type === "build" ? "bg-accent-success/20 text-accent-success" : "bg-accent-error/20 text-accent-error"}`, "class")}> ${habit.type} </span> ${habit.measurement_type === "count" && renderTemplate`<span class="text-xs text-text-muted">
Today: ${habit.todayValue} </span>`} </div> </div> <!-- Skip Policy --> <div class="flex items-center justify-between mb-2"> <span${addAttribute(`text-xs px-2 py-1 rounded-full ${habit.allows_skips ? "bg-blue-500/20 text-blue-400" : "bg-red-500/20 text-red-400"}`, "class")}> ${habit.allows_skips ? "\u23ED\uFE0F Flexible" : "\u{1F6AB} Strict"} </span> ${habit.total_skips > 0 ? renderTemplate`<span class="text-xs text-gray-400">${habit.total_skips} skips</span>` : ""} </div> <!-- Streak & Stats --> <div class="flex items-center justify-between mb-4"> <div class="flex items-center space-x-2"> <span class="text-xl">🔥</span> <span class="text-lg font-semibold text-text-primary">${habit.realCurrentStreak}</span> <span class="text-sm text-text-muted">day streak</span> </div> <div class="text-right"> <p class="text-sm text-text-muted">Best: ${habit.best_streak || 0}</p> <p class="text-xs text-text-muted">This week: ${habit.weekStreak}/7</p> </div> </div> <!-- 7-Day Progress --> <div class="mb-4"> <p class="text-xs text-text-muted mb-2">Last 7 days</p> <div class="flex space-x-1"> ${habit.last7Days.map((day, index) => renderTemplate`<div${addAttribute(`w-6 h-6 rounded-full flex items-center justify-center text-xs ${day.completed ? "bg-accent-success text-white" : day.hasEntry ? "bg-accent-warning text-white" : "bg-surface border border-border text-text-muted"}`, "class")}${addAttribute(`${day.date}: ${day.hasEntry ? day.value : "No entry"}`, "title")}> ${day.completed ? "\u2713" : day.hasEntry ? day.value : "\xB7"} </div>`)} </div> </div> <!-- Action Button --> <button${addAttribute(`w-full py-3 px-4 rounded-lg font-medium transition-colors ${habit.completedToday ? "bg-accent-success/20 text-accent-success border border-accent-success/30 cursor-default" : "bg-accent-primary/20 text-accent-primary border border-accent-primary/30 hover:bg-accent-primary/30"}`, "class")}${addAttribute(habit.completedToday ? void 0 : `logHabit('${habit.id}', '${habit.name}')`, "onclick")}${addAttribute(habit.completedToday, "disabled")}> ${habit.completedToday ? renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path> </svg>
Completed Today
${habit.measurement_type === "count" && ` (${habit.todayValue})`}` })}` : renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path> </svg> ${habit.measurement_type === "boolean" ? "Mark Complete" : "Log Value"}` })}`} </button> </div>`)} </div> <!-- Import Modal --> <div id="import-modal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50"> <div class="bg-surface rounded-lg p-6 w-full max-w-md mx-4"> <div class="flex items-center justify-between mb-4"> <h3 class="text-xl font-semibold text-text-primary">Import Data</h3> <button id="close-import" class="text-text-muted hover:text-text-primary"> <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path> </svg> </button> </div> <p class="text-text-secondary mb-4">
Want to import more data? Go to the import page.
</p> <a href="/import" class="w-full flex items-center justify-center px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors">
Go to Import Page
</a> </div> </div> </div> ` })} ${renderScript($$result, "C:/Users/rahul/meshos-v3/src/pages/habits.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/rahul/meshos-v3/src/pages/habits.astro", void 0);

const $$file = "C:/Users/rahul/meshos-v3/src/pages/habits.astro";
const $$url = "/habits";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Habits,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
