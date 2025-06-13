import type { SupabaseClient } from '@supabase/supabase-js';
import type { ContentEntry } from '../../types/content';

interface ImportedContentEntry {
  Title: string;
  Status: string;
  Rating?: string;
  Seasons?: string;
  Page?: number;
}

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

export class SerializdImporter {
  constructor(private supabase: SupabaseClient) {}

  async importSerializdData(data: string, userId: string): Promise<ImportResult> {
    try {
      let entries: ImportedContentEntry[] = [];
      
      // Try to parse as JSON first
      try {
        const jsonData = JSON.parse(data);
        entries = Array.isArray(jsonData) ? jsonData : [jsonData];
      } catch {
        // If JSON parsing fails, try CSV
        entries = this.parseCSV(data);
      }

      if (entries.length === 0) {
        return {
          success: false,
          imported: 0,
          skipped: 0,
          errors: ['No valid entries found in the data']
        };
      }

      // Get existing content to prevent duplicates
      const { data: existingContent } = await this.supabase
        .from('content')
        .select('title')
        .eq('user_id', userId);

      const existingTitles = new Set(
        existingContent?.map(item => item.title.toLowerCase()) || []
      );

      // Convert and filter entries
      const contentEntries: Omit<ContentEntry, 'id'>[] = [];
      const errors: string[] = [];
      let skipped = 0;

      for (const entry of entries) {
        try {
          if (!entry.Title || !entry.Title.trim()) {
            errors.push('Entry missing title, skipping');
            continue;
          }

          if (existingTitles.has(entry.Title.toLowerCase())) {
            skipped++;
            continue;
          }

          const contentEntry = this.mapToContentEntry(entry, userId);
          contentEntries.push(contentEntry);
        } catch (error) {
          errors.push(`Error processing "${entry.Title}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (contentEntries.length === 0) {
        return {
          success: false,
          imported: 0,
          skipped,
          errors: errors.length > 0 ? errors : ['No new entries to import']
        };
      }

      // Insert in batches
      const batchSize = 50;
      let imported = 0;

      for (let i = 0; i < contentEntries.length; i += batchSize) {
        const batch = contentEntries.slice(i, i + batchSize);
        const { error } = await this.supabase
          .from('content')
          .insert(batch);

        if (error) {
          errors.push(`Batch insert error: ${error.message}`);
          continue;
        }

        imported += batch.length;
      }

      return {
        success: imported > 0,
        imported,
        skipped,
        errors
      };

    } catch (error) {
      return {
        success: false,
        imported: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown import error']
      };
    }
  }

  private parseCSV(csvContent: string): ImportedContentEntry[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    return lines.slice(1).map(line => {
      const values = this.parseCSVLine(line);
      const entry: any = {};
      
      headers.forEach((header, index) => {
        if (values[index] !== undefined) {
          entry[header] = values[index];
        }
      });
      
      return entry;
    }).filter(entry => entry.Title && entry.Title.trim());
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private mapToContentEntry(entry: ImportedContentEntry, userId: string): Omit<ContentEntry, 'id'> {
    // Determine content type based on title patterns or default to tv_show
    const type = this.determineContentType(entry.Title);
    
    // Map status
    const status = this.mapStatus(entry.Status);
    
    // Parse rating if available
    const rating = entry.Rating && entry.Rating !== 'N/A' ? 
      this.parseRating(entry.Rating) : undefined;

    return {
      user_id: userId,
      type,
      title: entry.Title.trim(),
      status,
      rating,
      genre: [], // Empty for now since not provided in your format
      language: 'English', // Default since not provided
      platform: undefined,
      notes: undefined,
      metadata: {
        source: 'serializd',
        seasons: entry.Seasons && entry.Seasons !== 'N/A' ? entry.Seasons : undefined,
        page: entry.Page || 1,
        imported_at: new Date().toISOString()
      },
      recorded_at: new Date()
    };
  }

  private determineContentType(title: string): ContentEntry['type'] {
    // Simple heuristics to determine content type
    const lowerTitle = title.toLowerCase();
    
    // Common TV show indicators
    if (lowerTitle.includes('season') || 
        lowerTitle.includes('series') ||
        lowerTitle.includes('show')) {
      return 'tv_show';
    }
    
    // Common book indicators
    if (lowerTitle.includes('book') || 
        lowerTitle.includes('novel') ||
        lowerTitle.includes('guide')) {
      return 'book';
    }
    
    // Default to movie for most content
    return 'movie';
  }

  private mapStatus(status: string): ContentEntry['status'] {
    const lowerStatus = status.toLowerCase();
    
    switch (lowerStatus) {
      case 'watched':
      case 'completed':
      case 'finished':
        return 'completed';
      case 'watching':
      case 'reading':
      case 'in progress':
        return 'watching';
      case 'planned':
      case 'to watch':
      case 'to read':
        return 'planned';
      case 'dropped':
        return 'dropped';
      case 'paused':
      case 'on hold':
        return 'paused';
      default:
        return 'completed'; // Default for "Watched" status
    }
  }

  private parseRating(rating: string): number | undefined {
    if (!rating || rating === 'N/A') return undefined;
    
    const parsed = parseFloat(rating);
    if (isNaN(parsed)) return undefined;
    
    // Ensure rating is within 1-10 scale
    return Math.max(1, Math.min(10, parsed));
  }
}
