import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase/server';

interface SerializedEntry {
  Title: string;
  Type: 'Movie' | 'TV' | 'Book';
  Year?: string;
  Rating?: string;
  'Date Watched'?: string;
  'Date Added'?: string;
  Platform?: string;
  Genre?: string;
  Language?: string;
  Runtime?: string;
  Status?: string;
}

function parseSerializedCSV(csvContent: string): SerializedEntry[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const entry: any = {};
    headers.forEach((header, index) => {
      entry[header] = values[index] || '';
    });
    return entry;
  });
}

function mapSerializedToMeshOS(entry: SerializedEntry) {
  const contentType = entry.Type?.toLowerCase() === 'tv' ? 'tv_show' : 
                     entry.Type?.toLowerCase() === 'book' ? 'book' : 'movie';
  
  const rating = entry.Rating ? parseFloat(entry.Rating) : undefined;
  const completedDate = entry['Date Watched'] || entry['Date Added'] || new Date().toISOString();
  
  // Parse genre if it exists
  const genres = entry.Genre ? entry.Genre.split('|').map(g => g.trim()) : [];
  
  // Parse runtime for movies/shows
  const runtimeMatch = entry.Runtime?.match(/(\d+)/);
  const runtime = runtimeMatch ? parseInt(runtimeMatch[1]) : undefined;

  return {
    user_id: '368deac7-8526-45eb-927a-6a373c95d8c6',
    type: 'content',
    value: rating || 0,
    unit: 'rating',
    metadata: {
      title: entry.Title,
      content_type: contentType,
      status: entry.Status || 'completed',
      rating,
      platform: entry.Platform,
      genre: genres,
      language: entry.Language || 'English',
      completed_at: completedDate,
      runtime_minutes: runtime,
      release_year: entry.Year ? parseInt(entry.Year) : undefined,
      imported_from: 'serializd',
      imported_at: new Date().toISOString()
    }
  };
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createServerClient(cookies);
  
  try {
    const formData = await request.formData();
    const file = formData.get('serializd_data') as File;
    
    if (!file) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No file provided'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const content = await file.text();
    let entries: SerializedEntry[] = [];

    // Try to parse as CSV first
    if (file.name.endsWith('.csv')) {
      entries = parseSerializedCSV(content);
    } else if (file.name.endsWith('.json')) {
      // Handle JSON format
      const jsonData = JSON.parse(content);
      entries = Array.isArray(jsonData) ? jsonData : [jsonData];
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unsupported file format. Please use CSV or JSON.'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (entries.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No valid entries found in file'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Convert to MeshOS format
    const meshOSEntries = entries
      .filter(entry => entry.Title && entry.Title.trim())
      .map(mapSerializedToMeshOS);

    if (meshOSEntries.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No valid entries to import'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check for existing entries to prevent duplicates
    const existingTitles = new Set();
    const { data: existingContent } = await supabase
      .from('metrics')
      .select('metadata')
      .eq('user_id', '368deac7-8526-45eb-927a-6a373c95d8c6')
      .eq('type', 'content');

    if (existingContent) {
      existingContent.forEach(item => {
        if (item.metadata?.title) {
          existingTitles.add(item.metadata.title.toLowerCase());
        }
      });
    }

    // Filter out duplicates
    const newEntries = meshOSEntries.filter(entry => 
      !existingTitles.has(entry.metadata.title.toLowerCase())
    );

    if (newEntries.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'All entries already exist in your library'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert in batches to avoid potential timeouts
    const batchSize = 50;
    let imported = 0;
    
    for (let i = 0; i < newEntries.length; i += batchSize) {
      const batch = newEntries.slice(i, i + batchSize);
      const { error } = await supabase
        .from('metrics')
        .insert(batch);
      
      if (error) {
        console.error('Batch insert error:', error);
        throw error;
      }
      
      imported += batch.length;
    }

    return new Response(JSON.stringify({
      success: true,
      imported,
      total: entries.length,
      skipped: entries.length - imported,
      message: `Successfully imported ${imported} new items`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Import failed'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
