// scripts/apply-habits-migration.ts
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('Applying habits enhancement migration...');
    
    const migrationSQL = readFileSync(join(process.cwd(), 'database/habits-enhancement-migration.sql'), 'utf-8');
    
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration applied successfully!');
    
    // Test that the new fields exist
    const { data, error: testError } = await supabase
      .from('habits')
      .select('measurement_type, allows_skips, position, best_streak')
      .limit(1);
    
    if (testError) {
      console.error('Test query failed:', testError);
    } else {
      console.log('✅ New fields are available');
    }
    
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();