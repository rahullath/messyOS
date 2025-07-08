export { renderers } from '../../renderers.mjs';

const GET = async ({ cookies }) => {
  const allCookies = {};
  const possibleNames = [
    "sb-mdhtpjpwwbuepsytgrva-auth-token",
    "sb-mdhtpjpwwbuepsytgrva-auth-token.0",
    "sb-mdhtpjpwwbuepsytgrva-auth-token.1",
    "supabase-auth-token",
    "supabase.auth.token"
  ];
  for (const name of possibleNames) {
    const cookie = cookies.get(name);
    if (cookie) {
      allCookies[name] = cookie.value;
    }
  }
  return new Response(JSON.stringify({
    cookies: allCookies,
    cookieCount: Object.keys(allCookies).length,
    message: Object.keys(allCookies).length === 0 ? "No auth cookies found" : "Found auth cookies"
  }), {
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
