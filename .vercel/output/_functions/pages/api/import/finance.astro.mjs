import { createServerClient } from '../../../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../../../renderers.mjs';

class CorrectedFinanceImporter {
  supabase;
  userId;
  constructor(cookies, userId) {
    this.supabase = createServerClient(cookies);
    this.userId = userId;
  }
  async importFinanceData(files) {
    console.log("🔄 Starting CORRECTED finance import...");
    let stats = {
      totalProcessed: 0,
      realExpenses: 0,
      internalTransfers: 0,
      duplicatesSkipped: 0,
      cryptoHoldings: 0,
      dateRange: ""
    };
    try {
      if (files.crypto) {
        await this.importCryptoHoldings(files.crypto, stats);
      }
      if (files.bank) {
        await this.importBankTransactions(files.bank, stats);
      }
      if (files.expenses) {
        await this.importManualExpenses(files.expenses, stats);
      }
      return {
        success: true,
        message: this.generateSuccessMessage(stats),
        stats
      };
    } catch (error) {
      console.error("❌ Import error:", error);
      return {
        success: false,
        message: `Import failed: ${error.message}`,
        stats
      };
    }
  }
  // 1. CRYPTO IMPORT - Replace existing data
  async importCryptoHoldings(cryptoText, stats) {
    console.log("₿ Processing crypto holdings...");
    await this.supabase.from("metrics").delete().eq("user_id", this.userId).eq("type", "crypto_value");
    const holdings = this.parseCryptoHoldings(cryptoText);
    if (holdings.length > 0) {
      const cryptoMetrics = holdings.map((holding) => ({
        user_id: this.userId,
        type: "crypto_value",
        value: holding.currentValue,
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
      const { error } = await this.supabase.from("metrics").insert(cryptoMetrics);
      if (error) throw error;
      stats.cryptoHoldings = holdings.length;
      const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
      console.log(`✅ Imported ${holdings.length} crypto holdings worth $${totalValue.toFixed(2)}`);
    }
  }
  // 2. BANK IMPORT - Append with duplicate prevention
  async importBankTransactions(bankText, stats) {
    console.log("🏦 Processing bank transactions...");
    const existingDates = await this.getExistingTransactionDates();
    const transactions = this.parseJupiterBankCSV(bankText, existingDates);
    if (transactions.realTransactions.length > 0) {
      const bankMetrics = transactions.realTransactions.map((tx) => ({
        user_id: this.userId,
        type: tx.amount > 0 ? "income" : "expense",
        value: Math.abs(tx.amount),
        unit: "INR",
        metadata: {
          description: tx.description,
          category: tx.category,
          vendor: tx.vendor,
          source: "bank",
          reference: tx.reference,
          balance: tx.balance
        },
        recorded_at: tx.date.toISOString()
      }));
      const { error } = await this.supabase.from("metrics").insert(bankMetrics);
      if (error) throw error;
      stats.totalProcessed = transactions.totalProcessed;
      stats.realExpenses = transactions.realTransactions.length;
      stats.internalTransfers = transactions.internalTransfers;
      stats.duplicatesSkipped = transactions.duplicatesSkipped;
      stats.dateRange = transactions.dateRange;
      console.log(`✅ Imported ${transactions.realTransactions.length} real transactions`);
      console.log(`🚫 Excluded ${transactions.internalTransfers} internal transfers`);
      console.log(`⏭️ Skipped ${transactions.duplicatesSkipped} duplicates`);
    }
  }
  // 3. MANUAL EXPENSES - Legacy support
  async importManualExpenses(expensesText, stats) {
    console.log("📝 Processing manual expenses (legacy)...");
    const expenses = this.parseManualExpenses(expensesText);
    if (expenses.length > 0) {
      const expenseMetrics = expenses.map((expense) => ({
        user_id: this.userId,
        type: "expense",
        value: expense.amount,
        unit: "INR",
        metadata: {
          description: expense.description,
          category: expense.category,
          source: expense.source,
          vendor: expense.vendor || "Manual"
        },
        recorded_at: expense.date.toISOString()
      }));
      const { error } = await this.supabase.from("metrics").insert(expenseMetrics);
      if (error) throw error;
      stats.realExpenses += expenses.length;
      console.log(`✅ Imported ${expenses.length} manual expenses`);
    }
  }
  // CRYPTO PARSER - Fixed version
  parseCryptoHoldings(textContent) {
    const lines = textContent.split("\n");
    const holdings = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const symbolMatch = line.match(/^\d+\.\s*(\w+)\s*\(([^)]+)\)/);
      if (symbolMatch) {
        const symbol = symbolMatch[1];
        const network = symbolMatch[2];
        let price = 0, change = 0, quantity = 0, value = 0;
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const dataLine = lines[j].trim();
          const priceMatch = dataLine.match(/Price:\s*\$?([\d,]+\.?\d*)\s*\|\s*Change:\s*([-+]?[\d.]+)%/);
          if (priceMatch) {
            price = parseFloat(priceMatch[1].replace(/,/g, ""));
            change = parseFloat(priceMatch[2]);
          }
          const quantityMatch = dataLine.match(/Quantity:\s*([\d,]+\.?\d*)\s*\|\s*Value:\s*\$?([\d,]+\.?\d*)/);
          if (quantityMatch) {
            quantity = parseFloat(quantityMatch[1].replace(/,/g, ""));
            value = parseFloat(quantityMatch[2].replace(/,/g, ""));
            break;
          }
        }
        if (price > 0 && quantity > 0 && value > 0) {
          holdings.push({
            symbol: symbol.toUpperCase(),
            network,
            price,
            quantity,
            currentValue: value,
            change
          });
        }
      }
    }
    return holdings;
  }
  // BANK PARSER - Enhanced with filtering and duplicate prevention
  parseJupiterBankCSV(csvContent, existingDates) {
    const lines = csvContent.split("\n");
    const realTransactions = [];
    let totalProcessed = 0;
    let internalTransfers = 0;
    let duplicatesSkipped = 0;
    const dates = [];
    let i = 2;
    while (i < lines.length) {
      const record = this.parseMultiLineCSVRecord(lines, i);
      if (!record.transaction) {
        i = record.nextIndex;
        continue;
      }
      totalProcessed++;
      const tx = record.transaction;
      i = record.nextIndex;
      const dateStr = tx.date.toISOString().split("T")[0];
      const duplicateKey = `${dateStr}-${tx.description.substring(0, 30)}-${Math.abs(tx.amount)}`;
      if (existingDates.has(duplicateKey)) {
        duplicatesSkipped++;
        continue;
      }
      if (this.isInternalTransfer(tx.description, tx.amount)) {
        internalTransfers++;
        continue;
      }
      realTransactions.push(tx);
      dates.push(dateStr);
    }
    const uniqueDates = [...new Set(dates)].sort();
    const dateRange = uniqueDates.length > 0 ? `${uniqueDates[0]} to ${uniqueDates[uniqueDates.length - 1]}` : "No dates";
    return {
      realTransactions,
      totalProcessed,
      internalTransfers,
      duplicatesSkipped,
      dateRange
    };
  }
  // MULTI-LINE CSV PARSER - Handles Jupiter's complex format
  parseMultiLineCSVRecord(lines, startIndex) {
    let currentRecord = "";
    let i = startIndex;
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) {
        i++;
        continue;
      }
      currentRecord += (currentRecord ? " " : "") + line;
      const quoteCount = (currentRecord.match(/"/g) || []).length;
      const isComplete = quoteCount % 2 === 0;
      i++;
      if (isComplete && currentRecord.includes(",")) {
        const transaction = this.parseJupiterTransaction(currentRecord);
        return { transaction, nextIndex: i };
      }
    }
    return { transaction: null, nextIndex: i };
  }
  // TRANSACTION PARSER - Enhanced
  parseJupiterTransaction(record) {
    try {
      const fields = this.parseCSVFields(record);
      if (fields.length < 8) return null;
      const [date, valueDate, particulars, tranType, chequeDetails, withdrawals, deposits, balance] = fields;
      if (!date || date.includes("*") || !particulars) return null;
      const withdrawalAmount = parseFloat(withdrawals?.replace(/,/g, "") || "0");
      const depositAmount = parseFloat(deposits?.replace(/,/g, "") || "0");
      const amount = depositAmount > 0 ? depositAmount : -withdrawalAmount;
      if (amount === 0) return null;
      const parsedDate = this.parseIndianDate(date);
      if (!parsedDate) return null;
      const cleanDescription = particulars.replace(/"/g, "").trim();
      return {
        date: parsedDate,
        description: cleanDescription,
        amount,
        balance: parseFloat(balance?.replace(/,/g, "") || "0"),
        type: tranType,
        reference: chequeDetails || "",
        category: this.categorizeTransaction(cleanDescription),
        vendor: this.extractVendor(cleanDescription)
      };
    } catch (error) {
      return null;
    }
  }
  // INTERNAL TRANSFER DETECTION - Critical for accurate expenses
  isInternalTransfer(description, amount) {
    const desc = description.toLowerCase();
    if (desc.includes("transfer to pot") || desc.includes("ifn/neosiexeddd")) {
      return true;
    }
    if (Math.abs(amount) > 2e4) {
      console.log(`🚫 Excluding large transfer: ₹${amount.toLocaleString()} - ${description.substring(0, 50)}...`);
      return true;
    }
    const internalPatterns = [
      "pot to main",
      "savings account",
      "internal fund transfer",
      "account transfer"
    ];
    for (const pattern of internalPatterns) {
      if (desc.includes(pattern)) return true;
    }
    return false;
  }
  // ENHANCED CATEGORIZATION
  categorizeTransaction(description) {
    const desc = description.toLowerCase();
    if (desc.includes("zepto") || desc.includes("blinkit") || desc.includes("swiggy instamart")) {
      return "Food & Grocery";
    }
    if (desc.includes("mkretailco") || desc.includes("mk retail")) {
      return "Food & Grocery";
    }
    if (desc.includes("swiggy") || desc.includes("zomato")) {
      return "Food Delivery";
    }
    if (desc.includes("supertails") || desc.includes("pawsome")) {
      return "Pet Care";
    }
    if (desc.includes("shettyarjun29") || desc.includes("rent")) {
      return "Housing";
    }
    if (desc.includes("yulu")) {
      return "Transportation";
    }
    if (desc.includes("spotify") || desc.includes("netflix") || desc.includes("myjio")) {
      return "Subscriptions";
    }
    if (desc.includes("apollo") || desc.includes("medicine")) {
      return "Healthcare";
    }
    if (desc.includes("upi")) {
      return "UPI Transfer";
    }
    return "Other";
  }
  // VENDOR EXTRACTION
  extractVendor(description) {
    const desc = description.toLowerCase();
    if (desc.includes("zepto")) return "Zepto";
    if (desc.includes("swiggy")) return "Swiggy";
    if (desc.includes("blinkit")) return "Blinkit";
    if (desc.includes("supertails")) return "Supertails";
    if (desc.includes("mkretailco")) return "MK Retail";
    if (desc.includes("yulu")) return "Yulu";
    if (desc.includes("spotify")) return "Spotify";
    if (desc.includes("zomato")) return "Zomato";
    if (desc.includes("myjio")) return "Jio";
    if (desc.includes("shettyarjun29")) return "Rent";
    return "Unknown";
  }
  // UTILITY METHODS
  async getExistingTransactionDates() {
    const { data } = await this.supabase.from("metrics").select("recorded_at, metadata").eq("user_id", this.userId).in("type", ["expense", "income"]);
    const existingKeys = /* @__PURE__ */ new Set();
    for (const metric of data || []) {
      const dateStr = metric.recorded_at.split("T")[0];
      const description = metric.metadata?.description || "";
      const duplicateKey = `${dateStr}-${description.substring(0, 30)}-*`;
      existingKeys.add(duplicateKey);
    }
    return existingKeys;
  }
  parseCSVFields(record) {
    const fields = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < record.length; i++) {
      const char = record[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  }
  parseIndianDate(dateStr) {
    if (!dateStr || dateStr.includes("*")) return null;
    try {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const year = parseInt(parts[2]);
        if (year >= 2020 && year <= 2030 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
          return new Date(year, month, day);
        }
      }
    } catch (error) {
      return null;
    }
    return null;
  }
  parseManualExpenses(textContent) {
    const expenses = [];
    const lines = textContent.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\s*-\s*(.+?)\s*-\s*(\d+)\s*total/i);
      if (match) {
        const [, day, month, description, amount] = match;
        const date = new Date(2025, parseInt(month) - 1, parseInt(day));
        expenses.push({
          date,
          description: description.trim(),
          amount: parseInt(amount),
          category: this.categorizeTransaction(description),
          source: "manual",
          vendor: this.extractVendor(description)
        });
      }
    }
    return expenses;
  }
  generateSuccessMessage(stats) {
    const parts = [];
    if (stats.cryptoHoldings > 0) {
      parts.push(`${stats.cryptoHoldings} crypto holdings`);
    }
    if (stats.realExpenses > 0) {
      parts.push(`${stats.realExpenses} transactions`);
    }
    if (stats.internalTransfers > 0) {
      parts.push(`excluded ${stats.internalTransfers} internal transfers`);
    }
    if (stats.duplicatesSkipped > 0) {
      parts.push(`skipped ${stats.duplicatesSkipped} duplicates`);
    }
    if (stats.dateRange) {
      parts.push(`covering ${stats.dateRange}`);
    }
    return `✅ Successfully imported: ${parts.join(", ")}`;
  }
}

