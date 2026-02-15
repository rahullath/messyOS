import { beforeEach, describe, expect, it, vi } from 'vitest';

const createServerClientMock = vi.fn();

vi.mock('../../lib/supabase/server', () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));

import { GET, PUT } from '../../pages/api/daily-plan/exit-gate-template';

function buildSupabaseMock(options?: {
  userId?: string | null;
  preferences?: Record<string, unknown> | null;
  selectError?: unknown;
  upsertError?: unknown;
}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: options?.preferences === undefined ? null : { preferences: options.preferences },
    error: options?.selectError || null,
  });

  const upsert = vi.fn().mockResolvedValue({
    error: options?.upsertError || null,
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options?.userId === null ? null : { id: options?.userId || 'user-1' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle,
        })),
      })),
      upsert,
    })),
    __spies: {
      maybeSingle,
      upsert,
    },
  };
}

describe('exit gate template API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns default template when no user preferences exist', async () => {
    const supabaseMock = buildSupabaseMock({ preferences: undefined });
    createServerClientMock.mockReturnValue(supabaseMock);

    const response = await GET({ cookies: {} as never } as never);
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(Array.isArray(payload.gate_conditions)).toBe(true);
    expect(payload.gate_conditions.some((c: any) => c.id === 'eyeglasses')).toBe(true);
  });

  it('GET returns 401 when not authenticated', async () => {
    const supabaseMock = buildSupabaseMock({ userId: null });
    createServerClientMock.mockReturnValue(supabaseMock);

    const response = await GET({ cookies: {} as never } as never);
    expect(response.status).toBe(401);
  });

  it('PUT upserts normalized gate template', async () => {
    const supabaseMock = buildSupabaseMock({
      preferences: {
        existing: true,
      },
    });
    createServerClientMock.mockReturnValue(supabaseMock);

    const request = new Request('http://localhost/api/daily-plan/exit-gate-template', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gate_conditions: [
          { id: 'keys', satisfied: true },
        ],
      }),
    });

    const response = await PUT({ request, cookies: {} as never } as never);
    expect(response.status).toBe(200);
    expect(supabaseMock.__spies.upsert).toHaveBeenCalledTimes(1);
    const [payload] = supabaseMock.__spies.upsert.mock.calls[0];
    expect(payload.user_id).toBe('user-1');
    expect(payload.preferences.exit_gate_template.gate_conditions).toBeDefined();
  });
});
