import { d as defineMiddleware, s as sequence } from './chunks/index_TVmmb5Le.mjs';
import { createServerClient } from './chunks/server_CMU3AJFs.mjs';
import 'es-module-lexer';
import './chunks/astro-designed-error-pages_CBBOl8t5.mjs';
import 'kleur/colors';
import './chunks/astro/server_BxgriC_5.mjs';
import 'clsx';
import 'cookie';

const onRequest$1 = defineMiddleware(async (context, next) => {
  const supabase = createServerClient(context.cookies);
  context.locals.supabase = supabase;
  const publicRoutes = ["/login", "/auth/callback", "/auth/exchange"];
  const isPublicRoute = publicRoutes.some(
    (route) => context.url.pathname === route
  );
  if (isPublicRoute || context.url.pathname.startsWith("/api/")) {
    return next();
  }
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log("🔍 Auth Check:", {
      path: context.url.pathname,
      hasUser: !!user,
      userEmail: user?.email,
      error: error?.message
    });
    context.locals.user = user;
    const protectedRoutes = ["/", "/dashboard", "/habits", "/health", "/finance", "/content", "/tasks", "/import"];
    const isProtectedRoute = protectedRoutes.some(
      (route) => context.url.pathname.startsWith(route)
    );
    if (isProtectedRoute && !user) {
      console.log("❌ No user found, redirecting to login");
      return context.redirect("/login");
    }
    return next();
  } catch (error) {
    console.error("❌ Auth middleware error:", error);
    return context.redirect("/login");
  }
});

const onRequest = sequence(
	
	onRequest$1
	
);

export { onRequest };
