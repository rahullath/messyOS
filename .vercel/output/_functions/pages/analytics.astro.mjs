import { c as createComponent, a as createAstro, r as renderComponent, g as renderScript, b as renderTemplate, m as maybeRenderHead, e as addAttribute } from '../chunks/astro/server_BxgriC_5.mjs';
import 'kleur/colors';
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_BPLTWs40.mjs';
import { createServerClient } from '../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$Analytics = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Analytics;
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
      date,
      logged_at
    )
  `).eq("user_id", user.id).eq("is_active", true).order("streak_count", { ascending: false });
  if (error) {
    console.error("Error fetching habits for analytics:", error);
  }
  const analyticsData = (habits || []).map((habit) => {
    const entries = habit.habit_entries || [];
    const successEntries = entries.filter((e) => e.value === 1);
    const failureEntries = entries.filter((e) => e.value === 0);
    const skipEntries = entries.filter((e) => e.value === 3);
    const completionRate = entries.length > 0 ? Math.round(successEntries.length / entries.length * 100) : 0;
    const dates = entries.map((e) => new Date(e.date)).sort((a, b) => a.getTime() - b.getTime());
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    const daysTracked = dates.length > 0 ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1e3 * 60 * 60 * 24)) + 1 : 0;
    const weeklyPattern = [0, 0, 0, 0, 0, 0, 0];
    successEntries.forEach((entry) => {
      const dayOfWeek = new Date(entry.date).getDay();
      weeklyPattern[dayOfWeek]++;
    });
    return {
      ...habit,
      analytics: {
        totalEntries: entries.length,
        successCount: successEntries.length,
        failureCount: failureEntries.length,
        skipCount: skipEntries.length,
        completionRate,
        daysTracked,
        startDate: startDate ? startDate.toISOString().split("T")[0] : null,
        endDate: endDate ? endDate.toISOString().split("T")[0] : null,
        weeklyPattern,
        avgEntriesPerWeek: daysTracked > 0 ? Math.round(entries.length / daysTracked * 7) : 0
      }
    };
  });
  const totalHabits = analyticsData.length;
  const totalEntries = analyticsData.reduce((sum, h) => sum + h.analytics.totalEntries, 0);
  const totalSuccesses = analyticsData.reduce((sum, h) => sum + h.analytics.successCount, 0);
  const totalFailures = analyticsData.reduce((sum, h) => sum + h.analytics.failureCount, 0);
  const avgCompletionRate = totalEntries > 0 ? Math.round(totalSuccesses / totalEntries * 100) : 0;
  const categoryStats = analyticsData.reduce((acc, habit) => {
    const cat = habit.category || "Other";
    if (!acc[cat]) {
      acc[cat] = { count: 0, totalStreak: 0, totalEntries: 0, totalSuccesses: 0 };
    }
    acc[cat].count++;
    acc[cat].totalStreak += habit.streak_count || 0;
    acc[cat].totalEntries += habit.analytics.totalEntries;
    acc[cat].totalSuccesses += habit.analytics.successCount;
    return acc;
  }, {});
  const habitsWithIssues = analyticsData.filter(
    (h) => h.analytics.completionRate < 90 || h.analytics.failureCount > 5 || h.streak_count < 30
  );
  const perfectHabits = analyticsData.filter(
    (h) => h.analytics.completionRate === 100 && h.analytics.totalEntries > 30
  );
  const dashboardData = {
    habits: analyticsData.map((h) => ({
      name: h.name,
      current: h.streak_count || 0,
      best: h.best_streak || 0,
      total: h.analytics.successCount,
      category: h.category || "Other",
      completionRate: h.analytics.completionRate,
      daysTracked: h.analytics.daysTracked,
      totalEntries: h.analytics.totalEntries
    })),
    stats: {
      totalHabits,
      totalEntries,
      avgCompletionRate,
      perfectHabits: perfectHabits.length,
      habitsWithIssues: habitsWithIssues.length
    },
    categories: Object.entries(categoryStats).map(([name, stats]) => ({
      name,
      count: stats.count,
      avgStreak: Math.round(stats.totalStreak / stats.count),
      completionRate: stats.totalEntries > 0 ? Math.round(stats.totalSuccesses / stats.totalEntries * 100) : 0
    })),
    issues: habitsWithIssues.map((h) => ({
      name: h.name,
      issue: h.analytics.completionRate < 90 ? "Low completion rate" : h.analytics.failureCount > 5 ? "Multiple failures" : "Short streak",
      value: h.analytics.completionRate < 90 ? `${h.analytics.completionRate}%` : h.analytics.failureCount > 5 ? `${h.analytics.failureCount} failures` : `${h.streak_count} days`
    }))
  };
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Analytics - MeshOS" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="space-y-8"> <!-- Page Header --> <div class="flex items-center justify-between"> <div> <h1 class="text-3xl font-semibold text-text-primary mb-2">Life Analytics</h1> <p class="text-text-secondary">
Data-driven insights for optimization
</p> </div> <div class="flex items-center space-x-3"> <span class="text-sm text-text-muted">Last updated: ${(/* @__PURE__ */ new Date()).toLocaleDateString()}</span> <button id="export-data-btn" class="flex items-center px-3 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors text-sm"> <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path> </svg>
Export
</button> </div> </div> <!-- Analytics Dashboard Component --> <div id="analytics-dashboard"${addAttribute(JSON.stringify(dashboardData), "data-dashboard")}></div> <!-- Data Quality Assessment --> <div class="card p-6 bg-gradient-to-r from-accent-warning/10 to-accent-error/10 border border-accent-warning/20"> <h3 class="text-xl font-semibold text-text-primary mb-4">📊 Data Quality Assessment</h3> <div class="grid grid-cols-1 md:grid-cols-3 gap-4"> <div class="space-y-2"> <h4 class="font-medium text-text-primary">Coverage</h4> <p class="text-sm text-text-secondary"> ${totalEntries} total entries across ${totalHabits} habits
</p> <p class="text-sm text-text-secondary">
Avg: ${Math.round(totalEntries / totalHabits)} entries per habit
</p> </div> <div class="space-y-2"> <h4 class="font-medium text-text-primary">Completeness</h4> <p class="text-sm text-text-secondary"> ${avgCompletionRate}% overall success rate
</p> <p class="text-sm text-text-secondary"> ${totalFailures} failure entries logged
</p> </div> <div class="space-y-2"> <h4 class="font-medium text-text-primary">Issues</h4> <p class="text-sm text-text-secondary"> ${habitsWithIssues.length} habits need attention
</p> <p class="text-sm text-text-secondary"> ${perfectHabits.length} habits performing perfectly
</p> </div> </div> </div> <!-- Issues and Recommendations --> ${habitsWithIssues.length > 0 && renderTemplate`<div class="card p-6"> <h3 class="text-xl font-semibold text-text-primary mb-4">🔧 Optimization Opportunities</h3> <div class="space-y-3"> ${habitsWithIssues.map((habit) => renderTemplate`<div class="flex items-center justify-between p-3 bg-surface-hover rounded-lg"> <div> <span class="font-medium text-text-primary">${habit.name}</span> <p class="text-sm text-text-muted"> ${habit.analytics.completionRate < 90 ? `${habit.analytics.completionRate}% completion rate` : habit.analytics.failureCount > 5 ? `${habit.analytics.failureCount} failures recorded` : `${habit.streak_count} day streak`} </p> </div> <div class="text-right"> <span class="text-sm text-accent-warning">Needs attention</span> </div> </div>`)} </div> </div>`} </div> ` })} ${renderScript($$result, "C:/Users/rahul/meshos-v3/src/pages/analytics.astro?astro&type=script&index=0&lang.ts")} `;
}, "C:/Users/rahul/meshos-v3/src/pages/analytics.astro", void 0);

const $$file = "C:/Users/rahul/meshos-v3/src/pages/analytics.astro";
const $$url = "/analytics";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Analytics,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
