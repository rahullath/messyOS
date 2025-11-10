import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import type { 
  Goal, 
  CreateGoalRequest, 
  GoalsResponse,
  ValidationResult,
  ValidationError 
} from '../../../types/task-management';

// Validation functions
function validateCreateGoalRequest(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required and must be a non-empty string' });
  }

  if (data.title && data.title.length > 255) {
    errors.push({ field: 'title', message: 'Title must be 255 characters or less' });
  }

  if (!data.category || !['career', 'health', 'creative', 'financial', 'social', 'personal'].includes(data.category)) {
    errors.push({ 
      field: 'category', 
      message: 'Category is required and must be one of: career, health, creative, financial, social, personal' 
    });
  }

  if (data.measurable_outcomes && !Array.isArray(data.measurable_outcomes)) {
    errors.push({ field: 'measurable_outcomes', message: 'Measurable outcomes must be an array' });
  }

  if (data.measurable_outcomes && Array.isArray(data.measurable_outcomes)) {
    if (!data.measurable_outcomes.every(outcome => typeof outcome === 'string')) {
      errors.push({ field: 'measurable_outcomes', message: 'All measurable outcomes must be strings' });
    }
  }

  if (data.target_date && isNaN(Date.parse(data.target_date))) {
    errors.push({ field: 'target_date', message: 'Target date must be a valid ISO date string' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// GET /api/goals - List goals with filtering
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('goals')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('category', category);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: goals, error, count } = await query;

    if (error) {
      console.error('Error fetching goals:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch goals' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response: GoalsResponse = {
      goals: goals || [],
      total: count || 0
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/goals:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST /api/goals - Create a new goal
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const validation = validateCreateGoalRequest(body);

    if (!validation.isValid) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: validation.errors 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const goalData: CreateGoalRequest = {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      category: body.category,
      timeframe: body.timeframe?.trim() || null,
      measurable_outcomes: body.measurable_outcomes || null,
      success_metrics: body.success_metrics || null,
      target_date: body.target_date || null,
      created_from: body.created_from || 'manual'
    };

    const { data: goal, error } = await supabase
      .from('goals')
      .insert({
        ...goalData,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating goal:', error);
      return new Response(JSON.stringify({ error: 'Failed to create goal' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ goal }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/goals:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};