import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: profileRow } = await serverAuth.supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const displayName =
      profileRow?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'User';

    return new Response(JSON.stringify({
      success: true,
      data: {
        email: user.email,
        display_name: displayName,
      },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Failed to load profile' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json().catch(() => ({}));
    const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';

    if (!displayName || displayName.length < 2 || displayName.length > 60) {
      return new Response(JSON.stringify({ success: false, error: 'Display name must be 2-60 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await serverAuth.supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        full_name: displayName,
      },
    });

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { error: profileUpdateError } = await serverAuth.supabase
      .from('profiles')
      .update({ full_name: displayName })
      .eq('id', user.id);

    if (profileUpdateError) {
      console.warn('Profile table update failed while syncing display name:', profileUpdateError.message);
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        display_name: displayName,
      },
      message: 'Display name updated',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error?.message || 'Failed to update profile' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
