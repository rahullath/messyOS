import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase/server';

// Helper function to parse CSV data
function parseSerializdCSV(csvData: string) {
  const lines = csvData.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const entries = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const entry: any = {};
    
    headers.forEach((header, index) => {
      if (values[index]) {
        entry[header] = values[index];
      }
    });
    
    if (Object.keys(entry).length > 0) {
      entries.push(entry);
    }
  }

  return entries;
}

async function importSerializdData(fileContent: string, userId: string, supabase: any) {
  try {
    let data;
    
    // Try to parse as JSON first
    try {
      data = JSON.parse(fileContent);
    } catch {
      // If JSON fails, try CSV parsing
      data = parseSerializdCSV(fileContent);
    }

    if (!Array.isArray(data)) {
      throw new Error('Invalid file format. Expected JSON array or CSV.');
    }

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const item of data) {
      try {
        // Convert Serializd item to content metric
        const contentMetric = {
          user_id: userId,
          type: 'content',
          value: parseFloat(item.rating) || 0,
          unit: 'rating',
          metadata: {
            title: item.title || item.name,
            content_type: item.type || (item.episodes ? 'tv_show' : 'movie'),
            status: mapSerializdStatus(item.status),
            rating: parseFloat(item.rating),
            genre: parseGenres(item.genres),
            language: item.language || 'English',
            completed_at: item.watched_date ? new Date(item.watched_date).toISOString() : null,
            platform: item.platform,
            notes: item.review || item.notes,
            runtime_minutes: parseInt(item.runtime) || null,
            pages: parseInt(item.pages) || null,
            serializd_id: item.id,
            source: 'serializd'
          },
          recorded_at: new Date().toISOString()
        };

        // Check for duplicates
        const { data: existingContent, error: duplicateError } = await supabase
          .from('metrics')
          .select('*')
          .eq('user_id', userId)
          .eq('metadata->serializd_id', item.id)
          .single();

        if (duplicateError && duplicateError.code !== 'PGRST116') {
          throw duplicateError;
        }

        if (existingContent) {
          skipped++;
          continue;
        }

        // Insert new content metric
        const { error } = await supabase
          .from('metrics')
          .insert([contentMetric]);

        if (error) throw error;
        imported++;
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to import ${item.title || 'Unknown item'}: ${errorMessage}`);
      }
    }

    return {
      success: true,
      imported,
      skipped,
      errors
    };
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      imported: 0,
      skipped: 0,
      errors: [`Serializd import failed: ${errorMessage}`]
    };
  }
}

// Helper function to map Serializd status to our status
function mapSerializdStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'watched': 'completed',
    'completed': 'completed',
    'watching': 'watching',
    'reading': 'reading',
    'plan to watch': 'planned',
    'want to watch': 'planned',
    'dropped': 'dropped',
    'on hold': 'paused'
  };
  
  return statusMap[status?.toLowerCase()] || 'completed';
}

// Helper function to parse genres
function parseGenres(genresStr: string): string[] {
  if (!genresStr) return [];
  return genresStr.split(',').map(g => g.trim()).filter(Boolean);
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createServerClient(cookies);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('serializd_data') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ 
        error: 'No file provided' 
      }), { status: 400 });
    }

    const fileContent = await file.text();
    const importResult = await importSerializdData(fileContent, user.id, supabase);

    return new Response(JSON.stringify(importResult), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Serializd import error:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
