// src/pages/api/nutrition/foods.ts - Foods Database API
// Search and get food nutrition data

import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const searchTerm = url.searchParams.get('search');
    const category = url.searchParams.get('category');
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let query = serverAuth.supabase
      .from('foods')
      .select('*');

    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }

    if (category) {
      query = query.eq('category', category);
    }

    query = query.limit(limit).order('name');

    const { data: foods, error } = await query;

    if (error) {
      console.error('❌ Foods query error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to fetch foods'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      foods: foods || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Foods API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch foods'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};