// scripts/apply-cross-module-migration.js
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://mdhtpjpwwbuepsytgrva.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kaHRwanB3d2J1ZXBzeXRncnZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODIxNDQ1NCwiZXhwIjoyMDYzNzkwNDU0fQ.K-6nY9zbyy0JM0SzdVviBoiN8D9Sh663rZnzATgR8C0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyCrossModuleMigration() {
  console.log('🔄 Applying cross-module integration migration...');
  
  try {
    // Check if cross-module tables already exist
    console.log('📋 Checking if cross-module tables exist...');
    
    const { data: existingTables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['life_optimization_scores', 'achievements', 'user_achievements', 'cross_module_correlations', 'progress_summaries']);
    
    if (tablesError) {
      console.log('⚠️  Cannot check existing tables, proceeding with migration');
    } else {
      const existingTableNames = existingTables?.map(t => t.table_name) || [];
      console.log('📊 Existing cross-module tables:', existingTableNames);
      
      if (existingTableNames.length >= 5) {
        console.log('✅ Cross-module tables already exist!');
        return;
      }
    }
    
    // Read the migration file
    const migrationSQL = readFileSync('supabase/migrations/20250904140000_cross_module_integration.sql', 'utf8');
    
    console.log('🔧 Please go to your Supabase dashboard SQL editor and run this migration:');
    console.log('');
    console.log('📍 Go to: https://supabase.com/dashboard/project/mdhtpjpwwbuepsytgrva/sql/new');
    console.log('');
    console.log('📋 Copy and paste the following SQL:');
    console.log('');
    console.log('-- Cross-module integration migration');
    console.log(migrationSQL);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

applyCrossModuleMigration();