import { c as createComponent, a as createAstro, r as renderComponent, g as renderScript, b as renderTemplate, m as maybeRenderHead, e as addAttribute } from '../chunks/astro/server_BxgriC_5.mjs';
import 'kleur/colors';
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_BPLTWs40.mjs';
import { createServerClient } from '../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$Finance = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Finance;
  const supabase = createServerClient(Astro2.cookies);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Astro2.redirect("/login");
  }
  const sixMonthsAgo = /* @__PURE__ */ new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const { data: financeMetrics, error } = await supabase.from("metrics").select("type, value, unit, metadata, recorded_at").eq("user_id", user.id).in("type", ["expense", "income", "crypto_value"]).gte("recorded_at", sixMonthsAgo.toISOString()).order("recorded_at", { ascending: false });
  if (error) {
    console.error("Error fetching finance metrics:", error);
  }
  const metrics = financeMetrics || [];
  const expenses = metrics.filter((m) => m.type === "expense");
  const cryptoHoldings = metrics.filter((m) => m.type === "crypto_value");
  const cryptoValue = cryptoHoldings.reduce((sum, c) => sum + c.value, 0);
  metrics.filter((m) => m.type === "bank_transaction");
  const monthlyExpensesMetrics = metrics.filter((m) => m.type === "monthly_expenses");
  const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
  const monthlyExpenses = monthlyExpensesMetrics.length > 0 ? monthlyExpensesMetrics[0].value : totalExpenses;
  const currentBalance = 94300;
  const runway = currentBalance / (monthlyExpenses || 40546);
  const expensesByCategory = /* @__PURE__ */ new Map();
  for (const expense of expenses) {
    const category = expense.metadata?.category || "Other";
    expensesByCategory.set(category, (expensesByCategory.get(category) || 0) + expense.value);
  }
  const topCategories = Array.from(expensesByCategory.entries()).map(([category, amount]) => ({
    category,
    amount,
    percentage: amount / totalExpenses * 100
  })).sort((a, b) => b.amount - a.amount).slice(0, 6);
  const budgetScore = calculateBudgetHealth(monthlyExpenses, runway, cryptoHoldings.length);
  const recentTransactions = expenses.slice(0, 10).map((expense) => ({
    date: expense.recorded_at,
    description: expense.metadata?.description || "Unknown expense",
    amount: expense.value,
    category: expense.metadata?.category || "Other",
    vendor: expense.metadata?.vendor || "Unknown"
  }));
  const hasFinanceData = metrics.length > 0;
  function calculateBudgetHealth(monthlyExp, runwayMonths, cryptoCount) {
    let score = 100;
    const recommendations = [];
    if (monthlyExp > 45e3) {
      score -= 20;
      recommendations.push("Reduce monthly expenses from \u20B9" + monthlyExp.toLocaleString() + " to \u20B935,000 target");
    } else if (monthlyExp > 35e3) {
      score -= 10;
      recommendations.push("Optimize spending to reach \u20B935,000/month budget for better runway");
    }
    if (runwayMonths < 2) {
      score -= 20;
      recommendations.push("Critical: Less than 2 months runway. Find job immediately or reduce expenses by 50%");
    } else if (runwayMonths < 3) {
      score -= 10;
      recommendations.push("Focus on job search - less than 3 months runway remaining");
    }
    if (cryptoCount < 3) {
      score -= 10;
      recommendations.push("Consider diversifying crypto portfolio beyond current " + cryptoCount + " holdings");
    }
    if (recommendations.length === 0) {
      recommendations.push("Your budget is well-optimized! Focus on increasing income through job search.");
    }
    if (monthlyExp > 4e4) {
      recommendations.push("Target MK Retail reduction: from \u20B93,053 to \u20B91,500/month saves \u20B91,553");
      recommendations.push("Cut convenience purchases (energy drinks, candy) by 50% saves \u20B9500/month");
    }
    const status = score >= 80 ? "excellent" : score >= 60 ? "good" : score >= 40 ? "warning" : "critical";
    return { score: Math.max(0, score), status, recommendations };
  }
  ({
    cryptoHoldings: cryptoHoldings.map((c) => ({
      symbol: c.metadata?.symbol || "UNKNOWN",
      value: c.value,
      quantity: c.metadata?.quantity || 0,
      chain: c.metadata?.chain || "Unknown",
      change24h: c.metadata?.change24h || 0
    }))});
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Finance - MeshOS" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="space-y-8"> <!-- Header --> <div class="flex items-center justify-between"> <div> <h1 class="text-3xl font-semibold text-text-primary mb-2">Finance Dashboard</h1> <p class="text-text-secondary">
Track expenses, manage crypto portfolio, and optimize your financial runway
</p> </div> <div class="flex space-x-3"> <button id="import-finance-btn" class="flex items-center px-4 py-2 bg-accent-warning text-white rounded-lg hover:bg-accent-warning/90 transition-colors"> <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path> </svg>
Import Financial Data
</button> <button id="log-expense-btn" class="flex items-center px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"> <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path> </svg>
Log Expense
</button> </div> </div> ${hasFinanceData ? renderTemplate`<!-- Finance Dashboard with Real Data -->
      <div> <!-- Key Financial Metrics --> <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"> <!-- Monthly Expenses --> <div class="card p-6"> <div class="flex items-center justify-between"> <div> <p class="text-sm font-medium text-text-muted">Monthly Expenses</p> <p class="text-2xl font-semibold text-text-primary mt-1">
₹${monthlyExpenses.toLocaleString()} </p> <p${addAttribute(`text-sm mt-1 ${monthlyExpenses > 45e3 ? "text-accent-error" : monthlyExpenses > 35e3 ? "text-accent-warning" : "text-accent-success"}`, "class")}> ${monthlyExpenses > 45e3 ? "High" : monthlyExpenses > 35e3 ? "Moderate" : "Optimized"} </p> </div> <div class="w-12 h-12 bg-accent-error/10 rounded-lg flex items-center justify-center"> <span class="text-2xl">💸</span> </div> </div> </div> <!-- Crypto Portfolio --> <div class="card p-6"> <div class="flex items-center justify-between"> <div> <p class="text-sm font-medium text-text-muted">Crypto Portfolio</p> <p class="text-2xl font-semibold text-text-primary mt-1">
$${cryptoValue.toFixed(2)} </p> <p class="text-sm text-text-muted mt-1">₹${(cryptoValue * 83).toLocaleString()}</p> </div> <div class="w-12 h-12 bg-accent-warning/10 rounded-lg flex items-center justify-center"> <span class="text-2xl">₿</span> </div> </div> </div> <!-- Financial Runway --> <div class="card p-6"> <div class="flex items-center justify-between"> <div> <p class="text-sm font-medium text-text-muted">Financial Runway</p> <p class="text-2xl font-semibold text-text-primary mt-1"> ${runway.toFixed(1)} </p> <p${addAttribute(`text-sm mt-1 ${runway >= 3 ? "text-accent-success" : runway >= 2 ? "text-accent-warning" : "text-accent-error"}`, "class")}>
months left
</p> </div> <div class="w-12 h-12 bg-accent-primary/10 rounded-lg flex items-center justify-center"> <span class="text-2xl">⏱️</span> </div> </div> </div> <!-- Budget Health --> <div class="card p-6"> <div class="flex items-center justify-between"> <div> <p class="text-sm font-medium text-text-muted">Budget Health</p> <p class="text-2xl font-semibold text-text-primary mt-1"> ${budgetScore.score}/100
</p> <p${addAttribute(`text-sm mt-1 capitalize ${budgetScore.status === "excellent" ? "text-accent-success" : budgetScore.status === "good" ? "text-accent-primary" : budgetScore.status === "warning" ? "text-accent-warning" : "text-accent-error"}`, "class")}> ${budgetScore.status} </p> </div> <div class="w-12 h-12 bg-accent-success/10 rounded-lg flex items-center justify-center"> <span class="text-2xl">📊</span> </div> </div> </div> </div> <!-- Expense Categories --> <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"> <div class="card p-6"> <h3 class="text-lg font-semibold text-text-primary mb-4">Top Expense Categories</h3> <div class="space-y-4"> ${topCategories.map((category, index) => renderTemplate`<div class="space-y-2"> <div class="flex items-center justify-between"> <span class="text-text-primary font-medium">${category.category}</span> <span class="text-text-secondary">₹${category.amount.toLocaleString()}</span> </div> <div class="w-full bg-surface-hover rounded-full h-2"> <div class="h-2 rounded-full bg-accent-primary"${addAttribute(`width: ${Math.min(category.percentage, 100)}%`, "style")}></div> </div> <div class="flex items-center justify-between text-xs"> <span class="text-text-muted">${category.percentage.toFixed(1)}% of total</span> <span class="text-text-muted">
₹${Math.round(category.amount / 30).toLocaleString()}/day avg
</span> </div> </div>`)} </div> </div> <!-- Recent Transactions --> <div class="card p-6"> <h3 class="text-lg font-semibold text-text-primary mb-4">Recent Transactions</h3> <div class="space-y-3"> ${recentTransactions.slice(0, 8).map((transaction, index) => renderTemplate`<div class="flex items-center justify-between p-3 bg-surface-hover rounded-lg"> <div class="flex items-center space-x-3"> <div${addAttribute(`w-8 h-8 rounded-lg flex items-center justify-center ${transaction.category === "Food Delivery" ? "bg-accent-error/20" : transaction.category === "Groceries" ? "bg-accent-success/20" : transaction.category === "Pet Care" ? "bg-accent-warning/20" : "bg-accent-primary/20"}`, "class")}> <span class="text-sm"> ${transaction.category === "Food Delivery" ? "\u{1F355}" : transaction.category === "Groceries" ? "\u{1F6D2}" : transaction.category === "Pet Care" ? "\u{1F431}" : "\u{1F4B3}"} </span> </div> <div> <p class="font-medium text-text-primary text-sm">${transaction.description.substring(0, 30)}...</p> <div class="flex items-center space-x-2 text-xs text-text-muted"> <span>${transaction.vendor}</span> <span>•</span> <span>${new Date(transaction.date).toLocaleDateString()}</span> </div> </div> </div> <div class="text-right"> <p class="font-semibold text-accent-error text-sm">₹${transaction.amount.toLocaleString()}</p> </div> </div>`)} </div> </div> </div> <!-- Job Search Financial Tracker --> <div class="card p-6 bg-gradient-to-r from-accent-warning/10 to-accent-error/10 border border-accent-warning/20 mb-8"> <h3 class="text-lg font-semibold text-text-primary mb-4">🎯 Job Search Financial Strategy</h3> <div class="grid grid-cols-1 md:grid-cols-4 gap-6"> <div class="text-center"> <div class="text-3xl font-bold text-accent-warning mb-2"> ${runway.toFixed(1)} </div> <div class="text-sm text-text-muted">Months Remaining</div> <div class="text-xs text-text-secondary mt-1">At current spending</div> </div> <div class="text-center"> <div class="text-3xl font-bold text-accent-primary mb-2">
Jul 31
</div> <div class="text-sm text-text-muted">Target Job Date</div> <div class="text-xs text-text-secondary mt-1">For September comfort</div> </div> <div class="text-3xl font-bold text-accent-success mb-2 text-center">
₹${(monthlyExpenses * 0.8).toLocaleString()} </div> <div class="text-sm text-text-muted text-center">Optimized Budget</div> <div class="text-xs text-text-secondary mt-1 text-center">20% reduction target</div> </div> <div class="mt-6 p-4 bg-accent-warning/10 rounded-lg"> <p class="text-sm text-text-secondary"> <strong class="text-accent-warning">Strategy:</strong> Your Y Combinator background + Web3 expertise positions you well. 
              Reduce MK Retail spending (₹3,053→₹1,500) and convenience purchases to extend runway to ${(runway * 1.25).toFixed(1)} months.
</p> </div> </div> <!-- AI Recommendations --> <div class="card p-6"> <h3 class="text-lg font-semibold text-text-primary mb-4">💡 AI Budget Recommendations</h3> <div class="space-y-4"> ${budgetScore.recommendations.map((recommendation, index) => renderTemplate`<div class="flex items-start space-x-3 p-4 bg-accent-primary/10 border border-accent-primary/20 rounded-lg"> <div class="w-6 h-6 bg-accent-primary rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"> <span class="text-white text-xs font-bold">${index + 1}</span> </div> <p class="text-text-secondary text-sm">${recommendation}</p> </div>`)} </div> </div> </div>` : renderTemplate`<!-- No Data State -->
      <div class="card p-8 text-center"> <div class="w-16 h-16 bg-accent-warning/10 rounded-full flex items-center justify-center mx-auto mb-4"> <span class="text-2xl">💰</span> </div> <h3 class="text-lg font-semibold text-text-primary mb-2">No Financial Data</h3> <p class="text-text-muted mb-6">
Import your expense data, crypto holdings, and bank statements to start comprehensive financial tracking.
</p> <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-md mx-auto mb-6"> <div class="p-3 bg-surface-hover rounded-lg"> <div class="text-2xl mb-1">📱</div> <div class="text-sm font-medium text-text-primary">Expenses</div> <div class="text-xs text-text-muted">Zepto, Swiggy, Blinkit</div> </div> <div class="p-3 bg-surface-hover rounded-lg"> <div class="text-2xl mb-1">₿</div> <div class="text-sm font-medium text-text-primary">Crypto</div> <div class="text-xs text-text-muted">Trust Wallet portfolio</div> </div> <div class="p-3 bg-surface-hover rounded-lg"> <div class="text-2xl mb-1">🏦</div> <div class="text-sm font-medium text-text-primary">Banking</div> <div class="text-xs text-text-muted">Jupiter statements</div> </div> </div> <button onclick="window.location.href = '/import'" class="px-6 py-3 bg-accent-warning text-white rounded-lg hover:bg-accent-warning/90 transition-colors">
Import Financial Data
</button> </div>`} </div> ` })} ${renderScript($$result, "C:/Users/rahul/meshos-v3/src/pages/finance.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/rahul/meshos-v3/src/pages/finance.astro", void 0);

const $$file = "C:/Users/rahul/meshos-v3/src/pages/finance.astro";
const $$url = "/finance";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Finance,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
