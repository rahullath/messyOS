import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { DEFAULT_GATE_CONDITIONS } from '../../../lib/chains/exit-gate';

type GateCondition = {
  id: string;
  name: string;
  satisfied: boolean;
};

function normalizeGateConditions(rawConditions: unknown): GateCondition[] {
  if (!Array.isArray(rawConditions)) {
    return DEFAULT_GATE_CONDITIONS.map((condition) => ({ ...condition }));
  }

  const parsed = rawConditions
    .map((value) => {
      if (!value || typeof value !== 'object') return null;
      const record = value as Record<string, unknown>;
      const id = typeof record.id === 'string' ? record.id : null;
      if (!id) return null;

      const fallbackName = DEFAULT_GATE_CONDITIONS.find((condition) => condition.id === id)?.name || id;

      return {
        id,
        name: typeof record.name === 'string' ? record.name : fallbackName,
        satisfied: Boolean(record.satisfied),
      } as GateCondition;
    })
    .filter((condition): condition is GateCondition => Boolean(condition));

  const map = new Map<string, GateCondition>();
  for (const defaultCondition of DEFAULT_GATE_CONDITIONS) {
    map.set(defaultCondition.id, { ...defaultCondition });
  }
  for (const condition of parsed) {
    map.set(condition.id, condition);
  }

  return Array.from(map.values());
}

function getTemplateFromPreferences(preferences: unknown): GateCondition[] {
  const record = (preferences && typeof preferences === 'object')
    ? (preferences as Record<string, unknown>)
    : {};
  const template = (record.exit_gate_template && typeof record.exit_gate_template === 'object')
    ? (record.exit_gate_template as Record<string, unknown>)
    : {};

  return normalizeGateConditions(template.gate_conditions);
}

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const gateConditions = getTemplateFromPreferences(data?.preferences);

    return new Response(JSON.stringify({ gate_conditions: gateConditions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching exit gate template:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch exit gate template',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json().catch(() => null);
    const gateConditions = normalizeGateConditions(body?.gate_conditions);

    const { data: existing, error: existingError } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    const existingPreferences =
      existing?.preferences && typeof existing.preferences === 'object'
        ? (existing.preferences as Record<string, unknown>)
        : {};

    const nextPreferences = {
      ...existingPreferences,
      exit_gate_template: {
        gate_conditions: gateConditions,
        updated_at: new Date().toISOString(),
      },
    };

    const { error: upsertError } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: user.id,
          preferences: nextPreferences as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      throw upsertError;
    }

    return new Response(JSON.stringify({ gate_conditions: gateConditions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating exit gate template:', error);
    return new Response(JSON.stringify({
      error: 'Failed to update exit gate template',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
