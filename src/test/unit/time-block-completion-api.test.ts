import { beforeEach, describe, expect, it, vi } from 'vitest';

const createServerClientMock = vi.fn();
const getTimeBlockMock = vi.fn();
const getDailyPlanMock = vi.fn();
const updateTimeBlockMock = vi.fn();

vi.mock('../../lib/supabase/server', () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));

vi.mock('../../lib/daily-plan/database', () => ({
  getTimeBlock: (...args: unknown[]) => getTimeBlockMock(...args),
  getDailyPlan: (...args: unknown[]) => getDailyPlanMock(...args),
  updateTimeBlock: (...args: unknown[]) => updateTimeBlockMock(...args),
}));

import { POST as completePOST } from '../../pages/api/time-blocks/[id]/complete';
import { POST as uncompletePOST } from '../../pages/api/time-blocks/[id]/uncomplete';

describe('time block completion APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated complete requests', async () => {
    createServerClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });

    const response = await completePOST({
      params: { id: 'tb-1' },
      cookies: {} as never,
    } as never);

    expect(response.status).toBe(401);
  });

  it('marks block completed and merges metadata', async () => {
    createServerClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
    });

    getTimeBlockMock.mockResolvedValue({
      id: 'tb-1',
      planId: 'plan-1',
      metadata: { role: { type: 'chain-step' }, other: true },
    });

    getDailyPlanMock.mockResolvedValue({
      id: 'plan-1',
      userId: 'user-1',
    });

    updateTimeBlockMock.mockResolvedValue({ id: 'tb-1' });

    const response = await completePOST({
      params: { id: 'tb-1' },
      cookies: {} as never,
    } as never);

    expect(response.status).toBe(200);
    expect(updateTimeBlockMock).toHaveBeenCalledTimes(1);
    const [, , updates] = updateTimeBlockMock.mock.calls[0];
    expect(updates.status).toBe('completed');
    expect(updates.metadata.role).toEqual({ type: 'chain-step' });
    expect(updates.metadata.other).toBe(true);
    expect(updates.metadata.completed_by).toBe('user-1');
    expect(typeof updates.metadata.completed_at).toBe('string');
  });

  it('clears completion metadata on uncomplete', async () => {
    createServerClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
    });

    getTimeBlockMock.mockResolvedValue({
      id: 'tb-1',
      planId: 'plan-1',
      metadata: {
        role: { type: 'chain-step' },
        completed_at: '2026-01-01T08:00:00.000Z',
        completed_by: 'user-1',
      },
    });

    getDailyPlanMock.mockResolvedValue({
      id: 'plan-1',
      userId: 'user-1',
    });

    updateTimeBlockMock.mockResolvedValue({ id: 'tb-1' });

    const response = await uncompletePOST({
      params: { id: 'tb-1' },
      cookies: {} as never,
    } as never);

    expect(response.status).toBe(200);
    const [, , updates] = updateTimeBlockMock.mock.calls[0];
    expect(updates.status).toBe('pending');
    expect(updates.metadata.role).toEqual({ type: 'chain-step' });
    expect(updates.metadata.completed_at).toBeUndefined();
    expect(updates.metadata.completed_by).toBeUndefined();
  });
});
