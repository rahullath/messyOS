import { c as createComponent, a as createAstro, r as renderComponent, g as renderScript, b as renderTemplate, m as maybeRenderHead, e as addAttribute } from '../chunks/astro/server_BxgriC_5.mjs';
import 'kleur/colors';
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_BPLTWs40.mjs';
import { createServerClient } from '../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$Health = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Health;
  const supabase = createServerClient(Astro2.cookies);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Astro2.redirect("/login");
  }
  const thirtyDaysAgo = /* @__PURE__ */ new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: healthMetrics, error } = await supabase.from("metrics").select("type, value, unit, metadata, recorded_at").eq("user_id", user.id).in("type", ["sleep_duration", "heart_rate_avg", "heart_rate_min", "heart_rate_max", "stress_level", "health_score"]).gte("recorded_at", thirtyDaysAgo.toISOString()).order("recorded_at", { ascending: false });
  if (error) {
    console.error("Error fetching health metrics:", error);
  }
  const metrics = healthMetrics || [];
  const sleepData = metrics.filter((m) => m.type === "sleep_duration");
  const heartRateData = metrics.filter((m) => m.type === "heart_rate_avg");
  const stressData = metrics.filter((m) => m.type === "stress_level");
  const healthScores = metrics.filter((m) => m.type === "health_score");
  const avgSleep = sleepData.length > 0 ? Math.round(sleepData.reduce((sum, m) => sum + m.value, 0) / sleepData.length / 60 * 10) / 10 : 0;
  const avgHeartRate = heartRateData.length > 0 ? Math.round(heartRateData.reduce((sum, m) => sum + m.value, 0) / heartRateData.length) : 0;
  const avgStress = stressData.length > 0 ? Math.round(stressData.reduce((sum, m) => sum + m.value, 0) / stressData.length) : 0;
  const latestHealthScore = healthScores.length > 0 ? healthScores[0].value : 0;
  const sleepQuality = avgSleep >= 8 ? "Excellent" : avgSleep >= 7 ? "Good" : avgSleep >= 6 ? "Fair" : avgSleep > 0 ? "Poor" : "No Data";
  const stressStatus = avgStress <= 30 ? "Low" : avgStress <= 50 ? "Normal" : "High";
  const heartRateStatus = avgHeartRate >= 60 && avgHeartRate <= 80 ? "Normal" : avgHeartRate > 0 ? "Monitor" : "No Data";
  const sevenDaysAgo = /* @__PURE__ */ new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentMetrics = metrics.filter(
    (m) => new Date(m.recorded_at) >= sevenDaysAgo
  );
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const date = /* @__PURE__ */ new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const dayMetrics = recentMetrics.filter(
      (m) => m.recorded_at.split("T")[0] === dateStr
    );
    const sleepMetric = dayMetrics.find((m) => m.type === "sleep_duration");
    const heartRateMetric = dayMetrics.find((m) => m.type === "heart_rate_avg");
    const stressMetric = dayMetrics.find((m) => m.type === "stress_level");
    chartData.push({
      date: dateStr,
      dayOfWeek: date.toLocaleDateString("en-US", { weekday: "short" }),
      sleepDuration: sleepMetric?.value || 0,
      sleepHours: sleepMetric ? Math.round(sleepMetric.value / 60 * 10) / 10 : 0,
      avgHeartRate: heartRateMetric?.value || 0,
      stressLevel: stressMetric?.value || 0
    });
  }
  const hasHealthData = metrics.length > 0;
  const medicationAdherence = {
    bupropion: 85,
    // Placeholder percentage
    melatonin: 92
    // Placeholder percentage
  };
  const healthStats = {
    avgSleep,
    sleepQuality,
    avgHeartRate,
    heartRateVariability: 12,
    // Placeholder
    avgStress,
    stressStatus,
    healthScore: latestHealthScore,
    last7Days: chartData,
    last30Days: chartData,
    // For now, using same data
    medicationAdherence
  };
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Health - MeshOS" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="space-y-8"> <!-- Header --> <div class="flex items-center justify-between"> <div> <h1 class="text-3xl font-semibold text-text-primary mb-2">Health Dashboard</h1> <p class="text-text-secondary">
Track your sleep, heart rate, stress, and overall wellness
</p> </div> <div class="flex space-x-3"> <button id="import-health-btn" class="flex items-center px-4 py-2 bg-accent-success text-white rounded-lg hover:bg-accent-success/90 transition-colors"> <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path> </svg>
Import Health Data
</button> <button id="log-health-btn" class="flex items-center px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"> <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path> </svg>
Log Manual Entry
</button> </div> </div> ${hasHealthData ? renderTemplate`<!-- Health Dashboard Component -->
      <div id="health-dashboard"${addAttribute(user.id, "data-user-id")}${addAttribute(JSON.stringify(healthStats), "data-health-stats")}> <!-- This will be enhanced by the React component --> <!-- Fallback: Basic Health Overview --> <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"> <!-- Health Score --> <div class="card p-6 col-span-1 md:col-span-2"> <div class="flex items-center justify-between"> <div> <h3 class="text-lg font-semibold text-text-primary mb-2">Overall Health Score</h3> <p class="text-text-muted text-sm">Based on sleep, heart rate, and stress</p> </div> <div class="text-center"> <div${addAttribute(`text-4xl font-bold ${latestHealthScore >= 80 ? "text-accent-success" : latestHealthScore >= 60 ? "text-accent-warning" : "text-accent-error"}`, "class")}> ${latestHealthScore || "--"} </div> <div class="text-text-muted text-sm">/100</div> </div> </div> </div> <!-- Sleep --> <div class="card p-6"> <div class="flex items-center justify-between"> <div> <p class="text-sm font-medium text-text-muted">Avg Sleep</p> <p class="text-2xl font-semibold text-text-primary mt-1"> ${avgSleep > 0 ? `${avgSleep}h` : "--"} </p> <p${addAttribute(`text-sm mt-1 ${avgSleep >= 7 ? "text-accent-success" : avgSleep >= 6 ? "text-accent-warning" : avgSleep > 0 ? "text-accent-error" : "text-text-muted"}`, "class")}> ${sleepQuality} </p> </div> <div class="w-12 h-12 bg-accent-primary/10 rounded-lg flex items-center justify-center"> <span class="text-2xl">😴</span> </div> </div> </div> <!-- Heart Rate --> <div class="card p-6"> <div class="flex items-center justify-between"> <div> <p class="text-sm font-medium text-text-muted">Heart Rate</p> <p class="text-2xl font-semibold text-text-primary mt-1"> ${avgHeartRate > 0 ? avgHeartRate : "--"} </p> <p${addAttribute(`text-sm mt-1 ${heartRateStatus === "Normal" ? "text-accent-success" : heartRateStatus === "Monitor" ? "text-accent-warning" : "text-text-muted"}`, "class")}> ${heartRateStatus} </p> </div> <div class="w-12 h-12 bg-accent-error/10 rounded-lg flex items-center justify-center"> <span class="text-2xl">❤️</span> </div> </div> </div> </div> <!-- Medication Tracking --> <div class="card p-6 mb-8"> <h3 class="text-lg font-semibold text-text-primary mb-4">Today's Medication</h3> <div class="grid grid-cols-1 md:grid-cols-3 gap-4"> <!-- Bupropion Morning --> <div class="p-4 bg-surface-hover rounded-lg"> <div class="flex items-center justify-between mb-3"> <div> <h4 class="font-medium text-text-primary">Bupropion</h4> <p class="text-sm text-text-muted">Morning dose</p> </div> <span class="text-2xl">🌅</span> </div> <div class="flex space-x-2"> <button onclick="logMedication('bupropion_morning', true)" class="flex-1 py-2 px-3 bg-accent-success/20 text-accent-success rounded text-sm hover:bg-accent-success/30 transition-colors">
✓ Taken
</button> <button onclick="logMedication('bupropion_morning', false)" class="flex-1 py-2 px-3 bg-accent-error/20 text-accent-error rounded text-sm hover:bg-accent-error/30 transition-colors">
✗ Missed
</button> </div> </div> <!-- Bupropion Afternoon --> <div class="p-4 bg-surface-hover rounded-lg"> <div class="flex items-center justify-between mb-3"> <div> <h4 class="font-medium text-text-primary">Bupropion</h4> <p class="text-sm text-text-muted">Afternoon dose</p> </div> <span class="text-2xl">☀️</span> </div> <div class="flex space-x-2"> <button onclick="logMedication('bupropion_afternoon', true)" class="flex-1 py-2 px-3 bg-accent-success/20 text-accent-success rounded text-sm hover:bg-accent-success/30 transition-colors">
✓ Taken
</button> <button onclick="logMedication('bupropion_afternoon', false)" class="flex-1 py-2 px-3 bg-accent-error/20 text-accent-error rounded text-sm hover:bg-accent-error/30 transition-colors">
✗ Missed
</button> </div> </div> <!-- Melatonin --> <div class="p-4 bg-surface-hover rounded-lg"> <div class="flex items-center justify-between mb-3"> <div> <h4 class="font-medium text-text-primary">Melatonin</h4> <p class="text-sm text-text-muted">Evening dose</p> </div> <span class="text-2xl">🌙</span> </div> <div class="flex space-x-2"> <button onclick="logMedication('melatonin_evening', true)" class="flex-1 py-2 px-3 bg-accent-success/20 text-accent-success rounded text-sm hover:bg-accent-success/30 transition-colors">
✓ Taken
</button> <button onclick="logMedication('melatonin_evening', false)" class="flex-1 py-2 px-3 bg-accent-error/20 text-accent-error rounded text-sm hover:bg-accent-error/30 transition-colors">
✗ Missed
</button> </div> </div> </div> </div> <!-- Recent Health Trends --> <div class="grid grid-cols-1 lg:grid-cols-2 gap-8"> <!-- Sleep Trends --> <div class="card p-6"> <h3 class="text-lg font-semibold text-text-primary mb-4">Recent Sleep Pattern</h3> <div class="space-y-3"> ${chartData.slice(-7).map((day, index) => renderTemplate`<div${addAttribute(index, "key")} class="flex items-center justify-between p-3 bg-surface-hover rounded-lg"> <div class="flex items-center space-x-3"> <span class="text-sm font-medium text-text-primary w-8">${day.dayOfWeek}</span> <div class="flex-1"> <div class="text-sm text-text-secondary">${day.date}</div> </div> </div> <div class="text-right"> <span${addAttribute(`text-lg font-semibold ${day.sleepHours >= 7 ? "text-accent-success" : day.sleepHours >= 6 ? "text-accent-warning" : day.sleepHours > 0 ? "text-accent-error" : "text-text-muted"}`, "class")}> ${day.sleepHours > 0 ? `${day.sleepHours}h` : "--"} </span> </div> </div>`)} </div> </div> <!-- Stress & Heart Rate --> <div class="card p-6"> <h3 class="text-lg font-semibold text-text-primary mb-4">Stress & Heart Rate</h3> <div class="space-y-3"> ${chartData.slice(-7).map((day, index) => renderTemplate`<div${addAttribute(index, "key")} class="flex items-center justify-between p-3 bg-surface-hover rounded-lg"> <div class="flex items-center space-x-3"> <span class="text-sm font-medium text-text-primary w-8">${day.dayOfWeek}</span> </div> <div class="flex items-center space-x-4"> <div class="text-right"> <div class="text-sm text-text-muted">HR</div> <span class="text-sm font-medium text-accent-error"> ${day.avgHeartRate > 0 ? `${day.avgHeartRate} bpm` : "--"} </span> </div> <div class="text-right"> <div class="text-sm text-text-muted">Stress</div> <span${addAttribute(`text-sm font-medium ${day.stressLevel <= 30 ? "text-accent-success" : day.stressLevel <= 50 ? "text-accent-warning" : "text-accent-error"}`, "class")}> ${day.stressLevel > 0 ? day.stressLevel : "--"} </span> </div> </div> </div>`)} </div> </div> </div> </div>` : renderTemplate`<!-- No Data State -->
      <div class="card p-8 text-center"> <div class="w-16 h-16 bg-accent-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"> <span class="text-2xl">🏥</span> </div> <h3 class="text-lg font-semibold text-text-primary mb-2">No Health Data</h3> <p class="text-text-muted mb-6">Import your Huawei Band data to start tracking your health metrics and get AI-powered insights.</p> <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-md mx-auto"> <div class="p-3 bg-surface-hover rounded-lg"> <div class="text-2xl mb-1">😴</div> <div class="text-sm font-medium text-text-primary">Sleep</div> <div class="text-xs text-text-muted">Duration & Quality</div> </div> <div class="p-3 bg-surface-hover rounded-lg"> <div class="text-2xl mb-1">❤️</div> <div class="text-sm font-medium text-text-primary">Heart Rate</div> <div class="text-xs text-text-muted">Min, Max, Average</div> </div> <div class="p-3 bg-surface-hover rounded-lg"> <div class="text-2xl mb-1">😰</div> <div class="text-sm font-medium text-text-primary">Stress</div> <div class="text-xs text-text-muted">Daily Levels</div> </div> </div> <button onclick="window.location.href = '/import'" class="mt-6 px-6 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors">
Import Health Data
</button> </div>`} <!-- Health Import Modal --> <div id="import-modal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50"> <div class="bg-surface rounded-lg p-6 w-full max-w-md mx-4"> <div class="flex items-center justify-between mb-4"> <h3 class="text-xl font-semibold text-text-primary">Import Health Data</h3> <button id="close-import" class="text-text-muted hover:text-text-primary"> <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path> </svg> </button> </div> <p class="text-text-secondary mb-4">
Import sleep, heart rate, and stress data from your Huawei Band 9.
</p> <a href="/import" class="w-full flex items-center justify-center px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors">
Go to Import Page
</a> </div> </div> </div> ` })} ${renderScript($$result, "C:/Users/rahul/meshos-v3/src/pages/health.astro?astro&type=script&index=0&lang.ts")} `;
}, "C:/Users/rahul/meshos-v3/src/pages/health.astro", void 0);

const $$file = "C:/Users/rahul/meshos-v3/src/pages/health.astro";
const $$url = "/health";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Health,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
