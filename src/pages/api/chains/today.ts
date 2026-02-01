import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { anchorService } from '../../../lib/anchors/anchor-service';
import { chainGenerator } from '../../../lib/chains/chain-generator';
import { wakeRampGenerator } from '../../../lib/chains/wake-ramp';
import { LocationStateTracker } from '../../../lib/chains/location-state';
import type { ChainsResponse, ExecutionChain } from '../../../lib/chains/types';
import type { Anchor } from '../../../lib/anchors/types';
import type { Location } from '../../../types/uk-student-travel';

/**
 * GET /api/chains/today
 * 
 * Generate execution chains for today based on calendar anchors.
 * Returns chains, home intervals, and wake ramp independently of timeline.
 * 
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 * 
 * Query Parameters:
 * - date (optional): ISO date string (defaults to today)
 * - wakeTime (optional): ISO datetime string (defaults to 7:00 AM)
 * - sleepTime (optional): ISO datetime string (defaults to 11:00 PM)
 * - energy (optional): 'low' | 'medium' | 'high' (defaults to 'medium')
 * - currentLocation (optional): JSON string with location data
 */
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

    // Parse query parameters
    const url = new URL(request.url);
    const dateParam = url.searchParams.get('date');
    const wakeTimeParam = url.searchParams.get('wakeTime');
    const sleepTimeParam = url.searchParams.get('sleepTime');
    const energyParam = url.searchParams.get('energy') || 'medium';
    const currentLocationParam = url.searchParams.get('currentLocation');

    // Parse and validate date
    const date = dateParam ? new Date(dateParam) : new Date();
    if (isNaN(date.getTime())) {
      return new Response(JSON.stringify({ 
        error: 'Invalid date format',
        details: 'date must be a valid ISO date string'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse wake time (default to 7:00 AM on the given date)
    let wakeTime: Date;
    if (wakeTimeParam) {
      wakeTime = new Date(wakeTimeParam);
      if (isNaN(wakeTime.getTime())) {
        return new Response(JSON.stringify({ 
          error: 'Invalid wakeTime format',
          details: 'wakeTime must be a valid ISO datetime string'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      wakeTime = new Date(date);
      wakeTime.setHours(7, 0, 0, 0);
    }

    // Parse sleep time (default to 11:00 PM on the given date)
    let sleepTime: Date;
    if (sleepTimeParam) {
      sleepTime = new Date(sleepTimeParam);
      if (isNaN(sleepTime.getTime())) {
        return new Response(JSON.stringify({ 
          error: 'Invalid sleepTime format',
          details: 'sleepTime must be a valid ISO datetime string'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      sleepTime = new Date(date);
      sleepTime.setHours(23, 0, 0, 0);
    }

    // Validate energy state
    if (!['low', 'medium', 'high'].includes(energyParam)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid energy state',
        details: 'energy must be one of: low, medium, high'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse current location (default to Birmingham city center)
    let currentLocation: Location;
    if (currentLocationParam) {
      try {
        currentLocation = JSON.parse(currentLocationParam);
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: 'Invalid currentLocation format',
          details: 'currentLocation must be a valid JSON string'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      currentLocation = {
        name: 'Home',
        address: 'Birmingham, UK',
        coordinates: [52.4862, -1.8904],
        type: 'home',
      };
    }

    // Calculate planStart (max of wakeTime and now)
    const now = new Date();
    const planStart = wakeTime > now ? wakeTime : now;

    // Step 1: Get anchors from calendar
    // Requirements: 19.1 - Call Anchor Service to get anchors
    let anchors: Anchor[];
    try {
      anchors = await anchorService.getAnchorsForDate(date, user.id, supabase);
    } catch (error) {
      console.error('Calendar service failure:', error);
      // Requirements: 19.4 - Handle calendar service failure
      // Return empty anchors array and continue with basic plan
      anchors = [];
    }

    // Step 2: Generate wake ramp
    // Requirements: 19.3 - Return wake_ramp
    const wakeRamp = wakeRampGenerator.generateWakeRamp(
      planStart,
      wakeTime,
      energyParam as 'low' | 'medium' | 'high'
    );

    // Step 3: Generate chains from anchors
    // Requirements: 19.2 - Call Chain Generator to generate chains
    let chains: ExecutionChain[];
    try {
      chains = await chainGenerator.generateChainsForDate(anchors, {
        userId: user.id,
        date,
        config: {
          currentLocation,
          userEnergy: energyParam === 'low' ? 2 : energyParam === 'high' ? 4 : 3,
        }
      });
    } catch (error) {
      console.error('Chain generation failure:', error);
      // Requirements: 19.5 - Handle travel service failure
      // Continue with empty chains (graceful degradation)
      chains = [];
    }

    // Step 4: Calculate location periods and home intervals
    // Requirements: 19.3 - Return home_intervals
    const locationTracker = new LocationStateTracker();
    const locationPeriods = locationTracker.calculateLocationPeriods(
      chains,
      planStart,
      sleepTime
    );
    const homeIntervals = locationTracker.calculateHomeIntervals(locationPeriods);

    // Step 5: Build response
    // Requirements: 19.1, 19.2, 19.3 - Return ChainsResponse
    const response: ChainsResponse = {
      date: date.toISOString().split('T')[0],
      anchors,
      chains,
      home_intervals: homeIntervals,
      wake_ramp: wakeRamp.skipped ? undefined : wakeRamp,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating chains:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to generate chains',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
