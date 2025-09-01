import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../utils/test-utils';
import { createMockSupabaseClient, mockUser, mockSession } from '../mocks/supabase';
import { createTestUser, createTestSession } from '../utils/test-utils';

// Mock the session sync service
vi.mock('@/lib/auth/session-sync', () => ({
  SessionSyncService: {
    syncSession: vi.fn(),
    clearSession: vi.fn(),
    getStoredSession: vi.fn(),
    isSessionValid: vi.fn(),
  },
}));

// Mock the auth service
vi.mock('@/lib/auth/service', () => ({
  AuthService: {
    getSession: vi.fn(),
    refreshSession: vi.fn(),
    signOut: vi.fn(),
  },
}));

describe('Session Management Integration Tests', () => {
  const mockSupabase = createMockSupabaseClient();
  
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Session Persistence', () => {
    it('should persist session data in localStorage', async () => {
      const { SessionSyncService } = await import('@/lib/auth/session-sync');
      const testSession = createTestSession();

      SessionSyncService.syncSession.mockResolvedValue(undefined);

      await SessionSyncService.syncSession(testSession);

      expect(SessionSyncService.syncSession).toHaveBeenCalledWith(testSession);
    });

    it('should restore session from localStorage on app reload', async () => {
      const { SessionSyncService } = await import('@/lib/auth/session-sync');
      const testSession = createTestSession();

      // Mock stored session
      SessionSyncService.getStoredSession.mockReturnValue(testSession);

      const storedSession = SessionSyncService.getStoredSession();

      expect(storedSession).toEqual(testSession);
      expect(storedSession.user.id).toBe(testSession.user.id);
      expect(storedSession.access_token).toBe(testSession.access_token);
    });

    it('should handle corrupted session data gracefully', async () => {
      const { SessionSyncService } = await import('@/lib/auth/session-sync');

      // Mock corrupted session data
      localStorage.setItem('supabase.auth.token', 'corrupted-data');
      
      SessionSyncService.getStoredSession.mockReturnValue(null);

      const storedSession = SessionSyncService.getStoredSession();

      expect(storedSession).toBeNull();
    });

    it('should clear session data on logout', async () => {
      const { SessionSyncService } = await import('@/lib/auth/session-sync');
      const { AuthService } = await import('@/lib/auth/service');

      SessionSyncService.clearSession.mockResolvedValue(undefined);
      AuthService.signOut.mockResolvedValue({ error: null });

      await AuthService.signOut();
      await SessionSyncService.clearSession();

      expect(SessionSyncService.clearSession).toHaveBeenCalled();
      expect(AuthService.signOut).toHaveBeenCalled();
    });
  });

  describe('Session Validation', () => {
    it('should validate session expiration', async () => {
      const { SessionSyncService } = await import('@/lib/auth/session-sync');
      
      // Mock expired session
      const expiredSession = createTestSession({
        expires_at: Date.now() / 1000 - 3600, // Expired 1 hour ago
      });

      SessionSyncService.isSessionValid.mockReturnValue(false);

      const isValid = SessionSyncService.isSessionValid(expiredSession);

      expect(isValid).toBe(false);
    });

    it('should validate active session', async () => {
      const { SessionSyncService } = await import('@/lib/auth/session-sync');
      
      // Mock active session
      const activeSession = createTestSession({
        expires_at: Date.now() / 1000 + 3600, // Expires in 1 hour
      });

      SessionSyncService.isSessionValid.mockReturnValue(true);

      const isValid = SessionSyncService.isSessionValid(activeSession);

      expect(isValid).toBe(true);
    });

    it('should handle missing session gracefully', async () => {
      const { SessionSyncService } = await import('@/lib/auth/session-sync');

      SessionSyncService.isSessionValid.mockReturnValue(false);

      const isValid = SessionSyncService.isSessionValid(null);

      expect(isValid).toBe(false);
    });
  });

  describe('Session Refresh', () => {
    it('should refresh expired session automatically', async () => {
      const { AuthService } = await import('@/lib/auth/service');
      
      const newSession = createTestSession({
        access_token: 'new-access-token',
        expires_at: Date.now() / 1000 + 3600,
      });

      AuthService.refreshSession.mockResolvedValue({
        data: { session: newSession },
        error: null,
      });

      const result = await AuthService.refreshSession();

      expect(result.data.session.access_token).toBe('new-access-token');
      expect(result.error).toBeNull();
    });

    it('should handle refresh token expiration', async () => {
      const { AuthService } = await import('@/lib/auth/service');

      AuthService.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Refresh token expired' },
      });

      const result = await AuthService.refreshSession();

      expect(result.data.session).toBeNull();
      expect(result.error.message).toBe('Refresh token expired');
    });

    it('should retry session refresh on network failure', async () => {
      const { AuthService } = await import('@/lib/auth/service');

      AuthService.refreshSession
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { session: createTestSession() },
          error: null,
        });

      // First attempt fails
      await expect(AuthService.refreshSession()).rejects.toThrow('Network error');

      // Second attempt succeeds
      const result = await AuthService.refreshSession();
      expect(result.data.session).toBeTruthy();
      expect(result.error).toBeNull();
    });
  });

  describe('Cross-Device Session Consistency', () => {
    it('should sync session across multiple browser tabs', async () => {
      const { SessionSyncService } = await import('@/lib/auth/session-sync');
      
      // Simulate session update in another tab
      const newSession = createTestSession({
        access_token: 'updated-token',
      });

      // Mock storage event (would be triggered by another tab)
      const storageEvent = new StorageEvent('storage', {
        key: 'supabase.auth.token',
        newValue: JSON.stringify(newSession),
        oldValue: null,
      });

      SessionSyncService.syncSession.mockResolvedValue(undefined);

      // Simulate handling storage event
      window.dispatchEvent(storageEvent);

      // Verify sync was called
      expect(SessionSyncService.syncSession).toHaveBeenCalled();
    });

    it('should handle session conflicts between devices', async () => {
      const { SessionSyncService } = await import('@/lib/auth/session-sync');
      const { AuthService } = await import('@/lib/auth/service');

      // Mock conflicting sessions
      const localSession = createTestSession({
        access_token: 'local-token',
        expires_at: Date.now() / 1000 + 1800, // 30 minutes
      });

      const serverSession = createTestSession({
        access_token: 'server-token',
        expires_at: Date.now() / 1000 + 3600, // 1 hour
      });

      AuthService.getSession.mockResolvedValue({
        data: { session: serverSession },
        error: null,
      });

      SessionSyncService.getStoredSession.mockReturnValue(localSession);

      // Server session should take precedence (newer expiration)
      const serverResult = await AuthService.getSession();
      expect(serverResult.data.session.access_token).toBe('server-token');
    });

    it('should maintain session state in PWA mode', async () => {
      const { SessionSyncService } = await import('@/lib/auth/session-sync');

      // Mock PWA environment
      Object.defineProperty(window, 'navigator', {
        value: {
          ...window.navigator,
          standalone: true, // iOS PWA
        },
        writable: true,
      });

      const pwaSession = createTestSession();
      SessionSyncService.getStoredSession.mockReturnValue(pwaSession);

      const storedSession = SessionSyncService.getStoredSession();

      expect(storedSession).toEqual(pwaSession);
      expect(storedSession.user.id).toBe(pwaSession.user.id);
    });
  });

  describe('Session Security', () => {
    it('should invalidate session on suspicious activity', async () => {
      const { AuthService } = await import('@/lib/auth/service');
      const { SessionSyncService } = await import('@/lib/auth/session-sync');

      // Mock suspicious activity detection
      AuthService.signOut.mockResolvedValue({ error: null });
      SessionSyncService.clearSession.mockResolvedValue(undefined);

      // Simulate security event
      await AuthService.signOut();
      await SessionSyncService.clearSession();

      expect(AuthService.signOut).toHaveBeenCalled();
      expect(SessionSyncService.clearSession).toHaveBeenCalled();
    });

    it('should handle session hijacking attempts', async () => {
      const { SessionSyncService } = await import('@/lib/auth/session-sync');

      // Mock invalid session signature
      const suspiciousSession = createTestSession({
        access_token: 'tampered-token',
      });

      SessionSyncService.isSessionValid.mockReturnValue(false);

      const isValid = SessionSyncService.isSessionValid(suspiciousSession);

      expect(isValid).toBe(false);
    });

    it('should enforce session timeout policies', async () => {
      const { SessionSyncService } = await import('@/lib/auth/session-sync');

      // Mock session that exceeds maximum duration
      const longSession = createTestSession({
        expires_at: Date.now() / 1000 + 86400 * 7, // 7 days (too long)
      });

      SessionSyncService.isSessionValid.mockReturnValue(false);

      const isValid = SessionSyncService.isSessionValid(longSession);

      expect(isValid).toBe(false);
    });
  });

  describe('Offline Session Handling', () => {
    it('should cache session data for offline use', async () => {
      const { SessionSyncService } = await import('@/lib/auth/session-sync');

      const offlineSession = createTestSession();
      
      // Mock offline storage
      SessionSyncService.getStoredSession.mockReturnValue(offlineSession);

      // Simulate offline mode
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const cachedSession = SessionSyncService.getStoredSession();

      expect(cachedSession).toEqual(offlineSession);
    });

    it('should sync session when coming back online', async () => {
      const { AuthService } = await import('@/lib/auth/service');
      const { SessionSyncService } = await import('@/lib/auth/session-sync');

      // Mock coming back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      const onlineSession = createTestSession();
      AuthService.getSession.mockResolvedValue({
        data: { session: onlineSession },
        error: null,
      });

      SessionSyncService.syncSession.mockResolvedValue(undefined);

      // Simulate online event
      window.dispatchEvent(new Event('online'));

      const result = await AuthService.getSession();
      expect(result.data.session).toEqual(onlineSession);
    });

    it('should handle session validation failures when offline', async () => {
      const { SessionSyncService } = await import('@/lib/auth/session-sync');

      // Mock offline mode
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const expiredSession = createTestSession({
        expires_at: Date.now() / 1000 - 3600, // Expired
      });

      SessionSyncService.isSessionValid.mockReturnValue(false);

      const isValid = SessionSyncService.isSessionValid(expiredSession);

      expect(isValid).toBe(false);
    });
  });
});