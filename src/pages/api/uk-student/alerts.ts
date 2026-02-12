// UK Student Budget Alerts API Endpoint
// Handles budget alerts and notifications

import type { APIRoute } from 'astro';
import { ukFinanceService } from '../../../lib/uk-student/uk-finance-service';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = url.searchParams.get('userId');
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
    const alerts = await ukFinanceService.getBudgetAlerts(userId, unreadOnly);
    
    return new Response(JSON.stringify({ alerts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch alerts' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { alertId, action } = body;
    
    if (!alertId || !action) {
      return new Response(JSON.stringify({ error: 'Alert ID and action are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (action === 'read') {
      await ukFinanceService.markAlertAsRead(alertId);
    } else if (action === 'dismiss') {
      await ukFinanceService.dismissAlert(alertId);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid action. Use "read" or "dismiss"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating alert:', error);
    return new Response(JSON.stringify({ error: 'Failed to update alert' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};