// src/pages/api/ai/life-optimization.ts
import type { APIRoute } from 'astro';
import { AgenticLifeOptimizer } from '../../../lib/intelligence/agentic-life-optimizer';
import { createServerClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), { status: 401 });
    }

    const { type = 'full' } = await request.json();
    const optimizer = new AgenticLifeOptimizer(cookies);

    let result;
    
    if (type === 'daily') {
      // Quick daily check-in
      result = await optimizer.dailyCheckIn(user.id);
    } else {
      // Full life optimization analysis
      result = await optimizer.optimizeLife(user.id);
    }

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      type,
      ...result
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Life optimization API error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'AI analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), { status: 401 });
    }

    const type = url.searchParams.get('type') || 'daily';
    const optimizer = new AgenticLifeOptimizer(cookies);

    let result;
    
    if (type === 'daily') {
      result = await optimizer.dailyCheckIn(user.id);
    } else {
      result = await optimizer.optimizeLife(user.id);
    }

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      type,
      ...result
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Life optimization API error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'AI analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};