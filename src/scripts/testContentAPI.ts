// src/scripts/testContentAPI.ts
// Test adding content via your existing API (bypasses RLS issues)

const API_BASE = 'http://localhost:4321'; // Your dev server URL

const sampleMovies = [
  {
    title: "The Dark Knight",
    content_type: "movie",
    rating: 9,
    platform: "Netflix",
    genre: ["Action", "Crime", "Drama"],
    language: "English"
  },
  {
    title: "Spirited Away", 
    content_type: "movie",
    rating: 10,
    platform: "HBO Max",
    genre: ["Animation", "Family"],
    language: "Japanese"
  },
  {
    title: "Parasite",
    content_type: "movie", 
    rating: 9,
    platform: "Amazon Prime",
    genre: ["Thriller", "Drama"],
    language: "Korean"
  },
  {
    title: "Breaking Bad",
    content_type: "tv_show",
    rating: 10,
    platform: "Netflix", 
    genre: ["Crime", "Drama"],
    language: "English"
  },
  {
    title: "Attack on Titan",
    content_type: "tv_show",
    rating: 9,
    platform: "Crunchyroll",
    genre: ["Animation", "Action"], 
    language: "Japanese"
  },
  {
    title: "Atomic Habits",
    content_type: "book",
    rating: 9,
    genre: ["Self-Help", "Productivity"],
    language: "English"
  },
  {
    title: "1984",
    content_type: "book",
    rating: 10,
    genre: ["Dystopian", "Fiction"],
    language: "English"
  }
];

async function addContentViaAPI() {
  console.log('🚀 Adding sample content via API...');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const item of sampleMovies) {
    try {
      const response = await fetch(`${API_BASE}/api/content/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...item,
          status: 'completed',
          completed_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Added: ${item.title}`);
        successCount++;
      } else {
        console.log(`❌ Failed: ${item.title} - ${result.error}`);
        errorCount++;
      }
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`❌ Error adding ${item.title}:`, error);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Results: ${successCount} success, ${errorCount} errors`);
  console.log('🎯 Visit http://localhost:4321/content to see your data!');
}

// Run the test
addContentViaAPI().catch(console.error);
