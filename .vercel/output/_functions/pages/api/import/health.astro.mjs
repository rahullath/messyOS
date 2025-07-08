import { createServerClient } from '../../../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../../../renderers.mjs';

async function importHealthData(files, userId, cookies) {
  console.log("🏥 Starting health data import for user:", userId);
  const supabase = createServerClient(cookies);
  try {
    const sleepData = parseSleepDataReal(files.sleep);
    const heartRateData = parseHeartRateDataReal(files.heartRate);
    const stressData = parseStressDataReal(files.stress);
    const stepsData = files.steps ? parseStepsDataReal(files.steps) : [];
    console.log("📊 Parsed data:", {
      sleep: sleepData.length,
      heartRate: heartRateData.length,
      stress: stressData.length,
      steps: stepsData.length
    });
    await supabase.from("metrics").delete().eq("user_id", userId).in("type", [
      "sleep_duration",
      "sleep_quality",
      "heart_rate_avg",
      "heart_rate_min",
      "heart_rate_max",
      "stress_level",
      "steps_count"
    ]);
    const allMetrics = [
      // Sleep metrics
      ...sleepData.map((entry) => ({
        user_id: userId,
        type: "sleep_duration",
        value: entry.duration,
        unit: "minutes",
        metadata: {
          quality: entry.quality,
          hours: Math.round(entry.duration / 60 * 10) / 10
        },
        recorded_at: new Date(entry.date).toISOString()
      })),
      // Heart rate metrics
      ...heartRateData.flatMap((entry) => [
        {
          user_id: userId,
          type: "heart_rate_avg",
          value: entry.avgRate,
          unit: "bpm",
          metadata: { min: entry.minRate, max: entry.maxRate },
          recorded_at: new Date(entry.date).toISOString()
        },
        {
          user_id: userId,
          type: "heart_rate_min",
          value: entry.minRate,
          unit: "bpm",
          metadata: { avg: entry.avgRate, max: entry.maxRate },
          recorded_at: new Date(entry.date).toISOString()
        },
        {
          user_id: userId,
          type: "heart_rate_max",
          value: entry.maxRate,
          unit: "bpm",
          metadata: { avg: entry.avgRate, min: entry.minRate },
          recorded_at: new Date(entry.date).toISOString()
        }
      ]),
      // Stress metrics
      ...stressData.map((entry) => ({
        user_id: userId,
        type: "stress_level",
        value: entry.avgStress,
        unit: "points",
        metadata: {
          status: entry.status,
          maxStress: entry.maxStress || entry.avgStress
        },
        recorded_at: new Date(entry.date).toISOString()
      })),
      // Steps metrics
      ...stepsData.map((entry) => ({
        user_id: userId,
        type: "steps_count",
        value: entry.stepCount,
        unit: "steps",
        metadata: {
          target: entry.target,
          achievement: Math.round(entry.stepCount / entry.target * 100)
        },
        recorded_at: new Date(entry.date).toISOString()
      }))
    ];
    console.log(`📥 Inserting ${allMetrics.length} health metrics...`);
    const { error } = await supabase.from("metrics").insert(allMetrics);
    if (error) {
      throw new Error(`Database insert failed: ${error.message}`);
    }
    await calculateHealthInsights(userId, cookies);
    return {
      success: true,
      message: `Successfully imported ${sleepData.length} sleep, ${heartRateData.length} heart rate, ${stressData.length} stress, and ${stepsData.length} step entries`,
      imported: {
        sleep: sleepData.length,
        heartRate: heartRateData.length,
        stress: stressData.length,
        steps: stepsData.length
      }
    };
  } catch (error) {
    console.error("❌ Health import error:", error);
    return {
      success: false,
      message: `Health import failed: ${error.message}`,
      imported: { sleep: 0, heartRate: 0, stress: 0, steps: 0 }
    };
  }
}
function parseSleepDataReal(content) {
  const lines = content.split("\n");
  const data = [];
  let currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.includes("2025") || line.includes("2024")) {
      const yearMatch = line.match(/(\d{4})/);
      if (yearMatch) {
        currentYear = parseInt(yearMatch[1]);
      }
      continue;
    }
    const sleepMatch = line.match(/(\d+)\s*h\s*(\d+)\s*min\s*\((\d{2})\/(\d{2})\)/);
    if (sleepMatch) {
      const [, hours, minutes, day, month] = sleepMatch;
      const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
      const isoDate = `${currentYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      let quality;
      if (totalMinutes >= 480) quality = "excellent";
      else if (totalMinutes >= 420) quality = "good";
      else if (totalMinutes >= 360) quality = "fair";
      else quality = "poor";
      data.push({
        date: isoDate,
        duration: totalMinutes,
        quality
      });
    }
  }
  console.log("😴 Sleep data sample:", data.slice(0, 3));
  console.log("😴 Total sleep entries:", data.length);
  return data;
}
function parseHeartRateDataReal(content) {
  const lines = content.split("\n");
  const data = [];
  let currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  let currentMonth = "";
  for (const line of lines) {
    if (!line.trim()) continue;
    console.log("🔍 Processing HR line:", line);
    if (line.includes("2025") || line.includes("2024")) {
      const yearMatch = line.match(/(\d{4})/);
      if (yearMatch) {
        currentYear = parseInt(yearMatch[1]);
        console.log("📅 Found year:", currentYear);
      }
      continue;
    }
    const monthMatch = line.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s*\d{4}$/);
    if (monthMatch) {
      currentMonth = monthMatch[1];
      console.log("📅 Found month header:", currentMonth);
      continue;
    }
    const hrMatch = line.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{1,2}):\s*(\d+)-(\d+)\s*bpm/);
    if (hrMatch) {
      const [, month, day, minRate, maxRate] = hrMatch;
      console.log("💓 Found HR entry:", { month, day, minRate, maxRate });
      const monthNum = {
        "January": "01",
        "February": "02",
        "March": "03",
        "April": "04",
        "May": "05",
        "June": "06",
        "July": "07",
        "August": "08",
        "September": "09",
        "October": "10",
        "November": "11",
        "December": "12"
      }[month] || "01";
      const isoDate = `${currentYear}-${monthNum}-${day.padStart(2, "0")}`;
      const minRateNum = parseInt(minRate);
      const maxRateNum = parseInt(maxRate);
      const avgRate = Math.round((minRateNum + maxRateNum) / 2);
      data.push({
        date: isoDate,
        minRate: minRateNum,
        maxRate: maxRateNum,
        avgRate,
        restingRate: minRateNum
        // Assuming min is resting rate
      });
      console.log("✅ Added HR entry:", { date: isoDate, minRate: minRateNum, maxRate: maxRateNum, avgRate });
    } else {
      console.log("❌ HR line did not match pattern:", line);
    }
  }
  console.log("❤️ Heart rate sample:", data.slice(0, 3));
  console.log("❤️ Total heart rate entries:", data.length);
  return data;
}
function parseStressDataReal(content) {
  const lines = content.split("\n");
  const data = [];
  let currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.includes("2025") || line.includes("2024")) {
      const yearMatch = line.match(/(\d{4})/);
      if (yearMatch) {
        currentYear = parseInt(yearMatch[1]);
      }
      continue;
    }
    const stressMatch = line.match(/AVG\s*(\d+)\s*(Low|Normal|High)\s*-\s*(\d{2})\/(\d{2})/);
    if (stressMatch) {
      const [, avgStress, status, day, month] = stressMatch;
      const isoDate = `${currentYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      data.push({
        date: isoDate,
        avgStress: parseInt(avgStress),
        status: status.toLowerCase(),
        maxStress: parseInt(avgStress) + 10
        // Estimate max stress
      });
    }
  }
  console.log("😰 Stress data sample:", data.slice(0, 3));
  console.log("😰 Total stress entries:", data.length);
  return data;
}
function parseStepsDataReal(content) {
  const lines = content.split("\n");
  const data = [];
  let currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.includes("2025") || line.includes("2024")) {
      const yearMatch = line.match(/(\d{4})/);
      if (yearMatch) {
        currentYear = parseInt(yearMatch[1]);
      }
      continue;
    }
    const stepsMatch = line.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{1,2}):\s*([\d,]+)\s*steps/);
    if (stepsMatch) {
      const [, month, day, stepsStr] = stepsMatch;
      const monthNum = {
        "January": "01",
        "February": "02",
        "March": "03",
        "April": "04",
        "May": "05",
        "June": "06",
        "July": "07",
        "August": "08",
        "September": "09",
        "October": "10",
        "November": "11",
        "December": "12"
      }[month] || "01";
      const isoDate = `${currentYear}-${monthNum}-${day.padStart(2, "0")}`;
      const stepCount = parseInt(stepsStr.replace(/,/g, ""));
      data.push({
        date: isoDate,
        stepCount,
        target: 1e4
        // Standard step goal
      });
    }
  }
  console.log("🚶 Steps data sample:", data.slice(0, 3));
  console.log("🚶 Total step entries:", data.length);
  return data;
}
async function calculateHealthInsights(userId, cookies) {
  console.log("🧠 Calculating health insights...");
  const supabase = createServerClient(cookies);
  const { data: healthMetrics } = await supabase.from("metrics").select("type, value, recorded_at, metadata").eq("user_id", userId).in("type", ["sleep_duration", "heart_rate_avg", "stress_level", "steps_count"]).order("recorded_at", { ascending: false }).limit(90);
  if (!healthMetrics || healthMetrics.length === 0) return;
  const sleepData = healthMetrics.filter((m) => m.type === "sleep_duration");
  const heartRateData = healthMetrics.filter((m) => m.type === "heart_rate_avg");
  const stressData = healthMetrics.filter((m) => m.type === "stress_level");
  const stepsData = healthMetrics.filter((m) => m.type === "steps_count");
  console.log("📊 Health data counts:", {
    sleep: sleepData.length,
    heartRate: heartRateData.length,
    stress: stressData.length,
    steps: stepsData.length
  });
  const avgSleep = sleepData.length > 0 ? sleepData.reduce((sum, m) => sum + m.value, 0) / sleepData.length / 60 : 0;
  const avgHeartRate = heartRateData.length > 0 ? heartRateData.reduce((sum, m) => sum + m.value, 0) / heartRateData.length : 0;
  const avgStress = stressData.length > 0 ? stressData.reduce((sum, m) => sum + m.value, 0) / stressData.length : 0;
  const avgSteps = stepsData.length > 0 ? stepsData.reduce((sum, m) => sum + m.value, 0) / stepsData.length : 0;
  const insights = [
    {
      user_id: userId,
      type: "health_score",
      value: calculateHealthScore(avgSleep, avgHeartRate, avgStress, avgSteps),
      unit: "score",
      metadata: {
        avgSleep: Math.round(avgSleep * 10) / 10,
        avgHeartRate: Math.round(avgHeartRate),
        avgStress: Math.round(avgStress),
        avgSteps: Math.round(avgSteps),
        calculatedAt: (/* @__PURE__ */ new Date()).toISOString()
      },
      recorded_at: (/* @__PURE__ */ new Date()).toISOString()
    }
  ];
  await supabase.from("metrics").insert(insights);
  console.log("✅ Health insights calculated:", {
    avgSleep: Math.round(avgSleep * 10) / 10 + "h",
    avgHeartRate: Math.round(avgHeartRate) + "bpm",
    avgStress: Math.round(avgStress),
    avgSteps: Math.round(avgSteps),
    healthScore: calculateHealthScore(avgSleep, avgHeartRate, avgStress, avgSteps)
  });
}
function calculateHealthScore(avgSleep, avgHeartRate, avgStress, avgSteps) {
  const safeSleep = isNaN(avgSleep) ? 0 : avgSleep;
  const safeHeartRate = isNaN(avgHeartRate) ? 70 : avgHeartRate;
  const safeStress = isNaN(avgStress) ? 30 : avgStress;
  const safeSteps = isNaN(avgSteps) ? 0 : avgSteps;
  const sleepScore = Math.max(0, Math.min(30, (safeSleep - 4) * 7.5));
  const heartRateScore = avgHeartRate > 0 ? (() => {
    const idealHR = 70;
    const hrDiff = Math.abs(safeHeartRate - idealHR);
    return Math.max(0, 25 - hrDiff * 0.5);
  })() : 15;
  const stressScore = Math.max(0, 25 - safeStress * 0.5);
  const stepsScore = Math.max(0, Math.min(20, safeSteps / 500));
  const totalScore = sleepScore + heartRateScore + stressScore + stepsScore;
  console.log("🔢 Health score calculation:", {
    sleepScore: Math.round(sleepScore),
    heartRateScore: Math.round(heartRateScore),
    stressScore: Math.round(stressScore),
    stepsScore: Math.round(stepsScore),
    totalScore: Math.round(totalScore)
  });
  return Math.round(totalScore);
}

