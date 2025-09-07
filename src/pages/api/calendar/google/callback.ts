/**
 * Google Calendar OAuth Callback API
 * Handles OAuth callback and stores credentials
 */

import type { APIRoute } from 'astro';
import { googleCalendar } from 'lib/calendar/google-calendar';
import { calendarService } from 'lib/calendar/calendar-service';
import { createServerClient } from 'lib/supabase/server';

export const GET: APIRoute = async ({ request, url, redirect, cookies }) => {
  const supabase = createServerClient(cookies);
  try {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return redirect('/calendar?error=oauth_denied');
    }

    if (!code) {
      return redirect('/calendar?error=missing_code');
    }

    // Exchange code for tokens
    const tokens = await googleCalendar.exchangeCodeForTokens(code);

    // Parse state to get user info and source ID
    let userId: string;
    let sourceId: string;

    if (state) {
      try {
        const stateData = JSON.parse(decodeURIComponent(state));
        userId = stateData.userId;
        sourceId = stateData.sourceId;
      } catch {
        return redirect('/calendar?error=invalid_state');
      }
    } else {
      return redirect('/calendar?error=missing_state');
    }

    // Store credentials in the calendar source
    await calendarService.storeGoogleCredentials(sourceId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      calendar_id: 'primary'
    });

    // Trigger initial sync
    const sources = await calendarService.getCalendarSources(userId);
    const source = sources.find(s => s.id === sourceId);
    
    if (source) {
      try {
        await calendarService.syncCalendarSource(source);
      } catch (syncError) {
        console.error('Initial sync failed:', syncError);
        // Don't fail the whole flow if sync fails
      }
    }

    return redirect('/calendar?success=google_connected');
  } catch (error) {
    console.error('Error in Google Calendar callback:', error);
    return redirect('/calendar?error=callback_failed');
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createServerClient(cookies);
  try {
    const { code, state } = await request.json();

    if (!code) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Authorization code is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Exchange code for tokens
    const tokens = await googleCalendar.exchangeCodeForTokens(code);

    // Parse state to get user info and source ID
    let userId: string;
    let sourceId: string;

    if (state) {
      try {
        const stateData = JSON.parse(decodeURIComponent(state));
        userId = stateData.userId;
        sourceId = stateData.sourceId;
      } catch {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid state parameter' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'State parameter is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Store credentials
    await calendarService.storeGoogleCredentials(sourceId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      calendar_id: 'primary'
    });

    // Trigger initial sync
    const sources = await calendarService.getCalendarSources(userId);
    const source = sources.find(s => s.id === sourceId);
    
    if (source) {
      try {
        await calendarService.syncCalendarSource(source);
      } catch (syncError) {
        console.error('Initial sync failed:', syncError);
        // Don't fail the whole flow if sync fails
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      source_id: sourceId 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error processing Google Calendar authorization:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to process authorization',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
