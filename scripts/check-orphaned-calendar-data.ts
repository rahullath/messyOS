/**
 * Check for orphaned calendar data after test cleanup
 * This script checks if calendar events exist without calendar sources
 */

import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_USER_ID = '70429eba-f32e-47ab-bfcb-a75e2f819de4';

async function checkOrphanedData() {
  console.log('=== Checking for Orphaned Calendar Data ===\n');
  console.log(`User ID: ${TEST_USER_ID}\n`);

  // Check calendar sources
  const { data: sources, error: sourcesError } = await supabase
    .from('calendar_sources')
    .select('*')
    .eq('user_id', TEST_USER_ID);

  if (sourcesError) {
    console.error('Error fetching calendar sources:', sourcesError);
  } else {
    console.log(`Calendar Sources: ${sources?.length || 0}`);
    if (sources && sources.length > 0) {
      for (const source of sources) {
        console.log(`  - ${source.name} (${source.type}) - ID: ${source.id}`);
      }
    }
  }

  // Check calendar events
  const { data: events, error: eventsError } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', TEST_USER_ID);

  if (eventsError) {
    console.error('Error fetching calendar events:', eventsError);
  } else {
    console.log(`\nCalendar Events: ${events?.length || 0}`);
    if (events && events.length > 0) {
      for (const event of events) {
        console.log(`  - ${event.title} (${event.start_time}) - Source ID: ${event.source_id}`);
      }
    }
  }

  // Check for orphaned events (events without a matching source)
  if (events && events.length > 0) {
    const sourceIds = new Set(sources?.map(s => s.id) || []);
    const orphanedEvents = events.filter(e => !sourceIds.has(e.source_id));
    
    console.log(`\nOrphaned Events (no matching source): ${orphanedEvents.length}`);
    if (orphanedEvents.length > 0) {
      for (const event of orphanedEvents) {
        console.log(`  - ${event.title} (${event.start_time}) - Missing Source ID: ${event.source_id}`);
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Total calendar sources: ${sources?.length || 0}`);
  console.log(`Total calendar events: ${events?.length || 0}`);
  
  if (events && events.length > 0 && (!sources || sources.length === 0)) {
    console.log('\n⚠️  WARNING: You have calendar events but no calendar sources!');
    console.log('This likely happened due to test cleanup deleting all sources.');
    console.log('You may need to recreate your calendar sources or restore from backup.');
  }
}

checkOrphanedData().catch(console.error);
