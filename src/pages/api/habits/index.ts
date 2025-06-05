import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';

export const GET: APIRoute = async ({ request, locals }) => {
  const supabase = createServerClient(locals);
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const { data: habits, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify(habits), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = createServerClient(locals);
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const body = await request.json();
  
  const { data: habit, error } = await supabase
    .from('habits')
    .insert([{
      ...body,
      user_id: user.id
    }])
    .select()
    .single();
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response(JSON.stringify(habit), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
};
