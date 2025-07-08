import { createServerClient } from '../../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../../renderers.mjs';

function getServerUser(cookies) {
  const supabaseUrl = "https://mdhtpjpwwbuepsytgrva.supabase.co";
  const projectRef = supabaseUrl.split(".")[0].split("//")[1];
  const authCookieNames = [
    `sb-${projectRef}-auth-token`,
    `sb-${projectRef}-auth-token.0`,
    `sb-${projectRef}-auth-token.1`
  ];
  for (const cookieName of authCookieNames) {
    const cookie = cookies.get(cookieName);
    if (cookie) {
      try {
        const cookieData = JSON.parse(cookie.value);
        if (cookieData.user?.email === "ketaminedevs@gmail.com") {
          return {
            id: "368deac7-8526-45eb-927a-6a373c95d8c6",
            // Your known user ID
            email: "ketaminedevs@gmail.com"
          };
        }
      } catch (e) {
        continue;
      }
    }
  }
  return null;
}
function requireAuth(cookies) {
  const user = getServerUser(cookies);
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

const GET = async ({ url, cookies }) => {
  try {
    const user = requireAuth(cookies);
    console.log("✅ User authenticated:", user.email);
    const supabase = createServerClient(cookies);
    const searchParams = url.searchParams;
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    let query = supabase.from("metrics").select("*").eq("user_id", user.id).eq("type", "content").order("recorded_at", { ascending: false });
    if (type) {
      query = query.eq("metadata->>content_type", type);
    }
    query = query.range(offset, offset + limit - 1);
    const { data: content, error } = await query;
    if (error) {
      console.error("Database error:", error);
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to fetch content data"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
    const { count, error: countError } = await supabase.from("metrics").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("type", "content");
    return new Response(JSON.stringify({
      success: true,
      content: content || [],
      total: count || 0,
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    if (error.message === "Authentication required") {
      return new Response(JSON.stringify({
        success: false,
        error: "Authentication required"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    console.error("Content API error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Failed to fetch content"
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
