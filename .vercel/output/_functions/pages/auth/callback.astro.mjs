import { c as createComponent, a as createAstro, m as maybeRenderHead, b as renderTemplate } from '../../chunks/astro/server_BxgriC_5.mjs';
import 'kleur/colors';
import 'clsx';
import { createServerClient } from '../../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../../renderers.mjs';

const $$Astro = createAstro();
const $$Callback = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Callback;
  createServerClient(Astro2.cookies);
  const code = Astro2.url.searchParams.get("code");
  if (!code) {
    console.error("No authorization code received");
    return Astro2.redirect("/login?error=no_code");
  }
  try {
    console.log("\u2705 Got auth code, redirecting to client for PKCE exchange");
    return Astro2.redirect(`/auth/exchange?code=${code}`);
  } catch (error) {
    console.error("Auth callback error:", error);
    return Astro2.redirect("/login?error=unexpected");
  }
  return renderTemplate`<html>${maybeRenderHead()}<body><p>Processing...</p></body></html>`;
}, "C:/Users/rahul/meshos-v3/src/pages/auth/callback.astro", void 0);

const $$file = "C:/Users/rahul/meshos-v3/src/pages/auth/callback.astro";
const $$url = "/auth/callback";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Callback,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