const POST = async ({ request, cookies }) => {
  const supabase = createServerClient(cookies);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const formData = await request.formData();
    const bankFile = formData.get("bank");
    const cryptoFile = formData.get("crypto");
    const expensesFile = formData.get("expenses");
    console.log("📊 CORRECTED IMPORT - Files received:", {
      bank: !!bankFile,
      crypto: !!cryptoFile,
      expenses: !!expensesFile,
      bankSize: bankFile?.size || 0,
      cryptoSize: cryptoFile?.size || 0,
      expensesSize: expensesFile?.size || 0
    });
    const files = {};
    if (bankFile && bankFile.size > 0) {
      files.bank = await bankFile.text();
    }
    if (cryptoFile && cryptoFile.size > 0) {
      files.crypto = await cryptoFile.text();
    }
    if (expensesFile && expensesFile.size > 0) {
      files.expenses = await expensesFile.text();
    }
    const importer = new CorrectedFinanceImporter(cookies, user.id);
    const result = await importer.importFinanceData(files);
    console.log("📊 IMPORT RESULTS:", {
      success: result.success,
      stats: result.stats,
      message: result.message
    });
    return new Response(JSON.stringify({
      success: result.success,
      message: result.message,
      stats: result.stats,
      recommendations: generateImportRecommendations(result.stats)
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("❌ CORRECTED IMPORT ERROR:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      message: "Import failed - check console for details"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
function generateImportRecommendations(stats) {
  const recommendations = [];
  if (stats.internalTransfers > stats.realExpenses) {
    recommendations.push("✅ Good: Successfully filtered out internal transfers that would have inflated expenses");
  }
  if (stats.duplicatesSkipped > 0) {
    recommendations.push(`✅ Prevented ${stats.duplicatesSkipped} duplicate transactions from previous imports`);
  }
  if (stats.cryptoHoldings > 0) {
    recommendations.push(`✅ Updated crypto portfolio with ${stats.cryptoHoldings} holdings`);
  }
  if (stats.realExpenses > 100) {
    recommendations.push("⚠️ Large number of transactions imported - consider setting up automatic categorization rules");
  }
  if (stats.dateRange) {
    recommendations.push(`📅 Data covers: ${stats.dateRange}`);
  }
  return recommendations;
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
