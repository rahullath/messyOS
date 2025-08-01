// src/pages/api/tasks/test.ts
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/multi-user';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    // Get authenticated user
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), { status: 401 });
    }

    // Test basic connection
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', '%task%');

    // Test tasks table structure
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'tasks')
      .eq('table_schema', 'public');

    // Test simple query
    const { data: taskCount, error: countError } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true });

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
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
};