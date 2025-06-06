// src/pages/api/import/loop-habits.ts
import type { APIRoute } from 'astro';
import { importLoopHabitsData } from '../../../lib/import/loopHabits';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const userId = formData.get('userId') as string;
    const habitsFile = formData.get('habits') as File;
    const checkmarksFile = formData.get('checkmarks') as File;
    const scoresFile = formData.get('scores') as File;
    
    if (!userId || !habitsFile || !checkmarksFile || !scoresFile) {
      return new Response(JSON.stringify({ 
        error: 'Missing required files or user ID' 
      }), { status: 400 });
    }
    
    const csvFiles = {
      habits: await habitsFile.text(),
      checkmarks: await checkmarksFile.text(),
      scores: await scoresFile.text(),
    };
    
    const result = await importLoopHabitsData(csvFiles, userId);
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: 'Import failed', 
      details: error.message 
    }), { status: 500 });
  }
};
