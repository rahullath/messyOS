export { renderers } from '../../../renderers.mjs';

const POST = async ({ request, cookies }) => {
  try {
    const response = await fetch("http://localhost:4321/api/content/import/serializd", {
      method: "POST",
      headers: {
        // Forward cookies to maintain session/authentication
        "Cookie": request.headers.get("Cookie") || ""
      },
      body: await request.formData()
      // Forward the form data directly
    });
    return response;
  } catch (error) {
    console.error("❌ Content import proxy error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Content import proxy failed"
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
