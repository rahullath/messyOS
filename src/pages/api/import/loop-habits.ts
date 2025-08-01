// src/pages/api/import/loop-habits.ts
import type { APIRoute } from 'astro';
import { importLoopHabitsData } from '../../../lib/import/loopHabits';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ request, cookies }) => {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
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
    
    const result = await importLoopHabitsData(csvFiles, userId, cookies);
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    // Handle auth errors
    if (error.message === 'Authentication required') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Please sign in to continue'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Import failed', 
      details: error.message 
    }), { status: 500 });
  }
};
