// API endpoint for Birmingham weather forecasts
import type { APIRoute } from 'astro';
import { UKLocationService, BIRMINGHAM_LOCATIONS } from '../../../../lib/uk-student/location-service';
import type { Location } from '../../../../types/uk-student';

export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = new URL(url).searchParams;
    const locationParam = searchParams.get('location');
    const daysParam = searchParams.get('days');

    // Validate required parameters
    if (!locationParam) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameter: location' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse days parameter
    const days = daysParam ? parseInt(daysParam, 10) : 7;
    if (isNaN(days) || days < 1 || days > 14) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid days parameter. Must be between 1 and 14' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get location from Birmingham database
    const location = BIRMINGHAM_LOCATIONS[locationParam.toLowerCase().replace(/\s+/g, '-')];
    if (!location) {
      return new Response(
        JSON.stringify({ 
          error: `Unknown location: ${locationParam}. Available locations: ${Object.keys(BIRMINGHAM_LOCATIONS).join(', ')}` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize location service
    const config = {
      googleMapsApiKey: import.meta.env.GOOGLE_MAPS_API_KEY,
      weatherApiKey: import.meta.env.OPENWEATHER_API_KEY,
      defaultLocation: { latitude: 52.4508, longitude: -1.9305 },
      cacheDuration: 60
    };

    const locationService = new UKLocationService(config);

    // Get weather forecast
    const weather = await locationService.getWeatherForecast(location, days);

    const response = {
      success: true,
      data: {
        location,
        days,
        forecast: weather,
        cached: false // Could be enhanced to show if data came from cache
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
    console.error('Weather forecast error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error getting weather forecast',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { location, days = 7 } = body;

    // Validate required parameters
    if (!location) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameter: location' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let targetLocation: Location;

    // Handle location parameter (string or Location object)
    if (typeof location === 'string') {
      targetLocation = BIRMINGHAM_LOCATIONS[location.toLowerCase().replace(/\s+/g, '-')];
      if (!targetLocation) {
        return new Response(
          JSON.stringify({ 
            error: `Unknown location: ${location}` 
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      targetLocation = location as Location;
    }

    // Validate days parameter
    if (typeof days !== 'number' || days < 1 || days > 14) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid days parameter. Must be a number between 1 and 14' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize location service
    const config = {
      googleMapsApiKey: import.meta.env.GOOGLE_MAPS_API_KEY,
      weatherApiKey: import.meta.env.OPENWEATHER_API_KEY,
      defaultLocation: { latitude: 52.4508, longitude: -1.9305 },
      cacheDuration: 60
    };

    const locationService = new UKLocationService(config);

    // Get weather forecast
    const weather = await locationService.getWeatherForecast(targetLocation, days);

    const response = {
      success: true,
      data: {
        location: targetLocation,
        days,
        forecast: weather
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
    console.error('Weather POST error:', error);
    
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