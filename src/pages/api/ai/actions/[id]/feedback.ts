// src/pages/api/ai/actions/[id]/feedback.ts - AI Action Feedback API
// Allows users to provide feedback on AI actions

import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ params, request, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Not authenticated' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const actionId = params.id;
    if (!actionId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Action ID is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { feedback } = await request.json();
    
    if (!['approved', 'rejected', 'modified'].includes(feedback)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid feedback value' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify the action belongs to the user
    const { data: action, error: fetchError } = await serverAuth.supabase
      .from('ai_actions')
      .select('*')
      .eq('id', actionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !action) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Action not found or access denied' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update the feedback
    const { data: updatedAction, error: updateError } = await serverAuth.supabase
      .from('ai_actions')
      .update({ 
        user_feedback: feedback,
        updated_at: new Date().toISOString()
      })
      .eq('id', actionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating action feedback:', updateError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to update feedback' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Log feedback for AI improvement (optional analytics)
    const feedbackLog = {
      user_id: user.id,
      action_id: actionId,
      action_type: action.action_type,
      feedback,
      confidence: action.confidence,
      execution_success: action.executed && !action.result?.error,
      timestamp: new Date().toISOString()
    };

    // Store feedback analytics (create table if needed)
    try {
      await serverAuth.supabase
        .from('ai_feedback_analytics')
        .insert(feedbackLog);
    } catch (analyticsError) {
      // Non-critical error, log but don't fail the request
      console.log('Analytics logging failed (non-critical):', analyticsError);
    }

    console.log(`📊 AI Action feedback: ${feedback} for action ${actionId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      action: updatedAction,
      message: `Feedback "${feedback}" recorded successfully`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Action feedback API error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};