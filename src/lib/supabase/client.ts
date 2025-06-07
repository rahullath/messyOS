import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase.ts'; // Explicit relative path with .ts extension

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  }
});

// Only add auth listener in browser environment
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth event:', event);
    
    if (event === 'SIGNED_IN' && session) {
      console.log('✅ User signed in:', session.user.email);
      
      // Create or update user profile
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          username: session.user.user_metadata?.user_name || session.user.email?.split('@')[0],
          full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
          avatar_url: session.user.user_metadata?.avatar_url,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Profile upsert error:', error);
      } else {
        console.log('✅ Profile updated for:', session.user.email);
      }
      
      // Redirect to dashboard if on login page
      if (window.location.pathname === '/login') {
        window.location.href = '/';
      }
    } else if (event === 'SIGNED_OUT') {
      console.log('👋 User signed out');
      
      // Redirect to login if on protected page
      const protectedRoutes = ['/habits', '/tasks', '/health', '/finance', '/content'];
      if (protectedRoutes.some(route => window.location.pathname.startsWith(route))) {
        window.location.href = '/login';
      }
    }
  });
}
