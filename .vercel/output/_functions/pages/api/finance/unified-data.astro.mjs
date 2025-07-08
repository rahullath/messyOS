import { createServerClient } from '../../../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async ({ cookies }) => {
  const supabase = createServerClient(cookies);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const { data: metrics, error } = await supabase.from("metrics").select("*").eq("user_id", user.id).in("type", ["expense", "income", "crypto_value"]).order("recorded_at", { ascending: false });
    if (error) throw error;
    const transactions = [];
    const crypto = [];
    for (const metric of metrics || []) {
      if (metric.type === "crypto_value") {
        crypto.push({
          symbol: metric.metadata?.symbol || "Unknown",
          quantity: parseFloat(metric.metadata?.quantity || "0"),
          price: parseFloat(metric.metadata?.price || "0"),
          currentValue: parseFloat(metric.value || "0"),
          change: parseFloat(metric.metadata?.change || "0"),
          network: metric.metadata?.network || "Unknown"
        });
      } else if (["expense", "income"].includes(metric.type)) {
        transactions.push({
          id: metric.id,
          date: metric.recorded_at.split("T")[0],
          description: metric.metadata?.description || "Unknown",
          amount: metric.type === "expense" ? -parseFloat(metric.value) : parseFloat(metric.value),
          category: metric.metadata?.category || "Other",
          vendor: metric.metadata?.vendor || "Unknown",
          source: metric.metadata?.source || "manual"
        });
      }
    }
    const uniqueCrypto = crypto.reduce((acc, curr) => {
      const existing = acc.find((c) => c.symbol === curr.symbol && c.network === curr.network);
      if (!existing) {
        acc.push(curr);
      }
      return acc;
    }, []);
    const totalExpenses = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalIncome = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const cryptoValue = uniqueCrypto.reduce((sum, c) => sum + c.currentValue, 0);
    const thirtyDaysAgo = /* @__PURE__ */ new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyExpenses = transactions.filter((t) => t.amount < 0 && new Date(t.date) >= thirtyDaysAgo).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    console.log(`📊 Unified data: ${transactions.length} transactions, ${uniqueCrypto.length} crypto holdings, ${cryptoValue.toFixed(2)} crypto value`);
    return new Response(JSON.stringify({
      success: true,
      transactions: transactions.slice(0, 50),
      // Limit for performance
      crypto: uniqueCrypto,
      summary: {
        totalTransactions: transactions.length,
        totalExpenses,
        totalIncome,
        cryptoValue,
        monthlyExpenses,
        cryptoCount: uniqueCrypto.length
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("❌ Unified finance data error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
