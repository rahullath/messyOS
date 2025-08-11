import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    
    const { message, context } = await request.json();

    // Get user's recent data for context
    const [habitsRes, tasksRes, healthRes] = await Promise.all([
      serverAuth.supabase.from('habits').select('name, streak_count').eq('user_id', user.id).limit(5),
      serverAuth.supabase.from('tasks').select('title, status').eq('user_id', user.id).limit(5),
      serverAuth.supabase.from('metrics').select('type, value').eq('user_id', user.id).eq('category', 'Health').limit(5)
    ]);

    const contextData = {
      habits: habitsRes.data || [],
      tasks: tasksRes.data || [],
      health: healthRes.data || [],
      user_context: 'Birmingham University student, cat owner, moving to UK, developer building streaming platform'
    };

    // Simple AI response (replace with actual AI call)
    let response = '';
    
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('habit')) {
      const vapingHabit = contextData.habits.find(h => h.name.toLowerCase().includes('vap'));
      if (vapingHabit) {
        response = `Your vaping streak is ${vapingHabit.streak_count} days! ${vapingHabit.streak_count > 7 ? 'Excellent progress! ' : 'Keep pushing - you\'re building a great foundation. '}Focus on your other habits to maintain momentum.`;
      } else {
        response = 'I see you\'re tracking habits well. Remember: consistency beats perfection. Even small daily actions compound over time.';
      }
    } else if (lowerMessage.includes('uk') || lowerMessage.includes('birmingham')) {
      response = 'For UK prep: 1) Finalize cat documentation, 2) Set up banking (NatWest+Monzo), 3) Book IKEA delivery for arrival, 4) Prepare for culture adjustment. Birmingham has a large Indian community, so you\'ll find familiar food and support.';
    } else if (lowerMessage.includes('health')) {
      response = 'Your health tracking is key for UK transition. Focus on: consistent sleep (8+ hours), protein intake (150g+ for your bulk), and stress management. The move will disrupt routines, so strong habits now = easier adaptation later.';
    } else if (lowerMessage.includes('task') || lowerMessage.includes('focus')) {
      response = 'Based on your timeline: Priority 1: UK logistics (visa, banking, housing). Priority 2: Health habits (gym, nutrition). Priority 3: Coding projects. Batch similar tasks and use your high-energy morning hours for important work.';
    } else {
      response = 'I\'m here to help optimize your life for the UK move. Ask me about habits, health, tasks, or specific challenges you\'re facing with the transition.';
    }

    return new Response(JSON.stringify({ response }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 