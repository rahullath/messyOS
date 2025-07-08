import { createServerClient } from '../../../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../../../renderers.mjs';

const POST = async ({ request, cookies }) => {
  try {
    const USER_ID = "368deac7-8526-45eb-927a-6a373c95d8c6";
    const body = await request.json();
    console.log("📝 Content add request:", body);
    const { title, content_type, status, rating, platform, genre, language, completed_at } = body;
    if (!title || !content_type) {
      return new Response(JSON.stringify({
        success: false,
        error: "Title and content type are required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const supabase = createServerClient(cookies);
    const { data, error } = await supabase.from("metrics").insert({
      user_id: USER_ID,
      type: "content",
      value: rating || 0,
      unit: "rating",
      metadata: {
        title,
        content_type,
        status: status || "completed",
        rating,
        platform,
        genre: genre || [],
        language: language || "English",
        completed_at: completed_at || (/* @__PURE__ */ new Date()).toISOString(),
        added_manually: true,
        imported_from: "manual_entry",
        imported_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      recorded_at: (/* @__PURE__ */ new Date()).toISOString()
    }).select();
    if (error) {
      console.error("❌ Database error:", error);
      return new Response(JSON.stringify({
        success: false,
        error: `Database error: ${error.message}`
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    console.log("✅ Content added successfully:", data[0]);
    return new Response(JSON.stringify({
      success: true,
      data: data[0],
      message: `Successfully added "${title}"`
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("❌ Add content error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Failed to add content"
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
