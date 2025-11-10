// src/pages/api/import/enhanced-loop-habits.ts
import type { APIRoute } from 'astro';
import { EnhancedLoopHabitsImporter } from '../../../lib/import/enhanced-loop-habits';
import type { ImportProgress, ConflictResolution } from '../../../lib/import/enhanced-loop-habits';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ request, cookies }) => {
  const serverAuth = createServerAuth(cookies);
  
  try {
    const user = await serverAuth.requireAuth();
    
    const formData = await request.formData();
    const habitsFile = formData.get('habits') as File;
    const checkmarksFile = formData.get('checkmarks') as File;
    const scoresFile = formData.get('scores') as File;
    const conflictResolutionsStr = formData.get('conflictResolutions') as string;
    
    if (!habitsFile || !checkmarksFile || !scoresFile) {
      return new Response(JSON.stringify({ 
        type: 'error',
        message: 'Missing required CSV files' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Parse conflict resolutions if provided
    let conflictResolutions: ConflictResolution[] | undefined;
    if (conflictResolutionsStr) {
      try {
        conflictResolutions = JSON.parse(conflictResolutionsStr);
      } catch (error) {
        console.warn('Failed to parse conflict resolutions:', error);
      }
    }
    
    // Read CSV files
    const csvFiles = {
      habits: await habitsFile.text(),
      checkmarks: await checkmarksFile.text(),
      scores: await scoresFile.text(),
    };
    
    // Create a readable stream for progress updates
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        // Progress callback function
        const progressCallback = (progress: ImportProgress) => {
          const progressData = JSON.stringify({
            type: 'progress',
            progress
          }) + '\n';
          controller.enqueue(encoder.encode(progressData));
        };
        
        // Create importer with progress callback
        const importer = new EnhancedLoopHabitsImporter(
          cookies, 
          user.id, 
          progressCallback
        );
        
        // Start import process
        importer.importWithEnhancedHandling(csvFiles, conflictResolutions)
          .then(summary => {
            // Check if we have conflicts that need resolution
            if (summary.conflicts.length > 0 && !conflictResolutions) {
              const conflictsData = JSON.stringify({
                type: 'conflicts',
                conflicts: summary.conflicts
              }) + '\n';
              controller.enqueue(encoder.encode(conflictsData));
            } else {
              // Send final summary
              const completeData = JSON.stringify({
                type: 'complete',
                summary
              }) + '\n';
              controller.enqueue(encoder.encode(completeData));
            }
            controller.close();
          })
          .catch(error => {
            console.error('Import error:', error);
            const errorData = JSON.stringify({
              type: 'error',
              message: error.message || 'Import failed'
            }) + '\n';
            controller.enqueue(encoder.encode(errorData));
            controller.close();
          });
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error: any) {
    // Handle auth errors
    if (error.message === 'Authentication required') {
      return new Response(JSON.stringify({
        type: 'error',
        message: 'Please sign in to continue'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      type: 'error',
      message: 'Import failed',
      details: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};