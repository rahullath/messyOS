import { SerializdImporter } from '../lib/content/SerializdImporter';

// Mock Supabase client for testing
const mockSupabase = {
  from: (table: string) => ({
    select: (columns: string) => ({
      eq: (column: string, value: string) => ({
        then: (callback: any) => callback({ data: [] }) // Mock empty existing content
      })
    }),
    insert: (data: any[]) => ({
      then: (callback: any) => callback({ error: null })
    })
  })
} as any;

// Test CSV data matching your format
const testCSV = `Title,Status,Rating,Seasons,Page
One Piece,Watched,N/A,N/A,1
Smiling Friends,Watched,N/A,N/A,1
Hacks,Watched,N/A,N/A,1
Murderbot,Watched,N/A,N/A,1
Andor,Watched,N/A,N/A,1
Nirvanna the Band the Show,Watched,N/A,N/A,1
The Pitt,Watched,N/A,N/A,1
High Potential,Watched,N/A,N/A,1`;

// Test JSON data matching your format
const testJSON = `[
  {
    "Title": "One Piece",
    "Status": "Watched",
    "Rating": "N/A",
    "Seasons": "N/A",
    "Page": 1
  },
  {
    "Title": "Smiling Friends",
    "Status": "Watched",
    "Rating": "N/A",
    "Seasons": "N/A",
    "Page": 1
  },
  {
    "Title": "Hacks",
    "Status": "Watched",
    "Rating": "N/A",
    "Seasons": "N/A",
    "Page": 1
  }
]`;

async function testImport() {
  const importer = new SerializdImporter(mockSupabase);
  const userId = 'test-user-id';

  console.log('🧪 Testing CSV Import...');
  try {
    const csvResult = await importer.importSerializdData(testCSV, userId);
    console.log('✅ CSV Import Result:', csvResult);
  } catch (error) {
    console.error('❌ CSV Import Error:', error);
  }

  console.log('\n🧪 Testing JSON Import...');
  try {
    const jsonResult = await importer.importSerializdData(testJSON, userId);
    console.log('✅ JSON Import Result:', jsonResult);
  } catch (error) {
    console.error('❌ JSON Import Error:', error);
  }
}

// Run the test
testImport().then(() => {
  console.log('\n🎉 Import tests completed!');
}).catch(error => {
  console.error('💥 Test failed:', error);
});
