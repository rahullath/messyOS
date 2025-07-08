import { renderers } from './renderers.mjs';
import { c as createExports } from './chunks/entrypoint_C0e0PWi2.mjs';
import { manifest } from './manifest_CgLVWqmG.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/ai-agent.astro.mjs');
const _page2 = () => import('./pages/analytics.astro.mjs');
const _page3 = () => import('./pages/api/ai/chat.astro.mjs');
const _page4 = () => import('./pages/api/ai/daily-briefing.astro.mjs');
const _page5 = () => import('./pages/api/ai/life-optimization.astro.mjs');
const _page6 = () => import('./pages/api/ai/test.astro.mjs');
const _page7 = () => import('./pages/api/ai/weekly-report.astro.mjs');
const _page8 = () => import('./pages/api/content/add.astro.mjs');
const _page9 = () => import('./pages/api/content/dashboard.astro.mjs');
const _page10 = () => import('./pages/api/content/import/serializd.astro.mjs');
const _page11 = () => import('./pages/api/content/insights.astro.mjs');
const _page12 = () => import('./pages/api/content/poster/_tmdbid_.astro.mjs');
const _page13 = () => import('./pages/api/content.astro.mjs');
const _page14 = () => import('./pages/api/debug-session.astro.mjs');
const _page15 = () => import('./pages/api/finance/clean.astro.mjs');
const _page16 = () => import('./pages/api/finance/cleanup.astro.mjs');
const _page17 = () => import('./pages/api/finance/complete-fix.astro.mjs');
const _page18 = () => import('./pages/api/finance/fix-data.astro.mjs');
const _page19 = () => import('./pages/api/finance/unified-data.astro.mjs');
const _page20 = () => import('./pages/api/habits/recalculate-streaks.astro.mjs');
const _page21 = () => import('./pages/api/habits/_id_/log.astro.mjs');
const _page22 = () => import('./pages/api/habits/_id_/log-enhanced.astro.mjs');
const _page23 = () => import('./pages/api/habits.astro.mjs');
const _page24 = () => import('./pages/api/health/dashboard.astro.mjs');
const _page25 = () => import('./pages/api/health/medication.astro.mjs');
const _page26 = () => import('./pages/api/import/content.astro.mjs');
const _page27 = () => import('./pages/api/import/finance.astro.mjs');
const _page28 = () => import('./pages/api/import/health.astro.mjs');
const _page29 = () => import('./pages/api/import/loop-habits.astro.mjs');
const _page30 = () => import('./pages/api/tasks/ai-assistant.astro.mjs');
const _page31 = () => import('./pages/api/tasks/stop-session.astro.mjs');
const _page32 = () => import('./pages/api/tasks/test.astro.mjs');
const _page33 = () => import('./pages/api/tasks/_id_/start.astro.mjs');
const _page34 = () => import('./pages/api/tasks/_id_/timer.astro.mjs');
const _page35 = () => import('./pages/api/tasks/_id_.astro.mjs');
const _page36 = () => import('./pages/api/tasks.astro.mjs');
const _page37 = () => import('./pages/auth/callback.astro.mjs');
const _page38 = () => import('./pages/auth/exchange.astro.mjs');
const _page39 = () => import('./pages/content.astro.mjs');
const _page40 = () => import('./pages/finance.astro.mjs');
const _page41 = () => import('./pages/habits.astro.mjs');
const _page42 = () => import('./pages/health.astro.mjs');
const _page43 = () => import('./pages/import.astro.mjs');
const _page44 = () => import('./pages/login.astro.mjs');
const _page45 = () => import('./pages/tasks.astro.mjs');
const _page46 = () => import('./pages/tasks-fixed.astro.mjs');
const _page47 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/ai-agent.astro", _page1],
    ["src/pages/analytics.astro", _page2],
    ["src/pages/api/ai/chat.ts", _page3],
    ["src/pages/api/ai/daily-briefing.ts", _page4],
    ["src/pages/api/ai/life-optimization.ts", _page5],
    ["src/pages/api/ai/test.ts", _page6],
    ["src/pages/api/ai/weekly-report.ts", _page7],
    ["src/pages/api/content/add.ts", _page8],
    ["src/pages/api/content/dashboard.ts", _page9],
    ["src/pages/api/content/import/serializd.ts", _page10],
    ["src/pages/api/content/insights.ts", _page11],
    ["src/pages/api/content/poster/[tmdbid].ts", _page12],
    ["src/pages/api/content/index.ts", _page13],
    ["src/pages/api/debug-session.ts", _page14],
    ["src/pages/api/finance/clean.ts", _page15],
    ["src/pages/api/finance/cleanup.ts", _page16],
    ["src/pages/api/finance/complete-fix.ts", _page17],
    ["src/pages/api/finance/fix-data.ts", _page18],
    ["src/pages/api/finance/unified-data.ts", _page19],
    ["src/pages/api/habits/recalculate-streaks.ts", _page20],
    ["src/pages/api/habits/[id]/log.ts", _page21],
    ["src/pages/api/habits/[id]/log-enhanced.ts", _page22],
    ["src/pages/api/habits/index.ts", _page23],
    ["src/pages/api/health/dashboard.ts", _page24],
    ["src/pages/api/health/medication.ts", _page25],
    ["src/pages/api/import/content.ts", _page26],
    ["src/pages/api/import/finance.ts", _page27],
    ["src/pages/api/import/health.ts", _page28],
    ["src/pages/api/import/loop-habits.ts", _page29],
    ["src/pages/api/tasks/ai-assistant.ts", _page30],
    ["src/pages/api/tasks/stop-session.ts", _page31],
    ["src/pages/api/tasks/test.ts", _page32],
    ["src/pages/api/tasks/[id]/start.ts", _page33],
    ["src/pages/api/tasks/[id]/timer.ts", _page34],
    ["src/pages/api/tasks/[id]/index.ts", _page35],
    ["src/pages/api/tasks/index.ts", _page36],
    ["src/pages/auth/callback.astro", _page37],
    ["src/pages/auth/exchange.astro", _page38],
    ["src/pages/content.astro", _page39],
    ["src/pages/finance.astro", _page40],
    ["src/pages/habits.astro", _page41],
    ["src/pages/health.astro", _page42],
    ["src/pages/import.astro", _page43],
    ["src/pages/login.astro", _page44],
    ["src/pages/tasks.astro", _page45],
    ["src/pages/tasks-fixed.astro", _page46],
    ["src/pages/index.astro", _page47]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./_noop-actions.mjs'),
    middleware: () => import('./_astro-internal_middleware.mjs')
});
const _args = {
    "middlewareSecret": "52740c63-cd41-4ffc-a724-cc07910f9e70",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;

export { __astrojsSsrVirtualEntry as default, pageMap };
