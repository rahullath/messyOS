import { c as createComponent, f as renderHead, g as renderScript, b as renderTemplate } from '../../chunks/astro/server_BxgriC_5.mjs';
import 'kleur/colors';
import 'clsx';
export { renderers } from '../../renderers.mjs';

const $$Exchange = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`<html> <head><title>Completing Login...</title>${renderHead()}</head> <body> <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: system-ui;"> <div style="text-align: center;"> <div style="margin-bottom: 20px;">🔄</div> <p>Completing your login...</p> </div> </div> ${renderScript($$result, "C:/Users/rahul/meshos-v3/src/pages/auth/exchange.astro?astro&type=script&index=0&lang.ts")} </body> </html>`;
}, "C:/Users/rahul/meshos-v3/src/pages/auth/exchange.astro", void 0);

const $$file = "C:/Users/rahul/meshos-v3/src/pages/auth/exchange.astro";
const $$url = "/auth/exchange";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Exchange,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
