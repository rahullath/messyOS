import { createServerClient as createServerClient$1 } from '@supabase/ssr';

function createServerClient(cookies) {
  return createServerClient$1(
    "https://mdhtpjpwwbuepsytgrva.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kaHRwanB3d2J1ZXBzeXRncnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMTQ0NTQsImV4cCI6MjA2Mzc5MDQ1NH0.T5eIZsKrpivj9Q4QniFhqOBGF_QU3f32wc0rcz4S-fA",
    {
      cookies: {
        get(name) {
          const cookie = cookies.get(name);
          return cookie?.value;
        },
        set(name, value, options) {
          cookies.set(name, value, {
            ...options,
            httpOnly: false,
            secure: false,
            sameSite: "lax",
            path: "/"
          });
        },
        remove(name, options) {
          cookies.delete(name, options);
        }
      }
    }
  );
}

export { createServerClient };
