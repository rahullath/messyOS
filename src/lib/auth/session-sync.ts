// src/lib/auth/session-sync.ts - Client-server session synchronization
import type { Session } from '@supabase/supabase-js';

/**
 * Synchronizes client-side session with server-side cookies
 * This ensures that server-side middleware can access the session
 */
export async function syncSessionWithServer(session: Session): Promise<boolean> {
  try {
    console.log('🔄 Syncing session with server for user:', session.user.email);
    
    const response = await fetch('/api/auth/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: session.user
      }),
      credentials: 'same-origin' // Ensure cookies are sent
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Session sync failed:', errorData);
      return false;
    }
    
    const result = await response.json();
    console.log('✅ Session synced successfully:', result);
    return true;
    
  } catch (error) {
    console.error('❌ Session sync error:', error);
    return false;
  }
}

/**
 * Clears server-side session cookies
 */
export async function clearServerSession(): Promise<boolean> {
  try {
    console.log('🧹 Clearing server session...');
    
    const response = await fetch('/api/auth/session', {
      method: 'DELETE',
      credentials: 'same-origin'
    });
    
    if (!response.ok) {
      console.error('❌ Failed to clear server session');
      return false;
    }
    
    console.log('✅ Server session cleared');
    return true;
    
  } catch (error) {
    console.error('❌ Error clearing server session:', error);
    return false;
  }
}

// Track sync state to prevent duplicate calls
let isSyncing = false;
let lastSyncTime = 0;
const SYNC_COOLDOWN = 5000; // 5 seconds cooldown between syncs

/**
 * Enhanced auth state change handler that syncs with server
 */
export function setupAuthStateSync() {
  if (typeof window === 'undefined') return;
  
  // Import auth client dynamically to avoid circular dependencies
  import('./config').then(({ authClient }) => {
    authClient.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔄 Auth state change: ${event}`);
      
      switch (event) {
        case 'SIGNED_IN':
          if (session && !isSyncing) {
            const now = Date.now();
            if (now - lastSyncTime > SYNC_COOLDOWN) {
              console.log('✅ User signed in, syncing with server...');
              isSyncing = true;
              lastSyncTime = now;
              
              const synced = await syncSessionWithServer(session);
              isSyncing = false;
              
              if (synced) {
                // Dispatch success event
                window.dispatchEvent(new CustomEvent('auth:server-synced', { 
                  detail: { session, user: session.user } 
                }));
              } else {
                // Dispatch error event
                window.dispatchEvent(new CustomEvent('auth:sync-failed', { 
                  detail: { session, user: session.user } 
                }));
              }
            } else {
              console.log('🔄 Skipping sync (cooldown active)');
            }
          }
          break;
          
        case 'SIGNED_OUT':
          console.log('👋 User signed out, clearing server session...');
          isSyncing = false;
          lastSyncTime = 0;
          await clearServerSession();
          window.dispatchEvent(new CustomEvent('auth:server-cleared'));
          break;
          
        case 'TOKEN_REFRESHED':
          if (session && !isSyncing) {
            const now = Date.now();
            if (now - lastSyncTime > SYNC_COOLDOWN) {
              console.log('🔄 Token refreshed, syncing with server...');
              isSyncing = true;
              lastSyncTime = now;
              
              await syncSessionWithServer(session);
              isSyncing = false;
            } else {
              console.log('🔄 Skipping token refresh sync (cooldown active)');
            }
          }
          break;
      }
    });
  });
}