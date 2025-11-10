import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthProvider } from '@/lib/auth/context';
import { createMockSupabaseClient } from '../mocks/supabase';

// Mock the auth context with test data
const mockAuthContext = {
  user: null,
  session: null,
  isLoading: false,
  tokenBalance: 4800,
  trialStatus: {
    isActive: true,
    daysRemaining: 30,
    tokensRemaining: 4800,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  refreshTokenBalance: vi.fn(),
};

const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Test data factories
export const createTestUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createTestSession = (overrides = {}) => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: createTestUser(),
  ...overrides,
});

export const createTestTokenBalance = (overrides = {}) => ({
  balance: 4800,
  totalEarned: 4800,
  totalSpent: 0,
  trialStartDate: new Date(),
  trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  ...overrides,
});

export const createTestTransaction = (overrides = {}) => ({
  id: 'test-transaction-id',
  user_id: 'test-user-id',
  amount: -10,
  description: 'AI Query',
  created_at: new Date().toISOString(),
  ...overrides,
});

// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));