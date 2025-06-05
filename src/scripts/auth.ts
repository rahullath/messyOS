import { supabase } from '../lib/supabase/client';

document.getElementById('google-signin')?.addEventListener('click', async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`
    }
  });
  
  if (error) console.error('Error:', error);
});

document.getElementById('github-signin')?.addEventListener('click', async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/`
    }
  });
  
  if (error) console.error('Error:', error);
});
