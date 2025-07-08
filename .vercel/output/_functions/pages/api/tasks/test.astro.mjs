import { createServerClient } from '../../../chunks/server_CMU3AJFs.mjs';
export { renderers } from '../../../renderers.mjs';

const GET = async ({ cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({
        error: "Authentication required"
      }), { status: 401 });
    }
    const { data: tables, error: tablesError } = await supabase.from("information_schema.tables").select("table_name").eq("table_schema", "public").like("table_name", "%task%");
    const { data: columns, error: columnsError } = await supabase.from("information_schema.columns").select("column_name, data_type, is_nullable").eq("table_name", "tasks").eq("table_schema", "public");
    const { data: taskCount, error: countError } = await supabase.from("tasks").select("id", { count: "exact", head: true });
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      database: {
        taskTables: tables || [],
        tablesError: tablesError?.message,
        taskColumns: columns || [],
        columnsError: columnsError?.message,
        taskCount: taskCount || 0,
        countError: countError?.message
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: "Server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }), { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
