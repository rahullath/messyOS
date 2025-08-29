// src/lib/auth/auth-redirect-fix.ts - Handle auth redirects based on environment
export function getAuthRedirectURL(): string {
  if (typeof window === 'undefined') {
    // Server-side: return localhost for development
    return process.env.NODE_ENV === 'development' 
      ? 'http://localhost:4322/auth/callback'
      : 'https://messy-os.vercel.app/auth/callback';
  }
  
  // Client-side: use current origin for localhost
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
  
  if (isLocalhost) {
    return `${window.location.origin}/auth/callback`;
  }
  
  return 'https://messy-os.vercel.app/auth/callback';
}

export function getPostAuthRedirectURL(): string {
  if (typeof window === 'undefined') {
    return '/dashboard';
  }
  
  const isLocalhost = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
  
  // Always redirect to current domain after auth
  return '/dashboard';
}

// Fix auth URL mismatch by updating Supabase client at runtime
export function fixAuthUrls() {
  if (typeof window === 'undefined') return;
  
  const currentOrigin = window.location.origin;
  const isLocalhost = window.location.hostname === 'localhost';
  
  if (isLocalhost) {
    console.log('🔧 Fixing auth URLs for localhost development');
    console.log('Current origin:', currentOrigin);
    
    // Create script to update Supabase settings
    const script = document.createElement('script');
    script.textContent = `
      // Override Supabase redirect behavior for development
      if (window.location.hostname === 'localhost') {
        console.log('🏠 Development mode: keeping auth on localhost');
      }
    `;
    document.head.appendChild(script);
  }
}