import type { APIRoute } from 'astro';
import { TravelService } from '../../../lib/uk-student/travel-service';
import type { 
  TravelRoute, 
  Location, 
  WeatherData, 
  TravelPreferences,
  TravelConditions,
  TravelPlan 
} from '../../../types/uk-student-travel';

const travelService = new TravelService();

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const searchParams = url.searchParams;
    const action = searchParams.get('action');

    switch (action) {
      case 'plan': {
        const userId = searchParams.get('userId');
        const destinationsParam = searchParams.get('destinations');
        
        if (!userId || !destinationsParam) {
          return new Response(JSON.stringify({ 
            error: 'Missing required parameters: userId, destinations' 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const destinations: Location[] = JSON.parse(destinationsParam);
        
        // Mock preferences - in real implementation, fetch from user profile
        const preferences: TravelPreferences = {
          preferredMethod: 'mixed',
          maxWalkingDistance: 1500,
          weatherThreshold: {
            minTemperature: 0,
            maxWindSpeed: 25,
            maxPrecipitation: 5
          },
          fitnessLevel: 'medium',
          budgetConstraints: {
            dailyLimit: 500, // £5.00
            weeklyLimit: 2500 // £25.00
          },
          timePreferences: {
            bufferTime: 10,
            maxTravelTime: 45
          }
        };

        // Mock weather - in real implementation, fetch from weather API
        const weather: WeatherData = {
          temperature: 12,
          condition: 'cloudy',
          windSpeed: 15,
          humidity: 70,
          precipitation: 0,
          visibility: 10,
          timestamp: new Date(),
          forecast: false
        };

        const plan = await travelService.generateDailyTravelPlan(
          userId,
          destinations,
          preferences,
          weather
        );

        return new Response(JSON.stringify(plan), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'route': {
        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');
        const energyLevel = parseInt(searchParams.get('energyLevel') || '3');
        
        if (!fromParam || !toParam) {
          return new Response(JSON.stringify({ 
            error: 'Missing required parameters: from, to' 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const from: Location = JSON.parse(fromParam);
        const to: Location = JSON.parse(toParam);

        const conditions: TravelConditions = {
          weather: {
            temperature: 12,
            condition: 'cloudy',
            windSpeed: 15,
            humidity: 70,
            precipitation: 0,
            visibility: 10,
            timestamp: new Date(),
            forecast: false
          },
          userEnergy: energyLevel,
          timeConstraints: {
            departure: new Date(),
            arrival: new Date(Date.now() + 60 * 60 * 1000),
            flexibility: 15
          }
        };

        const preferences: TravelPreferences = {
          preferredMethod: 'mixed',
          maxWalkingDistance: 1500,
          weatherThreshold: {
            minTemperature: 0,
            maxWindSpeed: 25,
            maxPrecipitation: 5
          },
          fitnessLevel: 'medium',
          budgetConstraints: {
            dailyLimit: 500,
            weeklyLimit: 2500
          },
          timePreferences: {
            bufferTime: 10,
            maxTravelTime: 45
          }
        };

        const route = await travelService.getOptimalRoute(from, to, conditions, preferences);

        return new Response(JSON.stringify(route), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'alternatives': {
        const fromParam = searchParams.get('from');
        const toParam = searchParams.get('to');
        const disruptedMethod = searchParams.get('disruptedMethod') as 'bike' | 'train' | 'walk';
        
        if (!fromParam || !toParam || !disruptedMethod) {
          return new Response(JSON.stringify({ 
            error: 'Missing required parameters: from, to, disruptedMethod' 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const from: Location = JSON.parse(fromParam);
        const to: Location = JSON.parse(toParam);

        const conditions: TravelConditions = {
          weather: {
            temperature: 12,
            condition: 'cloudy',
            windSpeed: 15,
            humidity: 70,
            precipitation: 0,
            visibility: 10,
            timestamp: new Date(),
            forecast: false
          },
          userEnergy: 3,
          timeConstraints: {
            departure: new Date(),
            arrival: new Date(Date.now() + 60 * 60 * 1000),
            flexibility: 15
          }
        };

        const alternatives = await travelService.getAlternativeRoutes(
          from, 
          to, 
          disruptedMethod, 
          conditions
        );

        return new Response(JSON.stringify(alternatives), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'trains': {
        const from = searchParams.get('from');
        const to = searchParams.get('to');
        
        if (!from || !to) {
          return new Response(JSON.stringify({ 
            error: 'Missing required parameters: from, to' 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const trainServices = await travelService.getTrainServices(from, to);

        return new Response(JSON.stringify(trainServices), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ 
          error: 'Invalid action. Supported actions: plan, route, alternatives, trains' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Travel API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, userId, route, actualCost } = body;

    switch (action) {
      case 'track-expense': {
        if (!userId || !route) {
          return new Response(JSON.stringify({ 
            error: 'Missing required parameters: userId, route' 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        await travelService.trackTravelExpense(userId, route, actualCost);

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Travel expense tracked successfully'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ 
          error: 'Invalid action. Supported actions: track-expense' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Travel API POST error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};