// API endpoint for recipe suggestions
import type { APIRoute } from 'astro';
import { MealPlanningService } from '../../../../../lib/uk-student/meal-planning-service';
import type { RecipeSearchOptions } from '../../../../../lib/uk-student/meal-planning-service';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { 
      userId, 
      ingredients = [], 
      maxCookingTime = 60, 
      options = {} 
    } = body as {
      userId: string;
      ingredients: string[];
      maxCookingTime: number;
      options: RecipeSearchOptions;
    };

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const mealPlanningService = new MealPlanningService(userId);
    const recipes = await mealPlanningService.suggestRecipes(
      ingredients,
      maxCookingTime,
      options
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: recipes 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error suggesting recipes:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to suggest recipes',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const searchParams = new URL(url).searchParams;
    const userId = searchParams.get('userId');
    const ingredients = searchParams.get('ingredients')?.split(',') || [];
    const maxCookingTime = parseInt(searchParams.get('maxCookingTime') || '60');
    const tags = searchParams.get('tags')?.split(',') || [];
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const mealPlanningService = new MealPlanningService(userId);
    const recipes = await mealPlanningService.suggestRecipes(
      ingredients,
      maxCookingTime,
      { tags, limit }
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: recipes 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error suggesting recipes:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to suggest recipes',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};