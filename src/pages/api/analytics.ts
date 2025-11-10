// src/pages/api/analytics.ts - Analytics data collection endpoint
import type { APIRoute } from 'astro';

interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId?: string;
  timestamp: number;
  properties?: Record<string, any>;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const events: AnalyticsEvent[] = await request.json();
    
    if (!Array.isArray(events)) {
      return new Response(JSON.stringify({ error: 'Invalid data format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate and sanitize events
    const validEvents = events.filter(event => 
      event.event && 
      event.category && 
      event.action && 
      event.timestamp &&
      typeof event.timestamp === 'number'
    ).map(event => ({
      ...event,
      // Ensure userId is consistently handled (null instead of undefined)
      userId: event.userId || null,
      // Add context about authentication state
      isAuthenticated: !!event.userId,
      // Sanitize properties to prevent logging sensitive data
      properties: event.properties ? {
        ...event.properties,
        // Remove potentially sensitive data
        email: event.properties.email ? '[redacted]' : undefined,
        password: undefined,
        token: undefined
      } : undefined
    }));

    if (validEvents.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid events found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // In a real application, you would:
    // 1. Store events in your analytics database (e.g., ClickHouse, BigQuery)
    // 2. Send to third-party analytics services (e.g., Mixpanel, Amplitude)
    // 3. Process events for real-time dashboards
    
    // For now, we'll log them and store in a simple format
    console.log(`Analytics: Received ${validEvents.length} events`);
    
    // Group events by type for better logging
    const eventsByType = validEvents.reduce((acc, event) => {
      const key = `${event.category}:${event.action}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    }, {} as Record<string, AnalyticsEvent[]>);

    // Log summary with context about authentication
    Object.entries(eventsByType).forEach(([type, events]) => {
      const authenticatedCount = events.filter(e => e.userId).length;
      const publicCount = events.length - authenticatedCount;
      console.log(`  ${type}: ${events.length} events (${authenticatedCount} auth, ${publicCount} public)`);
    });

    // Store critical events (in a real app, this would go to a database)
    const criticalEvents = validEvents.filter(event => 
      event.category === 'conversion' || 
      event.category === 'error' ||
      event.action === 'auth_success' ||
      event.action === 'auth_error'
    );

    if (criticalEvents.length > 0) {
      console.log('Critical events detected:', criticalEvents.map(e => ({
        type: `${e.category}:${e.action}`,
        userId: e.userId || 'anonymous',
        isAuthenticated: !!e.userId,
        timestamp: new Date(e.timestamp).toISOString()
      })));
    }

    // Simulate processing delay for realistic behavior
    await new Promise(resolve => setTimeout(resolve, 10));

    return new Response(JSON.stringify({ 
      success: true, 
      processed: validEvents.length,
      timestamp: Date.now()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Handle OPTIONS for CORS
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
};