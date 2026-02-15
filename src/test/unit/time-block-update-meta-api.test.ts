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

import { POST } from '../../pages/api/time-blocks/[id]/update-meta';

describe('time block update-meta API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    createServerClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    });

    const request = new Request('http://localhost/api/time-blocks/tb-1/update-meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: {} }),
    });

    const response = await POST({
      params: { id: 'tb-1' },
      request,
      cookies: {} as never,
    } as never);

    expect(response.status).toBe(401);
  });

  it('rejects metadata payload that includes user_id', async () => {
    createServerClientMock.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
    });

    const request = new Request('http://localhost/api/time-blocks/tb-1/update-meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: { role: { user_id: 'bad' } } }),
    });

    const response = await POST({
      params: { id: 'tb-1' },
      request,
      cookies: {} as never,
    } as never);

    expect(response.status).toBe(400);
    expect(updateTimeBlockMock).not.toHaveBeenCalled();
  });

  it('merges role metadata and persists gate conditions', async () => {
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
        chain_id: 'chain-1',
        role: {
          type: 'exit-gate',
          required: true,
          gate_conditions: [{ id: 'keys', name: 'Keys present', satisfied: false }],
        },
      },
    });

    getDailyPlanMock.mockResolvedValue({
      id: 'plan-1',
      userId: 'user-1',
    });

    updateTimeBlockMock.mockResolvedValue({ id: 'tb-1' });

    const request = new Request('http://localhost/api/time-blocks/tb-1/update-meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metadata: {
          role: {
            gate_conditions: [{ id: 'keys', name: 'Keys present', satisfied: true }],
          },
        },
      }),
    });

    const response = await POST({
      params: { id: 'tb-1' },
      request,
      cookies: {} as never,
    } as never);

    expect(response.status).toBe(200);
    expect(updateTimeBlockMock).toHaveBeenCalledTimes(1);
    const [, , updates] = updateTimeBlockMock.mock.calls[0];
    expect(updates.metadata.chain_id).toBe('chain-1');
    expect(updates.metadata.role.type).toBe('exit-gate');
    expect(updates.metadata.role.required).toBe(true);
    expect(updates.metadata.role.gate_conditions).toEqual([
      { id: 'keys', name: 'Keys present', satisfied: true },
    ]);
  });
});
