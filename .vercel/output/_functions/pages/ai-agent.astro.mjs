import { c as createComponent, r as renderComponent, b as renderTemplate, m as maybeRenderHead, g as renderScript } from '../chunks/astro/server_BxgriC_5.mjs';
import 'kleur/colors';
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_BPLTWs40.mjs';
export { renderers } from '../renderers.mjs';

const $$AiAgent = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "AI Agent - Mesh" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="space-y-6"> <!-- Page Header --> <div class="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white"> <div class="flex items-center gap-4"> <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center"> <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"> <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path> </svg> </div> <div> <h1 class="text-3xl font-bold">Meet Mesh</h1> <p class="text-blue-100 mt-1">Your AI-powered life optimization agent</p> </div> </div> </div> <!-- Daily Briefing --> <div id="daily-briefing-container"> <!-- Daily briefing will be loaded here --> </div> <!-- Main Content Grid --> <div class="grid grid-cols-1 lg:grid-cols-3 gap-6"> <!-- AI Chat Interface --> <div class="lg:col-span-2"> <div class="bg-white rounded-lg shadow-lg"> <div class="p-4 border-b border-gray-200"> <h2 class="text-xl font-semibold text-gray-900">Chat with Mesh</h2> <p class="text-gray-600 text-sm mt-1">Ask about your patterns, get optimization suggestions, or just chat about your goals</p> </div> <div id="ai-chat-container" style="height: 600px;"> <!-- AI chat will be loaded here --> </div> </div> </div> <!-- Side Panel --> <div class="space-y-6"> <!-- Agent Status --> <div class="bg-white rounded-lg shadow-lg p-6"> <h3 class="text-lg font-semibold text-gray-900 mb-4">Agent Status</h3> <div class="space-y-4"> <div class="flex items-center justify-between"> <span class="text-gray-600">Status</span> <span class="flex items-center gap-2 text-green-600"> <div class="w-2 h-2 bg-green-500 rounded-full"></div>
Active
</span> </div> <div class="flex items-center justify-between"> <span class="text-gray-600">Data Sources</span> <span class="text-gray-900 font-medium">4 Connected</span> </div> <div class="flex items-center justify-between"> <span class="text-gray-600">Last Analysis</span> <span class="text-gray-900 font-medium" id="last-analysis">Just now</span> </div> <div class="flex items-center justify-between"> <span class="text-gray-600">Confidence</span> <span class="text-gray-900 font-medium">85%</span> </div> </div> </div> <!-- Quick Actions --> <div class="bg-white rounded-lg shadow-lg p-6"> <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3> <div class="space-y-3"> <button id="generate-briefing" class="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors text-sm">
Generate New Briefing
</button> <button id="weekly-report" class="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg transition-colors text-sm">
Weekly Report
</button> <button id="optimize-habits" class="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors text-sm">
Optimize Habits
</button> <button id="analyze-patterns" class="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg transition-colors text-sm">
Analyze Patterns
</button> </div> </div> <!-- Agent Capabilities --> <div class="bg-white rounded-lg shadow-lg p-6"> <h3 class="text-lg font-semibold text-gray-900 mb-4">What Mesh Can Do</h3> <div class="space-y-3 text-sm"> <div class="flex items-start gap-3"> <div class="w-2 h-2 bg-blue-500 rounded-full mt-2"></div> <div> <div class="font-medium text-gray-900">Pattern Recognition</div> <div class="text-gray-600">Identifies hidden patterns in your habits, health, and lifestyle data</div> </div> </div> <div class="flex items-start gap-3"> <div class="w-2 h-2 bg-green-500 rounded-full mt-2"></div> <div> <div class="font-medium text-gray-900">Proactive Optimization</div> <div class="text-gray-600">Suggests improvements before problems occur</div> </div> </div> <div class="flex items-start gap-3"> <div class="w-2 h-2 bg-purple-500 rounded-full mt-2"></div> <div> <div class="font-medium text-gray-900">Cross-Domain Insights</div> <div class="text-gray-600">Connects habits, health, finance, and productivity data</div> </div> </div> <div class="flex items-start gap-3"> <div class="w-2 h-2 bg-orange-500 rounded-full mt-2"></div> <div> <div class="font-medium text-gray-900">Personalized Coaching</div> <div class="text-gray-600">Adapts recommendations to your unique patterns</div> </div> </div> </div> </div> <!-- Recent Insights --> <div class="bg-white rounded-lg shadow-lg p-6"> <h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Insights</h3> <div id="recent-insights" class="space-y-3 text-sm"> <div class="p-3 bg-blue-50 rounded-lg border border-blue-200"> <div class="font-medium text-blue-900">Habit Correlation Found</div> <div class="text-blue-700 mt-1">Your gym sessions correlate with better sleep quality</div> </div> <div class="p-3 bg-green-50 rounded-lg border border-green-200"> <div class="font-medium text-green-900">Optimization Opportunity</div> <div class="text-green-700 mt-1">Morning routine timing can be improved by 15 minutes</div> </div> <div class="p-3 bg-purple-50 rounded-lg border border-purple-200"> <div class="font-medium text-purple-900">Pattern Detected</div> <div class="text-purple-700 mt-1">Weekend productivity follows a predictable pattern</div> </div> </div> </div> </div> </div> </div> ${renderScript($$result2, "C:/Users/rahul/meshos-v3/src/pages/ai-agent.astro?astro&type=script&index=0&lang.ts")} ` })}`;
}, "C:/Users/rahul/meshos-v3/src/pages/ai-agent.astro", void 0);

const $$file = "C:/Users/rahul/meshos-v3/src/pages/ai-agent.astro";
const $$url = "/ai-agent";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$AiAgent,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
