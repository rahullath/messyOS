// src/pages/api/health/medication.ts
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
    
    const { medication, taken } = await request.json();
    
    if (!medication || typeof taken !== 'boolean') {
      return new Response(JSON.stringify({ 
        error: 'Invalid request. Required: medication (string), taken (boolean)' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate medication types
    const validMedications = ['bupropion_morning', 'bupropion_afternoon', 'melatonin_evening'];
    if (!validMedications.includes(medication)) {
      return new Response(JSON.stringify({ 
        error: `Invalid medication. Must be one of: ${validMedications.join(', ')}` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if already logged today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingEntry } = await supabase
      .from('metrics')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', `medication_${medication}`)
      .gte('recorded_at', `${today}T00:00:00.000Z`)
      .lt('recorded_at', `${today}T23:59:59.999Z`)
      .single();

    if (existingEntry) {
      // Update existing entry
      const { error: updateError } = await supabase
        .from('metrics')
        .update({ 
          value: taken ? 1 : 0,
          metadata: { 
            medication,
            adherence: taken,
            updatedAt: new Date().toISOString()
          }
        })
        .eq('id', existingEntry.id);

      if (updateError) throw updateError;

      return new Response(JSON.stringify({ 
        success: true, 
        message: `${medication} updated: ${taken ? 'taken' : 'missed'}`,
        action: 'updated'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Create new entry
      const { error: insertError } = await supabase
        .from('metrics')
        .insert({
          user_id: user.id,
          type: `medication_${medication}`,
          value: taken ? 1 : 0,
          unit: 'taken',
          metadata: { 
            medication,
            adherence: taken,
            loggedAt: new Date().toISOString()
          },
          recorded_at: new Date().toISOString()
        });

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ 
        success: true, 
        message: `${medication} logged: ${taken ? 'taken' : 'missed'}`,
        action: 'created'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    // Handle auth errors
    if (error.message === 'Authentication required') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Please sign in to continue'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.error('API Error:', error);
    console.error('Medication logging error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to log medication', 
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
