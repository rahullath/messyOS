import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { SerializdImporter } from '../../../lib/content/SerializdImporter';

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createServerClient(cookies);
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const formData = await request.formData();
    const contentFile = formData.get('content') as File;
    
    if (!contentFile) {
      return new Response(JSON.stringify({ success: false, error: 'No content file provided' }), { status: 400 });
    }

    console.log('🎬 Content file received:', {
      name: contentFile.name,
      size: contentFile.size,
      type: contentFile.type
    });

    const contentText = await contentFile.text();
    const importer = new SerializdImporter(supabase);
    const importResult = await importer.importSerializdData(contentText, user.id);

    if (!importResult.success) {
      console.error('❌ Content import failed:', importResult.errors);
      return new Response(JSON.stringify({
        success: false,
        error: `Import failed: ${importResult.errors.join(', ')}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully imported ${importResult.imported} content entries. Skipped ${importResult.skipped} duplicates.`,
      importedRecords: importResult.imported,
      skippedRecords: importResult.skipped,
      errors: importResult.errors
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Content import error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
