// API endpoint for nearby Birmingham stores
import type { APIRoute } from 'astro';
import { UKLocationService, BIRMINGHAM_LOCATIONS } from '../../../../lib/uk-student/location-service';
import type { Location } from '../../../../types/uk-student';

export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = new URL(url).searchParams;
    const locationParam = searchParams.get('location');
    const radiusParam = searchParams.get('radius');

    // Validate required parameters
    if (!locationParam) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required parameter: location' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse radius parameter
    const radius = radiusParam ? parseInt(radiusParam, 10) : 2000; // Default 2km
    if (isNaN(radius) || radius < 100 || radius > 10000) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid radius parameter. Must be between 100 and 10000 meters' 
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

    // Get nearby stores
    const stores = await locationService.getNearbyStores(location, radius);

    const response = {
      success: true,
      data: {
        location,
        radius,
        stores: stores.map(store => ({
          ...store,
          walkingTime: (store as any).walkingTime,
          cyclingTime: (store as any).cyclingTime
        })),
        count: stores.length
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=7200' // Cache for 2 hours (store data changes infrequently)
        } 
      }
    );

  } catch (error) {
    console.error('Nearby stores error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error getting nearby stores',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { location, radius = 2000, filters = {} } = body;

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

    // Validate radius parameter
    if (typeof radius !== 'number' || radius < 100 || radius > 10000) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid radius parameter. Must be a number between 100 and 10000 meters' 
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

    // Get nearby stores
    let stores = await locationService.getNearbyStores(targetLocation, radius);

    // Apply filters if provided
    if (filters.priceLevel) {
      stores = stores.filter(store => store.price_level === filters.priceLevel);
    }

    if (filters.minRating) {
      stores = stores.filter(store => (store.user_rating || 0) >= filters.minRating);
    }

    if (filters.maxWalkingTime) {
      stores = stores.filter(store => ((store as any).walkingTime || 999) <= filters.maxWalkingTime);
    }

    if (filters.storeTypes && Array.isArray(filters.storeTypes)) {
      stores = stores.filter(store => 
        filters.storeTypes.some((type: string) => 
          store.name.toLowerCase().includes(type.toLowerCase())
        )
      );
    }

    const response = {
      success: true,
      data: {
        location: targetLocation,
        radius,
        filters,
        stores: stores.map(store => ({
          ...store,
          walkingTime: (store as any).walkingTime,
          cyclingTime: (store as any).cyclingTime
        })),
        count: stores.length
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=7200' // Cache for 2 hours
        } 
      }
    );

  } catch (error) {
    console.error('Stores POST error:', error);
    
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