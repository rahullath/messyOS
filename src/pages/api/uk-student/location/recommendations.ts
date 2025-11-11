// API endpoint for travel route recommendations
import type { APIRoute } from 'astro';
import { UKLocationService, BIRMINGHAM_LOCATIONS } from '../../../../lib/uk-student/location-service';
import type { Location } from '../../../../types/uk-student';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { from, to, preferences = {} } = body;

    // Validate required parameters
    if (!from || !to) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameters: from and to locations' 
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
            error: `Unknown from location: ${from}. Available locations: ${Object.keys(BIRMINGHAM_LOCATIONS).join(', ')}` 
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
            error: `Unknown to location: ${to}. Available locations: ${Object.keys(BIRMINGHAM_LOCATIONS).join(', ')}` 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      toLocation = to as Location;
    }

    // Validate preferences
    const validPreferences = {
      weatherSensitive: preferences.weatherSensitive === true,
      costSensitive: preferences.costSensitive === true,
      timeSensitive: preferences.timeSensitive === true
    };

    // Initialize location service
    const config = {
      googleMapsApiKey: import.meta.env.GOOGLE_MAPS_API_KEY,
      weatherApiKey: import.meta.env.OPENWEATHER_API_KEY,
      defaultLocation: { latitude: 52.4508, longitude: -1.9305 },
      cacheDuration: 60
    };

    const locationService = new UKLocationService(config);

    // Get route recommendations
    const routes = await locationService.getRouteRecommendations(
      fromLocation, 
      toLocation, 
      validPreferences
    );

    // Get current weather for context
    const weather = await locationService.getWeatherForecast(fromLocation, 1);
    const currentWeather = weather[0]?.conditions;

    // Add recommendation reasons
    const routesWithReasons = routes.map(route => {
      const reasons: string[] = [];
      
      if (route.preferred_method === 'train' && currentWeather?.condition === 'rainy') {
        reasons.push('Recommended due to rainy weather');
      }
      
      if (route.cost_pence === 0 && validPreferences.costSensitive) {
        reasons.push('Free option - good for budget');
      }
      
      if (route.duration_minutes <= 15 && validPreferences.timeSensitive) {
        reasons.push('Quick option - under 15 minutes');
      }
      
      if (route.preferred_method === 'bike' && currentWeather?.condition === 'sunny') {
        reasons.push('Great weather for cycling');
      }

      return {
        ...route,
        reasons,
        costFormatted: route.cost_pence > 0 ? `£${(route.cost_pence / 100).toFixed(2)}` : 'Free'
      };
    });

    const response = {
      success: true,
      data: {
        from: fromLocation,
        to: toLocation,
        preferences: validPreferences,
        currentWeather,
        routes: routesWithReasons,
        count: routesWithReasons.length
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=1800' // Cache for 30 minutes
        } 
      }
    );

  } catch (error) {
    console.error('Route recommendations error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error getting route recommendations',
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
    const weatherSensitive = searchParams.get('weatherSensitive') === 'true';
    const costSensitive = searchParams.get('costSensitive') === 'true';
    const timeSensitive = searchParams.get('timeSensitive') === 'true';

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
      json: () => Promise.resolve({ 
        from, 
        to, 
        preferences: { weatherSensitive, costSensitive, timeSensitive }
      })
    };

    return await POST({ request: mockRequest as any } as any);

  } catch (error) {
    console.error('Route recommendations GET error:', error);
    
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