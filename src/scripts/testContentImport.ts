import { SerializdImporter, type EnhancedSerializdEntry } from '../lib/content/SerializdImporter';

// Test CSV data matching your format
const testCSV = `Title,Status,Rating,Seasons,Page,Review_ID,TMDB_ID,TMDB_Title,Original_Title,Genres,Overview,Production_Countries,Languages,Original_Language,Popularity,Vote_Average,Vote_Count,Adult,IMDB_ID,Cast,Crew,Watch_Date
One Piece,Watched,N/A,N/A,1,123,456,"One Piece","One Piece","Action,Adventure",Long overview,Japan,Japanese,ja,100,8.5,1000,false,tt1234567,Actor1,Director1,2023-01-01
Smiling Friends,Watched,N/A,N/A,1,124,457,"Smiling Friends","Smiling Friends","Animation,Comedy",Short overview,USA,English,en,90,8.0,900,false,tt1234568,Actor2,Director2,2023-01-02
Hacks,Watched,N/A,N/A,1,125,458,"Hacks","Hacks","Comedy,Drama",Another overview,USA,English,en,80,7.8,800,false,tt1234569,Actor3,Director3,2023-01-03
Murderbot,Watched,N/A,N/A,1,126,459,"Murderbot","Murderbot","Sci-Fi",Robot overview,USA,English,en,70,7.5,700,false,tt1234570,Actor4,Director4,2023-01-04
Andor,Watched,N/A,N/A,1,127,460,"Andor","Andor","Sci-Fi,Action",Star Wars overview,USA,English,en,95,8.9,1200,false,tt1234571,Actor5,Director5,2023-01-05
Nirvanna the Band the Show,Watched,N/A,N/A,1,128,461,"Nirvanna the Band the Show","Nirvanna the Band the Show","Comedy",Canadian overview,Canada,English,en,60,7.0,600,false,tt1234572,Actor6,Director6,2023-01-06
The Pitt,Watched,N/A,N/A,1,129,462,"The Pitt","The Pitt","Drama",Zombie overview,USA,English,en,65,7.2,650,false,tt1234573,Actor7,Director7,2023-01-07
High Potential,Watched,N/A,N/A,1,130,463,"High Potential","High Potential","Comedy,Drama",Detective overview,USA,English,en,75,7.6,750,false,tt1234574,Actor8,Director8,2023-01-08`;

// Test JSON data matching your format
const testJSON = `[
  {
    "Title": "One Piece",
    "Status": "Watched",
    "Rating": "N/A",
    "Season_Episode": "Season 1",
    "Review_ID": 123,
    "TMDB_ID": 456,
    "TMDB_Title": "One Piece",
    "Original_Title": "One Piece",
    "Genres": "Action,Adventure",
    "Overview": "Long overview",
    "Production_Countries": "Japan",
    "Languages": "Japanese",
    "Original_Language": "ja",
    "Popularity": 100,
    "Vote_Average": 8.5,
    "Vote_Count": 1000,
    "Adult": false,
    "IMDB_ID": "tt1234567",
    "Cast": "Actor1",
    "Crew": "Director1",
    "Watch_Date": "2023-01-01"
  },
  {
    "Title": "Smiling Friends",
    "Status": "Watched",
    "Rating": "N/A",
    "Review_ID": 124,
    "TMDB_ID": 457,
    "TMDB_Title": "Smiling Friends",
    "Original_Title": "Smiling Friends",
    "Genres": "Animation,Comedy",
    "Overview": "Short overview",
    "Production_Countries": "USA",
    "Languages": "English",
    "Original_Language": "en",
    "Popularity": 90,
    "Vote_Average": 8.0,
    "Vote_Count": 900,
    "Adult": false,
    "IMDB_ID": "tt1234568",
    "Cast": "Actor2",
    "Crew": "Director2",
    "Watch_Date": "2023-01-02"
  },
  {
    "Title": "Hacks",
    "Status": "Watched",
    "Rating": "N/A",
    "Review_ID": 125,
    "TMDB_ID": 458,
    "TMDB_Title": "Hacks",
    "Original_Title": "Hacks",
    "Genres": "Comedy,Drama",
    "Overview": "Another overview",
    "Production_Countries": "USA",
    "Languages": "English",
    "Original_Language": "en",
    "Popularity": 80,
    "Vote_Average": 7.8,
    "Vote_Count": 800,
    "Adult": false,
    "IMDB_ID": "tt1234569",
    "Cast": "Actor3",
    "Crew": "Director3",
    "Watch_Date": "2023-01-03"
  }
]`;

async function testImport() {
  const userId = 'test-user-id';

  console.log('🧪 Testing CSV Import...');
  try {
    const parsedCsvEntries = SerializdImporter.parseEnhancedSerializdCSV(testCSV);
    const meshOsCsvEntries = parsedCsvEntries.map(entry => SerializdImporter.mapEnhancedSerializdToMeshOS(entry, userId));
    
    console.log(`📊 Parsed ${parsedCsvEntries.length} CSV entries.`);
    console.log(`🔄 Converted ${meshOsCsvEntries.length} CSV entries to MeshOS format.`);
    console.log('✅ CSV Import Simulation Result (first 2 entries):', meshOsCsvEntries.slice(0, 2));
  } catch (error) {
    console.error('❌ CSV Import Error:', error);
  }

  console.log('\n🧪 Testing JSON Import...');
  try {
    const parsedJsonEntries: EnhancedSerializdEntry[] = JSON.parse(testJSON);
    const meshOsJsonEntries = parsedJsonEntries.map(entry => SerializdImporter.mapEnhancedSerializdToMeshOS(entry, userId));
    
    console.log(`📊 Parsed ${parsedJsonEntries.length} JSON entries.`);
    console.log(`🔄 Converted ${meshOsJsonEntries.length} JSON entries to MeshOS format.`);
    console.log('✅ JSON Import Simulation Result (first 2 entries):', meshOsJsonEntries.slice(0, 2));
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
