// src/pages/api/import/health.ts
import type { APIRoute } from 'astro';
import { importHealthData } from '../../../lib/health/healthImporter';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ request, cookies }) => {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
  try {
    
    const formData = await request.formData();
    const userId = formData.get('userId') as string;
    const sleepFile = formData.get('sleep') as File;
    const heartRateFile = formData.get('heartRate') as File;
    const stressFile = formData.get('stress') as File;
    const stepsFile = formData.get('steps') as File | null; // Optional
    
    if (!userId || !sleepFile || !heartRateFile || !stressFile) {
      return new Response(JSON.stringify({ 
        error: 'Missing required files or user ID',
        required: ['userId', 'sleep', 'heartRate', 'stress'],
        optional: ['steps']
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Read file contents
    const files: any = {
      sleep: await sleepFile.text(),
      heartRate: await heartRateFile.text(),
      stress: await stressFile.text(),
    };
    
    // Add steps if provided
    if (stepsFile) {
      files.steps = await stepsFile.text();
    }
    
    // Validate file formats (updated for real format)
    if (!files.sleep.includes('h') || !files.sleep.includes('min')) {
      return new Response(JSON.stringify({ 
        error: 'Invalid sleep file format. Expected format: "6 h 30 min (08/06)"' 
      }), { status: 400 });
    }
    
    if (!files.heartRate.includes('bpm')) {
      return new Response(JSON.stringify({ 
        error: 'Invalid heart rate file format. Expected format: "June 8: 55-130 bpm"' 
      }), { status: 400 });
    }
    
    if (!files.stress.includes('AVG')) {
      return new Response(JSON.stringify({ 
        error: 'Invalid stress file format. Expected format: "AVG 27 Low - 08/06"' 
      }), { status: 400 });
    }
    
    const result = await importHealthData(files, userId, cookies);
    
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
    console.error('Health import API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Health import failed', 
      details: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
