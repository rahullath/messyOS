import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { createPlanBuilderService } from '../../../lib/daily-plan/plan-builder';
import {
  deleteDailyPlan,
  deleteExitTimesByPlan,
  deleteTimeBlocksByPlan,
  getDailyPlanByDateWithBlocks,
} from '../../../lib/daily-plan/database';
import type { PlanInput } from '../../../types/daily-plan';
import type { Location } from '../../../types/uk-student-travel';

/**
 * POST /api/daily-plan/generate
 * 
 * Generate a daily plan based on wake time, sleep time, and energy state
 * 
 * Requirements: 1.1, 1.2, 1.3, 8.4
 * 
 * Requirement 8.4: Accept wake time from form and use planStart = max(wakeTime, now)
 * The plan builder handles the planStart calculation internally.
 */
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

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.wakeTime || !body.sleepTime || !body.energyState) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields',
        details: 'wakeTime, sleepTime, and energyState are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate energy state
    if (!['low', 'medium', 'high'].includes(body.energyState)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid energy state',
        details: 'energyState must be one of: low, medium, high'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse dates
    const wakeTime = new Date(body.wakeTime);
    const sleepTime = new Date(body.sleepTime);
    const date = body.date ? new Date(body.date) : new Date();

    // Validate dates
    if (isNaN(wakeTime.getTime()) || isNaN(sleepTime.getTime())) {
      return new Response(JSON.stringify({ 
        error: 'Invalid date format',
        details: 'wakeTime and sleepTime must be valid ISO date strings'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (sleepTime <= wakeTime) {
      return new Response(JSON.stringify({ 
        error: 'Invalid time range',
        details: 'sleepTime must be after wakeTime'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Normalize date to day boundary for stable per-day uniqueness handling.
    date.setHours(0, 0, 0, 0);

    // Replace existing plan for the same user/day (idempotent regenerate behavior).
    const existingPlan = await getDailyPlanByDateWithBlocks(supabase, user.id, date);
    if (existingPlan) {
      await deleteExitTimesByPlan(supabase, existingPlan.id);
      await deleteTimeBlocksByPlan(supabase, existingPlan.id);
      await deleteDailyPlan(supabase, existingPlan.id);
    }

    // Optional manual anchor insertion (for no-calendar users and custom anchors).
    if (body.manualAnchor && typeof body.manualAnchor === 'object') {
      const manualAnchor = body.manualAnchor as Record<string, unknown>;
      const title = typeof manualAnchor.title === 'string' ? manualAnchor.title.trim() : '';
      const startTime = typeof manualAnchor.start_time === 'string' ? new Date(manualAnchor.start_time) : null;
      const endTime = typeof manualAnchor.end_time === 'string' ? new Date(manualAnchor.end_time) : null;

      if (title && startTime && endTime && !Number.isNaN(startTime.getTime()) && !Number.isNaN(endTime.getTime()) && endTime > startTime) {
        const anchorTypeRaw = typeof manualAnchor.anchor_type === 'string' ? manualAnchor.anchor_type : 'other';
        const allowedAnchorTypes = ['class', 'seminar', 'workshop', 'appointment', 'other'];
        const anchorType = allowedAnchorTypes.includes(anchorTypeRaw) ? anchorTypeRaw : 'other';

        const { error: manualAnchorError } = await supabase
          .from('manual_anchors')
          .insert({
            user_id: user.id,
            anchor_date: date.toISOString().split('T')[0],
            title,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            location: typeof manualAnchor.location === 'string' ? manualAnchor.location : null,
            anchor_type: anchorType,
            must_attend: manualAnchor.must_attend !== false,
            notes: typeof manualAnchor.notes === 'string' ? manualAnchor.notes : null,
          } as any);

        if (manualAnchorError) {
          throw manualAnchorError;
        }
      }
    }

    // Create plan input
    const planInput: PlanInput = {
      userId: user.id,
      date,
      wakeTime,
      sleepTime,
      energyState: body.energyState,
    };

    // Get current location (default to Birmingham city center if not provided)
    const parsedCurrentLocation = body.currentLocation as Partial<Location> | undefined;
    const hasCoordinates = Array.isArray(parsedCurrentLocation?.coordinates) &&
      parsedCurrentLocation.coordinates.length === 2 &&
      parsedCurrentLocation.coordinates.every((value) => typeof value === 'number' && Number.isFinite(value));

    const currentLocation: Location = hasCoordinates
      ? {
          name: parsedCurrentLocation?.name || 'Home',
          coordinates: parsedCurrentLocation!.coordinates as [number, number],
          type: parsedCurrentLocation?.type || 'home',
          address: parsedCurrentLocation?.address,
        }
      : {
          name: 'Home',
          address: 'Birmingham, UK',
          coordinates: [52.4862, -1.8904],
          type: 'home',
        };

    // Generate plan
    const planBuilderService = createPlanBuilderService(supabase);
    const plan = await planBuilderService.generateDailyPlan(planInput, currentLocation);

    return new Response(JSON.stringify({ plan }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating daily plan:', error);

    const errorCode = (error as any)?.code;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Duplicate insert race protection: return existing plan instead of failing.
    if (errorCode === '23505' || errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
      try {
        const supabase = createServerClient(cookies);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const fallbackDate = new Date();
          fallbackDate.setHours(0, 0, 0, 0);
          const existingPlan = await getDailyPlanByDateWithBlocks(supabase, user.id, fallbackDate);
          if (existingPlan) {
            return new Response(JSON.stringify({ plan: existingPlan }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        }
      } catch (lookupError) {
        console.error('Failed to fetch existing plan after duplicate error:', lookupError);
      }
    }

    return new Response(JSON.stringify({ 
      error: 'Failed to generate plan',
      details: errorMessage || 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
