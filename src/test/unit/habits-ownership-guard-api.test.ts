import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuthMock = vi.fn();
const fromMock = vi.fn();
const getUserMock = vi.fn();
const invalidateDailyContextCacheMock = vi.fn();
const updateHabitStreakMock = vi.fn();

vi.mock('../../lib/auth/simple-multi-user', () => ({
  createServerAuth: () => ({
    requireAuth: requireAuthMock,
    supabase: {
      from: fromMock,
    },
  }),
}));

vi.mock('../../lib/supabase/server', () => ({
  createServerClient: () => ({
    auth: {
      getUser: getUserMock,
    },
    from: fromMock,
  }),
}));

vi.mock('../../pages/api/context/today', () => ({
  invalidateDailyContextCache: (...args: unknown[]) => invalidateDailyContextCacheMock(...args),
}));

vi.mock('../../lib/habits/streaks', () => ({
  updateHabitStreak: (...args: unknown[]) => updateHabitStreakMock(...args),
}));

import { POST as logPOST } from '../../pages/api/habits/[id]/log';
import { POST as logEnhancedPOST } from '../../pages/api/habits/[id]/log-enhanced';

describe('habit ownership guards on logging endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuthMock.mockResolvedValue({ id: 'user-1' });
    getUserMock.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  it('rejects /habits/[id]/log when habit is not owned by user', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table !== 'habits') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      };
    });

    const response = await logPOST({
      request: new Request('http://localhost/api/habits/habit-123/log', {
        method: 'POST',
        body: JSON.stringify({ value: 1 }),
        headers: { 'Content-Type': 'application/json' },
      }),
      params: { id: 'habit-123' },
      cookies: {} as never,
    } as never);

    expect(response.status).toBe(404);
    expect(invalidateDailyContextCacheMock).not.toHaveBeenCalled();
  });

  it('rejects /habits/[id]/log-enhanced when habit is not owned by user', async () => {
    fromMock.mockImplementation((table: string) => {
      if (table !== 'habits') {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      };
    });

    const response = await logEnhancedPOST({
      request: new Request('http://localhost/api/habits/habit-123/log-enhanced', {
        method: 'POST',
        body: JSON.stringify({ value: 1, date: '2026-02-18' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      params: { id: 'habit-123' },
      cookies: {} as never,
    } as never);

    expect(response.status).toBe(404);
    expect(updateHabitStreakMock).not.toHaveBeenCalled();
    expect(invalidateDailyContextCacheMock).not.toHaveBeenCalled();
  });
});
