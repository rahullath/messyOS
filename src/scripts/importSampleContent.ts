import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || 'https://mdhtpjpwwbuepsytgrva.supabase.co';
const SUPABASE_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY || 'your_supabase_anon_key';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const sampleContent = [
  // Movies
  {
    title: "The Dark Knight",
    type: "movie",
    rating: 9,
    platform: "Netflix",
    genre: ["Action", "Crime", "Drama"],
    language: "English",
    runtime_minutes: 152,
    release_year: 2008,
    completed_at: new Date(2023, 5, 15).toISOString()
  },
  {
    title: "Spirited Away",
    type: "movie",
    rating: 10,
    platform: "HBO Max",
    genre: ["Animation", "Family"],
    language: "Japanese",
    runtime_minutes: 125,
    release_year: 2001,
    completed_at: new Date(2023, 3, 22).toISOString()
  },
  {
    title: "Parasite",
    type: "movie",
    rating: 9,
    platform: "Amazon Prime",
    genre: ["Thriller", "Drama"],
    language: "Korean",
    runtime_minutes: 132,
    release_year: 2019,
    completed_at: new Date(2023, 1, 10).toISOString()
  },
  {
    title: "Mad Max: Fury Road",
    type: "movie",
    rating: 8,
    platform: "Netflix",
    genre: ["Action", "Sci-Fi"],
    language: "English",
    runtime_minutes: 120,
    release_year: 2015,
    completed_at: new Date(2023, 4, 5).toISOString()
  },
  
  // TV Shows
  {
    title: "Breaking Bad",
    type: "tv_show",
    rating: 10,
    platform: "Netflix",
    genre: ["Crime", "Drama"],
    language: "English",
    runtime_minutes: 3780, // Approximate total runtime
    release_year: 2008,
    completed_at: new Date(2023, 2, 15).toISOString()
  },
  {
    title: "Attack on Titan",
    type: "tv_show",
    rating: 9,
    platform: "Crunchyroll",
    genre: ["Animation", "Action"],
    language: "Japanese",
    runtime_minutes: 2610, // Approximate total runtime
    release_year: 2013,
    completed_at: new Date(2023, 0, 20).toISOString()
  },
  {
    title: "The Office",
    type: "tv_show",
    rating: 8,
    platform: "Amazon Prime",
    genre: ["Comedy"],
    language: "English",
    runtime_minutes: 4860, // Approximate total runtime
    release_year: 2005,
    completed_at: new Date(2022, 11, 1).toISOString()
  },
  {
    title: "Money Heist",
    type: "tv_show",
    rating: 8,
    platform: "Netflix",
    genre: ["Crime", "Thriller"],
    language: "Spanish",
    runtime_minutes: 2460, // Approximate total runtime
    release_year: 2017,
    completed_at: new Date(2023, 3, 30).toISOString()
  },
  
  // Books
  {
    title: "Atomic Habits",
    type: "book",
    rating: 9,
    genre: ["Self-Help", "Productivity"],
    language: "English",
    pages: 320,
    completed_at: new Date(2023, 1, 5).toISOString()
  },
  {
    title: "The Hitchhiker's Guide to the Galaxy",
    type: "book",
    rating: 8,
    genre: ["Sci-Fi", "Comedy"],
    language: "English",
    pages: 224,
    completed_at: new Date(2022, 11, 15).toISOString()
  },
  {
    title: "Sapiens",
    type: "book",
    rating: 9,
    genre: ["History", "Philosophy"],
    language: "English",
    pages: 464,
    completed_at: new Date(2023, 4, 20).toISOString()
  },
  {
    title: "1984",
    type: "book",
    rating: 10,
    genre: ["Dystopian", "Fiction"],
    language: "English",
    pages: 328,
    completed_at: new Date(2023, 2, 10).toISOString()
  },
  
  // Podcasts
  {
    title: "The Joe Rogan Experience",
    type: "podcast",
    rating: 7,
    platform: "Spotify",
    genre: ["Talk", "Comedy"],
    language: "English",
    completed_at: new Date(2023, 5, 1).toISOString()
  },
  {
    title: "Conan O'Brien Needs a Friend",
    type: "podcast",
    rating: 8,
    platform: "Various",
    genre: ["Comedy", "Interview"],
    language: "English",
    completed_at: new Date(2023, 4, 15).toISOString()
  }
];

async function importSampleContent() {
  console.log('Starting content import...');

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('Authentication error: No user logged in. Please log in to import sample data.');
    return;
  }

  const userId = user.id;
  console.log(`Importing sample content for user: ${userId}`);
  
  const metricsData = sampleContent.map(item => ({
    user_id: userId,
    type: 'content',
    value: item.rating || 0,
    unit: 'rating',
    metadata: {
      ...item,
      status: 'completed',
      imported_from: 'sample_data'
    }
  }));

  const { data, error } = await supabase
    .from('metrics')
    .insert(metricsData)
    .select();

  if (error) {
    console.error('Import failed:', error);
    return;
  }

  console.log(`Successfully imported ${data.length} content items!`);
  console.log('Sample data includes:');
  console.log(`- ${sampleContent.filter(c => c.type === 'movie').length} movies`);
  console.log(`- ${sampleContent.filter(c => c.type === 'tv_show').length} TV shows`);
  console.log(`- ${sampleContent.filter(c => c.type === 'book').length} books`);
  console.log(`- ${sampleContent.filter(c => c.type === 'podcast').length} podcasts`);
}

// Run the import
importSampleContent().catch(console.error);
