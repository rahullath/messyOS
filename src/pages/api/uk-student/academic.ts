// UK Student Academic API
// Handles assignment management, study sessions, and academic progress tracking

import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import { createServerClient } from '../../../lib/supabase/server';
import { AcademicService } from '../../../lib/uk-student/academic-service';
import type { 
  CreateAssignmentRequest, 
  UpdateAssignmentRequest,
  CreateStudySessionRequest,
  AssignmentBreakdownRequest
} from '../../../types/uk-student-academic';

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const supabase = createServerClient(cookies);

    switch (action) {
      case 'assignments': {
        const status = url.searchParams.get('status') || undefined;
        const course_code = url.searchParams.get('course_code') || undefined;
        const deadline_before = url.searchParams.get('deadline_before') || undefined;
        const deadline_after = url.searchParams.get('deadline_after') || undefined;

        const assignments = await AcademicService.getAssignments(
          user.id,
          { status, course_code, deadline_before, deadline_after },
          supabase
        );

        return new Response(JSON.stringify({ success: true, assignments }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'assignment': {
        const assignmentId = url.searchParams.get('id');
        if (!assignmentId) {
          return new Response(JSON.stringify({ error: 'Assignment ID required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const assignment = await AcademicService.getAssignment(user.id, assignmentId, supabase);
        if (!assignment) {
          return new Response(JSON.stringify({ error: 'Assignment not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ success: true, assignment }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'study-sessions': {
        const assignment_id = url.searchParams.get('assignment_id') || undefined;
        const course_code = url.searchParams.get('course_code') || undefined;
        const date_from = url.searchParams.get('date_from') || undefined;
        const date_to = url.searchParams.get('date_to') || undefined;

        const sessions = await AcademicService.getStudySessions(
          user.id,
          { assignment_id, course_code, date_from, date_to },
          supabase
        );

        return new Response(JSON.stringify({ success: true, sessions }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'dashboard': {
        const dashboardData = await AcademicService.getAcademicDashboard(user.id, supabase);

        return new Response(JSON.stringify({ success: true, data: dashboardData }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Academic API GET error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { action } = body;
    const supabase = createServerClient(cookies);

    switch (action) {
      case 'create-assignment': {
        const assignmentData: CreateAssignmentRequest = body.assignment;
        
        if (!assignmentData.title || !assignmentData.course_code || !assignmentData.deadline) {
          return new Response(JSON.stringify({ 
            error: 'Missing required fields: title, course_code, deadline' 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const assignment = await AcademicService.createAssignment(user.id, assignmentData, supabase);

        return new Response(JSON.stringify({ success: true, assignment }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'breakdown_assignment': {
        const breakdownRequest: AssignmentBreakdownRequest = body;
        
        if (!breakdownRequest.assignment_id) {
          return new Response(JSON.stringify({ error: 'Assignment ID required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const breakdown = await AcademicService.breakdownAssignment(user.id, breakdownRequest, supabase);

        return new Response(JSON.stringify({ success: true, data: breakdown }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'create-study-session': {
        const sessionData: CreateStudySessionRequest = body.session;
        
        if (!sessionData.title || !sessionData.session_type || !sessionData.planned_duration) {
          return new Response(JSON.stringify({ 
            error: 'Missing required fields: title, session_type, planned_duration' 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const session = await AcademicService.createStudySession(user.id, sessionData, supabase);

        return new Response(JSON.stringify({ success: true, session }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      case 'update-progress': {
        const { assignment_id, progress } = body;
        
        if (!assignment_id) {
          return new Response(JSON.stringify({ error: 'Assignment ID required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        await AcademicService.updateAssignmentProgress(user.id, assignment_id, progress, supabase);

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Academic API POST error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { assignment_id, updates } = body;
    const supabase = createServerClient(cookies);

    if (!assignment_id) {
      return new Response(JSON.stringify({ error: 'Assignment ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updatedAssignment = await AcademicService.updateAssignment(
      user.id, 
      assignment_id, 
      updates as UpdateAssignmentRequest, 
      supabase
    );

    return new Response(JSON.stringify({ success: true, assignment: updatedAssignment }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Academic API PUT error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};