// scripts/apply-cross-module-migration.js
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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