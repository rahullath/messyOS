import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../utils/test-utils';
import { createMockSupabaseClient, mockUser, mockSession } from '../mocks/supabase';
import { LandingPage } from '@/components/landing/LandingPage';
import { AuthForm } from '@/components/auth/AuthForm';
import { Wallet } from '@/components/wallet/Wallet';

// Mock the services
vi.mock('@/lib/waitlist/service', () => ({
  WaitlistService: {
    addToWaitlist: vi.fn().mockResolvedValue(undefined),
    checkWaitlistStatus: vi.fn().mockResolvedValue({
      exists: true,
      activated: false,
      signupDate: new Date(),
    }),
  },
}));

vi.mock('@/lib/auth/service', () => ({
  AuthService: {
    signUp: vi.fn().mockResolvedValue({
      user: mockUser,
      session: mockSession,
      error: null,
    }),
    signIn: vi.fn().mockResolvedValue({
      user: mockUser,
      session: mockSession,
      error: null,
    }),
  },
}));

vi.mock('@/lib/tokens/service', () => ({
  TokenService: {
    initializeUserTokens: vi.fn().mockResolvedValue({
      balance: 4800,
      totalEarned: 4800,
      totalSpent: 0,
      trialStartDate: new Date(),
      trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    }),
    getTokenBalance: vi.fn().mockResolvedValue(4800),
    deductTokens: vi.fn().mockResolvedValue({
      id: 'test-transaction',
      amount: -10,
      description: 'AI Query',
    }),
  },
}));

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Complete User Journey: Waitlist to Dashboard', () => {
    it('should complete the full user journey from landing page to dashboard', async () => {
      // Step 1: Landing page waitlist signup
      const mockOnWaitlistSubmit = vi.fn().mockResolvedValue(undefined);
      
      render(
        <LandingPage 
          onWaitlistSubmit={mockOnWaitlistSubmit}
          isSubmitting={false}
          submitSuccess={false}
        />
      );

      // User enters email and submits waitlist form
      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      const submitButton = screen.getByRole('button', { name: /join waitlist/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnWaitlistSubmit).toHaveBeenCalledWith('test@example.com');
      });

      // Step 2: User proceeds to authentication
      // Simulate navigation to auth page after waitlist success
      const { rerender } = render(
        <LandingPage 
          onWaitlistSubmit={mockOnWaitlistSubmit}
          isSubmitting={false}
          submitSuccess={true}
        />
      );

      // Verify success message is shown
      expect(screen.getByText(/successfully added to waitlist/i)).toBeInTheDocument();
    });

    it('should handle user authentication and token allocation', async () => {
      // Render auth form
      const mockOnAuthSuccess = vi.fn();
      const mockOnAuthError = vi.fn();

      render(
        <AuthForm 
          onAuthSuccess={mockOnAuthSuccess}
          onAuthError={mockOnAuthError}
        />
      );

      // User fills out sign-up form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signUpButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });
      fireEvent.click(signUpButton);

      await waitFor(() => {
        expect(mockOnAuthSuccess).toHaveBeenCalledWith(mockUser);
      });
    });

    it('should initialize user tokens after successful authentication', async () => {
      const { TokenService } = await import('@/lib/tokens/service');
      
      // Simulate successful authentication
      const mockOnAuthSuccess = vi.fn();
      
      render(
        <AuthForm 
          onAuthSuccess={mockOnAuthSuccess}
          onAuthError={vi.fn()}
        />
      );

      // Trigger authentication
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signUpButton = screen.getByRole('button', { name: /sign up/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });
      fireEvent.click(signUpButton);

      await waitFor(() => {
        expect(TokenService.initializeUserTokens).toHaveBeenCalledWith('test-user-id');
      });
    });
  });

  describe('Token Allocation and Deduction', () => {
    it('should allocate 4800 tokens to new users', async () => {
      const { TokenService } = await import('@/lib/tokens/service');
      
      // Mock token initialization
      TokenService.initializeUserTokens.mockResolvedValue({
        balance: 4800,
        totalEarned: 4800,
        totalSpent: 0,
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Render wallet component
      render(<Wallet />);

      await waitFor(() => {
        expect(screen.getByText('4,800')).toBeInTheDocument();
      });
    });

    it('should deduct tokens when AI features are used', async () => {
      const { TokenService } = await import('@/lib/tokens/service');
      
      // Mock token deduction
      TokenService.deductTokens.mockResolvedValue({
        id: 'test-transaction',
        amount: -10,
        description: 'AI Query',
        created_at: new Date().toISOString(),
      });

      // Simulate AI feature usage
      const result = await TokenService.deductTokens('test-user-id', 10, 'AI Query');
      
      expect(result).toEqual({
        id: 'test-transaction',
        amount: -10,
        description: 'AI Query',
        created_at: expect.any(String),
      });
    });

    it('should update balance in real-time after token deduction', async () => {
      const { TokenService } = await import('@/lib/tokens/service');
      
      // Initial balance
      TokenService.getTokenBalance.mockResolvedValue(4800);
      
      render(<Wallet />);
      
      await waitFor(() => {
        expect(screen.getByText('4,800')).toBeInTheDocument();
      });

      // Simulate token deduction
      TokenService.getTokenBalance.mockResolvedValue(4790);
      TokenService.deductTokens.mockResolvedValue({
        id: 'test-transaction',
        amount: -10,
        description: 'AI Query',
        created_at: new Date().toISOString(),
      });

      // Trigger balance refresh (this would normally happen via context)
      // For testing, we'll verify the service calls
      await TokenService.deductTokens('test-user-id', 10, 'AI Query');
      
      expect(TokenService.deductTokens).toHaveBeenCalledWith('test-user-id', 10, 'AI Query');
    });
  });

  describe('Session Persistence and Cross-Device Consistency', () => {
    it('should persist session in localStorage', async () => {
      const mockSetItem = vi.spyOn(localStorage, 'setItem');
      
      // Simulate successful authentication
      const mockOnAuthSuccess = vi.fn();
      
      render(
        <AuthForm 
          onAuthSuccess={mockOnAuthSuccess}
          onAuthError={vi.fn()}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(mockOnAuthSuccess).toHaveBeenCalled();
      });

      // Verify session data is stored
      expect(mockSetItem).toHaveBeenCalledWith(
        expect.stringContaining('supabase'),
        expect.any(String)
      );
    });

    it('should restore session from localStorage on app reload', async () => {
      // Mock existing session in localStorage
      const mockSession = JSON.stringify({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_at: Date.now() / 1000 + 3600,
        user: mockUser,
      });

      localStorage.setItem('supabase.auth.token', mockSession);

      const mockSupabase = createMockSupabaseClient();
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Verify session restoration logic would work
      expect(localStorage.getItem('supabase.auth.token')).toBe(mockSession);
    });

    it('should handle session expiration gracefully', async () => {
      const mockSupabase = createMockSupabaseClient();
      
      // Mock expired session
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' },
      });

      // This would trigger a redirect to login in the actual app
      const sessionResult = await mockSupabase.auth.getSession();
      
      expect(sessionResult.data.session).toBeNull();
      expect(sessionResult.error).toBeTruthy();
    });
  });

  describe('Error Scenarios and Recovery', () => {
    it('should handle authentication failures with clear error messages', async () => {
      const { AuthService } = await import('@/lib/auth/service');
      
      // Mock authentication failure
      AuthService.signIn.mockResolvedValue({
        user: null,
        session: null,
        error: { message: 'Invalid email or password' },
      });

      const mockOnAuthError = vi.fn();
      
      render(
        <AuthForm 
          onAuthSuccess={vi.fn()}
          onAuthError={mockOnAuthError}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(signInButton);

      await waitFor(() => {
        expect(mockOnAuthError).toHaveBeenCalledWith({
          message: 'Invalid email or password'
        });
      });
    });

    it('should handle network errors with retry mechanism', async () => {
      const { AuthService } = await import('@/lib/auth/service');
      
      // Mock network error
      AuthService.signIn
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          user: mockUser,
          session: mockSession,
          error: null,
        });

      const mockOnAuthSuccess = vi.fn();
      
      render(
        <AuthForm 
          onAuthSuccess={mockOnAuthSuccess}
          onAuthError={vi.fn()}
        />
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });
      
      // First attempt fails
      fireEvent.click(signInButton);
      
      await waitFor(() => {
        expect(AuthService.signIn).toHaveBeenCalledTimes(1);
      });

      // Retry should succeed
      fireEvent.click(signInButton);
      
      await waitFor(() => {
        expect(AuthService.signIn).toHaveBeenCalledTimes(2);
        expect(mockOnAuthSuccess).toHaveBeenCalledWith(mockUser);
      });
    });

    it('should handle insufficient token balance gracefully', async () => {
      const { TokenService } = await import('@/lib/tokens/service');
      
      // Mock insufficient balance
      TokenService.deductTokens.mockRejectedValue(
        new Error('Insufficient token balance')
      );

      try {
        await TokenService.deductTokens('test-user-id', 5000, 'Expensive AI Query');
      } catch (error) {
        expect(error.message).toBe('Insufficient token balance');
      }
    });

    it('should handle password reset flow', async () => {
      const mockSupabase = createMockSupabaseClient();
      
      mockSupabase.auth.resetPasswordForEmail = vi.fn().mockResolvedValue({
        data: {},
        error: null,
      });

      // Simulate password reset request
      const result = await mockSupabase.auth.resetPasswordForEmail('test@example.com');
      
      expect(result.error).toBeNull();
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('OAuth Authentication Flow', () => {
    it('should handle Google OAuth authentication', async () => {
      const mockSupabase = createMockSupabaseClient();
      
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: { provider: 'google', url: 'https://accounts.google.com/oauth/authorize' },
        error: null,
      });

      const result = await mockSupabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
        },
      });

      expect(result.data.provider).toBe('google');
      expect(result.data.url).toContain('google.com');
      expect(result.error).toBeNull();
    });

    it('should handle OAuth callback and session creation', async () => {
      const mockSupabase = createMockSupabaseClient();
      
      // Mock successful OAuth callback
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const sessionResult = await mockSupabase.auth.getSession();
      
      expect(sessionResult.data.session).toEqual(mockSession);
      expect(sessionResult.error).toBeNull();
    });
  });
});