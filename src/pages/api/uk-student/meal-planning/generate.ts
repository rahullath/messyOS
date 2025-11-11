// API endpoint for generating meal plans
import type { APIRoute } from 'astro';
import { MealPlanningService } from '../../../../lib/uk-student/meal-planning-service';
import type { MealConstraints } from '../../../../lib/uk-student/meal-planning-service';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { userId, constraints } = body as {
      userId: string;
      constraints: MealConstraints;
    };

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const mealPlanningService = new MealPlanningService(userId);
    const mealPlan = await mealPlanningService.generateWeeklyPlan(constraints);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: mealPlan 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error generating meal plan:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate meal plan',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};