const POST = async ({ request, cookies }) => {
  try {
    const formData = await request.formData();
    const userId = formData.get("userId");
    const sleepFile = formData.get("sleep");
    const heartRateFile = formData.get("heartRate");
    const stressFile = formData.get("stress");
    const stepsFile = formData.get("steps");
    if (!userId || !sleepFile || !heartRateFile || !stressFile) {
      return new Response(JSON.stringify({
        error: "Missing required files or user ID",
        required: ["userId", "sleep", "heartRate", "stress"],
        optional: ["steps"]
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const files = {
      sleep: await sleepFile.text(),
      heartRate: await heartRateFile.text(),
      stress: await stressFile.text()
    };
    if (stepsFile) {
      files.steps = await stepsFile.text();
    }
    if (!files.sleep.includes("h") || !files.sleep.includes("min")) {
      return new Response(JSON.stringify({
        error: 'Invalid sleep file format. Expected format: "6 h 30 min (08/06)"'
      }), { status: 400 });
    }
    if (!files.heartRate.includes("bpm")) {
      return new Response(JSON.stringify({
        error: 'Invalid heart rate file format. Expected format: "June 8: 55-130 bpm"'
      }), { status: 400 });
    }
    if (!files.stress.includes("AVG")) {
      return new Response(JSON.stringify({
        error: 'Invalid stress file format. Expected format: "AVG 27 Low - 08/06"'
      }), { status: 400 });
    }
    const result = await importHealthData(files, userId, cookies);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Health import API error:", error);
    return new Response(JSON.stringify({
      error: "Health import failed",
      details: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
