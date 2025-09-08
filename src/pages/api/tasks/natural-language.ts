// API endpoint for natural language task creation
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import { createServerClient } from '../../../lib/supabase/server';
import { naturalLanguageTaskService } from '../../../lib/intelligence/natural-language-task-service';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Check authentication
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const body = await request.json();
    const { input, mode = 'simple', config = {} } = body;

    if (!input || typeof input !== 'string') {
      return new Response(JSON.stringify({ error: 'Input text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`🤖 Natural language task creation request from ${user.email}`);
    console.log(`Mode: ${mode}, Input length: ${input.length}`);

    // Create server-side supabase client with user session
    const supabase = createServerClient(cookies);

    let result;

    switch (mode) {
      case 'simple':
        // Just parse, don't save
        result = await naturalLanguageTaskService.createTasksFromText(input, user.id, config);
        break;

      case 'create':
        // Parse and save tasks
        const fullResult = await naturalLanguageTaskService.parseAndSaveTasks(input, user.id, config, supabase);
        result = {
          ...fullResult.parseResult,
          savedTasks: fullResult.savedTasks,
          saveErrors: fullResult.errors
        };
        break;

      case 'email':
        // Process email content
        const { subject, body, sender, date } = body;
        result = await naturalLanguageTaskService.createTasksFromEmail({
          subject: subject || 'No subject',
          body: body || input,
          sender: sender || 'Unknown',
          date: date || new Date().toISOString()
        }, user.id);
        break;

      case 'conversation':
        // Process conversation
        const { messages } = body;
        result = await naturalLanguageTaskService.createTasksFromConversation({
          messages: messages || [{ role: 'user', content: input, timestamp: new Date().toISOString() }]
        }, user.id);
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid mode' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    console.log(`✅ Natural language processing completed: ${result.tasks.length} tasks`);

    return new Response(JSON.stringify({
      success: true,
      result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Natural language task creation error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    // Check authentication
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const searchParams = url.searchParams;
    const action = searchParams.get('action');

    switch (action) {
      case 'patterns':
        // Get user's task creation patterns
        const patterns = await naturalLanguageTaskService.analyzeCreationPatterns(user.id);
        return new Response(JSON.stringify({ success: true, patterns }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      case 'suggestions':
        // Get task suggestions
        const context = {
          timeOfDay: searchParams.get('timeOfDay') as any,
          energyLevel: searchParams.get('energyLevel') as any,
          availableTime: searchParams.get('availableTime') ? parseInt(searchParams.get('availableTime')!) : undefined,
          preferredCategory: searchParams.get('preferredCategory') || undefined
        };
        
        const suggestions = await naturalLanguageTaskService.suggestTasks(user.id, context);
        return new Response(JSON.stringify({ success: true, suggestions: suggestions.suggestions }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('❌ Natural language task API error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};