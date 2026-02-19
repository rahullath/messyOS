import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { createPlanBuilderService } from '../../../lib/daily-plan/plan-builder';
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
    
    // Check for specific error types
    if (error instanceof Error) {
      // Check if it's a duplicate plan error
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return new Response(JSON.stringify({ 
          error: 'Plan already exists',
          details: 'A plan for this date already exists. Delete the existing plan first.'
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ 
      error: 'Failed to generate plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
