import { createServerClient } from '../../../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../../../renderers.mjs';

const POST = async ({ request, cookies }) => {
  const supabase = createServerClient(cookies);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const { medication, taken } = await request.json();
    if (!medication || typeof taken !== "boolean") {
      return new Response(JSON.stringify({
        error: "Invalid request. Required: medication (string), taken (boolean)"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const validMedications = ["bupropion_morning", "bupropion_afternoon", "melatonin_evening"];
    if (!validMedications.includes(medication)) {
      return new Response(JSON.stringify({
        error: `Invalid medication. Must be one of: ${validMedications.join(", ")}`
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const { data: existingEntry } = await supabase.from("metrics").select("id").eq("user_id", user.id).eq("type", `medication_${medication}`).gte("recorded_at", `${today}T00:00:00.000Z`).lt("recorded_at", `${today}T23:59:59.999Z`).single();
    if (existingEntry) {
      const { error: updateError } = await supabase.from("metrics").update({
        value: taken ? 1 : 0,
        metadata: {
          medication,
          adherence: taken,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      }).eq("id", existingEntry.id);
      if (updateError) throw updateError;
      return new Response(JSON.stringify({
        success: true,
        message: `${medication} updated: ${taken ? "taken" : "missed"}`,
        action: "updated"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    } else {
      const { error: insertError } = await supabase.from("metrics").insert({
        user_id: user.id,
        type: `medication_${medication}`,
        value: taken ? 1 : 0,
        unit: "taken",
        metadata: {
          medication,
          adherence: taken,
          loggedAt: (/* @__PURE__ */ new Date()).toISOString()
        },
        recorded_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (insertError) throw insertError;
      return new Response(JSON.stringify({
        success: true,
        message: `${medication} logged: ${taken ? "taken" : "missed"}`,
        action: "created"
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (error) {
    console.error("Medication logging error:", error);
    return new Response(JSON.stringify({
      error: "Failed to log medication",
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
