// API endpoint for Birmingham route calculations
import type { APIRoute } from 'astro';
import { UKLocationService, BIRMINGHAM_LOCATIONS } from '../../../../lib/uk-student/location-service';
import type { Location } from '../../../../types/uk-student';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { from, to, method = 'bike', preferences = {} } = body;

    // Validate required parameters
    if (!from || !to) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters: from and to locations' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate method
    if (!['bike', 'walk', 'train'].includes(method)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid method. Must be bike, walk, or train' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get locations from Birmingham database or use provided coordinates
    let fromLocation: Location;
    let toLocation: Location;

    if (typeof from === 'string') {
      fromLocation = BIRMINGHAM_LOCATIONS[from.toLowerCase().replace(/\s+/g, '-')];
      if (!fromLocation) {
        return new Response(
          JSON.stringify({ 
            error: `Unknown from location: ${from}` 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      fromLocation = from as Location;
    }

    if (typeof to === 'string') {
      toLocation = BIRMINGHAM_LOCATIONS[to.toLowerCase().replace(/\s+/g, '-')];
      if (!toLocation) {
        return new Response(
          JSON.stringify({ 
            error: `Unknown to location: ${to}` 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      toLocation = to as Location;
    }

    // Initialize location service
    const config = {
      googleMapsApiKey: import.meta.env.GOOGLE_MAPS_API_KEY,
      weatherApiKey: import.meta.env.OPENWEATHER_API_KEY,
      defaultLocation: { latitude: 52.4508, longitude: -1.9305 },
      cacheDuration: 60
    };

    const locationService = new UKLocationService(config);

    // Calculate route
    const route = await locationService.getBirminghamRoute(fromLocation, toLocation, method);

    // Add travel time adjustments if conditions provided
    let adjustedDuration = route.duration;
    if (preferences.conditions) {
      adjustedDuration = locationService.calculateTravelTime(route, preferences.conditions);
    }

    const response = {
      success: true,
      data: {
        ...route,
        adjustedDuration,
        from: fromLocation,
        to: toLocation,
        method
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        } 
      }
    );

  } catch (error) {
    console.error('Route calculation error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error calculating route',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = new URL(url).searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const method = searchParams.get('method') || 'bike';

    if (!from || !to) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required query parameters: from and to' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Use POST handler logic
    const mockRequest = {
      json: () => Promise.resolve({ from, to, method })
    };

    return await POST({ request: mockRequest as any } as any);

  } catch (error) {
    console.error('Route GET error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};