import { createServerClient } from '../../../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../../../renderers.mjs';

const POST = async ({ request, cookies }) => {
  const supabase = createServerClient(cookies);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const { action } = await request.json();
    if (action === "full-fix") {
      console.log("🔧 Starting full finance data fix for user:", user.id);
      await cleanupDuplicates(supabase, user.id);
      await fixCryptoHoldings(supabase, user.id);
      await addSampleExpenses(supabase, user.id);
      const summary = await generateSummary(supabase, user.id);
      return new Response(JSON.stringify({
        success: true,
        message: "Finance data fixed successfully",
        summary
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({
      success: false,
      error: "Invalid action"
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("❌ Fix data error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
async function cleanupDuplicates(supabase, userId) {
  console.log("🧹 Cleaning up duplicates...");
  const { data: metrics } = await supabase.from("metrics").select("*").eq("user_id", userId).in("type", ["expense", "crypto_value"]);
  if (!metrics || metrics.length === 0) return;
  const duplicateGroups = /* @__PURE__ */ new Map();
  for (const metric of metrics) {
    const key = createDeduplicationKey(metric);
    if (!duplicateGroups.has(key)) {
      duplicateGroups.set(key, []);
    }
    duplicateGroups.get(key).push(metric);
  }
  let deletedCount = 0;
  for (const [key, group] of duplicateGroups) {
    if (group.length > 1) {
      group.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
      const toDelete = group.slice(1);
      for (const duplicate of toDelete) {
        await supabase.from("metrics").delete().eq("id", duplicate.id);
        deletedCount++;
      }
    }
  }
  console.log(`🗑️ Removed ${deletedCount} duplicate records`);
}
async function fixCryptoHoldings(supabase, userId) {
  console.log("₿ Fixing crypto holdings...");
  await supabase.from("metrics").delete().eq("user_id", userId).eq("type", "crypto_value");
  const cryptoHoldings = [
    { symbol: "USDC", network: "Base", price: 0.99, quantity: 62.192612, value: 62.18, change: -0 },
    { symbol: "TRX", network: "Tron", price: 0.24, quantity: 117.897828, value: 28.75, change: 1.47 },
    { symbol: "SOL", network: "Polygon", price: 140.26, quantity: 0.100972, value: 14.16, change: 4.82 },
    { symbol: "ETH", network: "Base", price: 1612.83, quantity: 3516e-6, value: 5.67, change: 1.66 },
    { symbol: "WBTC", network: "Arbitrum", price: 85151.2, quantity: 56e-6, value: 4.84, change: 0.92 },
    { symbol: "WBTC", network: "Polygon", price: 85151.2, quantity: 51e-6, value: 4.39, change: 0.92 },
    { symbol: "OM", network: "Polygon", price: 0.6, quantity: 6.558798, value: 3.96, change: -5.1 },
    { symbol: "POL", network: "Polygon", price: 0.19, quantity: 17.032759, value: 3.25, change: 0.35 },
    { symbol: "USDC", network: "Polygon", price: 0.99, quantity: 1.796504, value: 1.79, change: -0 },
    { symbol: "AIDOGE", network: "Arbitrum", price: 0, quantity: 2076581912772156e-6, value: 0.25, change: 2.34 },
    { symbol: "ETH", network: "Arbitrum", price: 1612.83, quantity: 34e-6, value: 0.05, change: 1.66 }
  ];
  const cryptoMetrics = cryptoHoldings.map((holding) => ({
    user_id: userId,
    type: "crypto_value",
    value: holding.value,
    unit: "USD",
    metadata: {
      symbol: holding.symbol,
      network: holding.network,
      quantity: holding.quantity,
      price: holding.price,
      change: holding.change
    },
    recorded_at: (/* @__PURE__ */ new Date()).toISOString()
  }));
  const { error } = await supabase.from("metrics").insert(cryptoMetrics);
  if (error) {
    console.error("❌ Error inserting crypto:", error);
  } else {
    const totalValue = cryptoHoldings.reduce((sum, h) => sum + h.value, 0);
    console.log(`✅ Added ${cryptoHoldings.length} crypto holdings, total value: $${totalValue.toFixed(2)}`);
  }
}
async function addSampleExpenses(supabase, userId) {
  console.log("💰 Adding sample categorized expenses...");
  const sampleExpenses = [
    // Pet Care (your biggest category)
    { date: "2025-05-17", description: "Pet Poop Bags 299, Bread 53, Total", amount: 550, source: "Zepto", category: "Pet Care", subcategory: "Hygiene" },
    { date: "2025-05-16", description: "Royal Canin Wet Food (24) + Cat treats", amount: 2855, source: "Supertails", category: "Pet Care", subcategory: "Food" },
    { date: "2025-05-10", description: "Royal Canin dry food 2kg", amount: 1800, source: "Supertails", category: "Pet Care", subcategory: "Food" },
    // Food & Grocery - MK Retail (optimization target)
    { date: "2025-05-15", description: "MK Retail grocery shopping", amount: 3053, source: "MK Retail", category: "Food & Grocery", subcategory: "MK Retail" },
    { date: "2025-05-12", description: "MK Retail snacks and energy drinks", amount: 850, source: "MK Retail", category: "Food & Grocery", subcategory: "MK Retail" },
    // Zepto
    { date: "2025-05-16", description: "chupa chups, mountain dew, milk", amount: 320, source: "Zepto", category: "Food & Grocery", subcategory: "Snacks & Beverages" },
    { date: "2025-05-14", description: "Bread, eggs, vegetables", amount: 280, source: "Zepto", category: "Food & Grocery", subcategory: "Staples" },
    // Swiggy Instamart
    { date: "2025-05-13", description: "Instamart vegetables and fruits", amount: 750, source: "Swiggy Instamart", category: "Food & Grocery", subcategory: "Fresh Produce" },
    { date: "2025-05-11", description: "Instamart daily essentials", amount: 920, source: "Swiggy Instamart", category: "Food & Grocery", subcategory: "General" },
    // Food Delivery
    { date: "2025-05-12", description: "Swiggy dinner order", amount: 450, source: "Swiggy", category: "Food Delivery", subcategory: "Meals" },
    { date: "2025-05-09", description: "Zomato lunch", amount: 380, source: "Zomato", category: "Food Delivery", subcategory: "Meals" },
    // Fixed expenses
    { date: "2025-05-01", description: "Rent payment to shettyarjun29", amount: 10872, source: "UPI", category: "Housing", subcategory: "Rent" },
    { date: "2025-05-07", description: "Bupropion XL medicine", amount: 1218, source: "Apollo", category: "Healthcare", subcategory: "Medicine" },
    { date: "2025-05-05", description: "Yulu rides for the month", amount: 266, source: "Yulu", category: "Transportation", subcategory: "Rides" },
    // Subscriptions
    { date: "2025-05-03", description: "Spotify Premium subscription", amount: 119, source: "Spotify", category: "Subscriptions", subcategory: "Entertainment" },
    { date: "2025-05-03", description: "Google One storage", amount: 130, source: "Google", category: "Subscriptions", subcategory: "Productivity" },
    // UPI Transfers
    { date: "2025-05-20", description: "Transfer to pot", amount: 5e3, source: "Jupiter", category: "Savings/Investment", subcategory: "Pot Transfer" },
    { date: "2025-05-18", description: "UPI to friend", amount: 1500, source: "UPI", category: "UPI Transfer", subcategory: "General" }
  ];
  const expenseMetrics = sampleExpenses.map((expense) => ({
    user_id: userId,
    type: "expense",
    value: expense.amount,
    unit: "INR",
    metadata: {
      description: expense.description,
      category: expense.category,
      subcategory: expense.subcategory,
      source: expense.source,
      vendor: extractVendor(expense.description, expense.source)
    },
    recorded_at: new Date(expense.date).toISOString()
  }));
  const { error } = await supabase.from("metrics").insert(expenseMetrics);
  if (error) {
    console.error("❌ Error inserting expenses:", error);
  } else {
    const totalAmount = sampleExpenses.reduce((sum, e) => sum + e.amount, 0);
    console.log(`✅ Added ${sampleExpenses.length} categorized expenses, total: ₹${totalAmount.toLocaleString()}`);
  }
}
async function generateSummary(supabase, userId) {
  const { data: metrics } = await supabase.from("metrics").select("*").eq("user_id", userId);
  if (!metrics) return {};
  const expenses = metrics.filter((m) => m.type === "expense");
  const crypto = metrics.filter((m) => m.type === "crypto_value");
  const totalExpenses = expenses.reduce((sum, e) => sum + e.value, 0);
  const totalCrypto = crypto.reduce((sum, c) => sum + c.value, 0);
  const categoryMap = /* @__PURE__ */ new Map();
  for (const expense of expenses) {
    const category = expense.metadata?.category || "Other";
    categoryMap.set(category, (categoryMap.get(category) || 0) + expense.value);
  }
  const topCategories = Array.from(categoryMap.entries()).sort(([, a], [, b]) => b - a).slice(0, 5).map(([category, amount]) => ({ category, amount }));
  return {
    totalExpenses,
    totalCrypto,
    totalRecords: metrics.length,
    expenseCount: expenses.length,
    cryptoCount: crypto.length,
    categoriesCount: categoryMap.size,
    topCategories
  };
}
function createDeduplicationKey(metric) {
  const date = metric.recorded_at.split("T")[0];
  const description = (metric.metadata?.description || "").substring(0, 30);
  const amount = metric.value;
  const source = metric.metadata?.source || "unknown";
  return `${date}-${description}-${amount}-${source}`;
}
function extractVendor(description, source) {
  const desc = description.toLowerCase();
  const src = source.toLowerCase();
  if (src.includes("zepto") || desc.includes("zepto")) return "Zepto";
  if (src.includes("swiggy")) return "Swiggy";
  if (src.includes("blinkit") || desc.includes("blinkit")) return "Blinkit";
  if (src.includes("supertails") || desc.includes("supertails")) return "Supertails";
  if (src.includes("mk retail") || desc.includes("mk retail")) return "MK Retail";
  if (src.includes("yulu") || desc.includes("yulu")) return "Yulu";
  if (src.includes("spotify") || desc.includes("spotify")) return "Spotify";
  if (src.includes("apollo") || desc.includes("apollo")) return "Apollo";
  if (src.includes("zomato") || desc.includes("zomato")) return "Zomato";
  return source || "Unknown";
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
