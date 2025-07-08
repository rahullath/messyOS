import { c as createComponent, r as renderComponent, g as renderScript, b as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BxgriC_5.mjs';
import 'kleur/colors';
import { $ as $$Layout } from '../chunks/Layout_Th6w4dL8.mjs';
export { renderers } from '../renderers.mjs';

const $$Login = createComponent(async ($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Login - MeshOS" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="min-h-screen flex items-center justify-center bg-background"> <div class="card w-full max-w-md"> <div class="text-center mb-8"> <div class="w-12 h-12 bg-accent-primary rounded-lg flex items-center justify-center mx-auto mb-4"> <span class="text-xl font-bold text-white">M</span> </div> <h1 class="text-3xl font-semibold text-text-primary mb-2">
Welcome to MeshOS
</h1> <p class="text-text-secondary">Your personal life operating system</p> </div> <div class="space-y-4"> <button id="google-signin" class="w-full flex items-center justify-center px-4 py-3 bg-accent-primary/10 hover:bg-accent-primary/20 border border-accent-primary/20 text-accent-primary rounded-lg transition-colors"> <svg class="w-5 h-5 mr-3" viewBox="0 0 24 24"> <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path> <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path> <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path> <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path> </svg>
Continue with Google
</button> <div id="status" class="text-center text-sm text-text-muted"></div> </div> </div> </div> ` })} ${renderScript($$result, "C:/Users/rahul/meshos-v3/src/pages/login.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/rahul/meshos-v3/src/pages/login.astro", void 0);

const $$file = "C:/Users/rahul/meshos-v3/src/pages/login.astro";
const $$url = "/login";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Login,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
