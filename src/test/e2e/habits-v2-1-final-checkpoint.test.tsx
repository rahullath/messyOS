import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ChainView from '../../../src/components/daily-plan/ChainView';
import { parseNote } from '../../../src/lib/habits/note-parser';
import { normalizeLoopValue } from '../../../src/lib/import/enhanced-loop-habits-v2';
import type { ExecutionChain, ExitGate } from '../../../src/lib/chains/types';

const TEST_USER_ID = 'test-user-18';

type HabitEntryRow = {
  user_id: string;
  date: string;
  value: number;
  notes?: string | null;
  logged_at?: string | null;
  duration_minutes?: number | null;
};

function createMockSupabaseForEntries(entries: HabitEntryRow[]) {
  return {
    from: vi.fn(() => {
      const filters: Record<string, string> = {};
      let gteDate: string | undefined;
      let lteDate: string | undefined;

      const builder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((key: string, value: string) => {
          filters[key] = value;
          return builder;
        }),
        gte: vi.fn((key: string, value: string) => {
          if (key === 'date') gteDate = value;
          return builder;
        }),
        lte: vi.fn((key: string, value: string) => {
          if (key === 'date') lteDate = value;
          return builder;
        }),
        order: vi.fn(async () => {
          const data = entries.filter((entry) => {
            if (filters.user_id && entry.user_id !== filters.user_id) return false;
            if (filters.date && entry.date !== filters.date) return false;
            if (gteDate && entry.date < gteDate) return false;
            if (lteDate && entry.date > lteDate) return false;
            return true;
          });

          return { data, error: null };
        }),
      };

      return builder;
    }),
  };
}

function buildChainForUI(): ExecutionChain {
  const anchorStart = new Date('2026-02-14T10:00:00.000Z');
  const anchorEnd = new Date('2026-02-14T11:00:00.000Z');

  return {
    chain_id: 'chain-18',
    anchor_id: 'anchor-18',
    anchor: {
      id: 'anchor-18',
      title: 'Campus Seminar',
      type: 'seminar',
      start: anchorStart,
      end: anchorEnd,
      must_attend: true,
      calendar_event_id: 'evt-18',
      location: 'Library',
    },
    chain_completion_deadline: new Date('2026-02-14T09:00:00.000Z'),
    steps: [
      {
        step_id: 'step-1',
        chain_id: 'chain-18',
        name: 'Shower',
        start_time: new Date('2026-02-14T08:20:00.000Z'),
        end_time: new Date('2026-02-14T08:30:00.000Z'),
        duration: 10,
        is_required: true,
        can_skip_when_late: false,
        status: 'pending',
        role: 'chain-step',
        metadata: {
          duration_prior_applied: true,
        },
      },
      {
        step_id: 'step-2',
        chain_id: 'chain-18',
        name: 'Exit Readiness',
        start_time: new Date('2026-02-14T08:30:00.000Z'),
        end_time: new Date('2026-02-14T08:40:00.000Z'),
        duration: 10,
        is_required: true,
        can_skip_when_late: false,
        status: 'pending',
        role: 'exit-gate',
      },
    ],
    commitment_envelope: {
      envelope_id: 'env-18',
      prep: {
        step_id: 'env-prep',
        chain_id: 'chain-18',
        name: 'Preparation',
        start_time: new Date('2026-02-14T08:20:00.000Z'),
        end_time: new Date('2026-02-14T08:40:00.000Z'),
        duration: 20,
        is_required: true,
        can_skip_when_late: false,
        status: 'pending',
        role: 'chain-step',
      },
      travel_there: {
        step_id: 'env-there',
        chain_id: 'chain-18',
        name: 'Travel',
        start_time: new Date('2026-02-14T08:40:00.000Z'),
        end_time: new Date('2026-02-14T09:10:00.000Z'),
        duration: 30,
        is_required: true,
        can_skip_when_late: false,
        status: 'pending',
        role: 'chain-step',
      },
      anchor: {
        step_id: 'env-anchor',
        chain_id: 'chain-18',
        name: 'Campus Seminar',
        start_time: anchorStart,
        end_time: anchorEnd,
        duration: 60,
        is_required: true,
        can_skip_when_late: false,
        status: 'pending',
        role: 'anchor',
      },
      travel_back: {
        step_id: 'env-back',
        chain_id: 'chain-18',
        name: 'Travel Back',
        start_time: anchorEnd,
        end_time: new Date('2026-02-14T11:30:00.000Z'),
        duration: 30,
        is_required: true,
        can_skip_when_late: false,
        status: 'pending',
        role: 'chain-step',
      },
      recovery: {
        step_id: 'env-recovery',
        chain_id: 'chain-18',
        name: 'Recovery',
        start_time: new Date('2026-02-14T11:30:00.000Z'),
        end_time: new Date('2026-02-14T11:40:00.000Z'),
        duration: 10,
        is_required: true,
        can_skip_when_late: false,
        status: 'pending',
        role: 'recovery',
      },
    },
    status: 'pending',
    metadata: {
      risk_inflator: 1.1,
      low_energy_risk: true,
      sleep_debt_risk: false,
    },
  };
}

describe('Habits v2.1 Task 18 Final Checkpoint', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates import -> parse basics and graceful degradation', () => {
    expect(normalizeLoopValue(13000, 'NUMERICAL')).toBe(13);
    expect(normalizeLoopValue(2, 'YES_NO')).toBe(1);

    const parsed = parseNote('13.5mg 2-3 pouches evening');
    expect(parsed.strength_mg).toBe(13.5);
    expect(parsed.count_range).toEqual({ min: 2, max: 3 });
    expect(parsed.confidence).toBeGreaterThanOrEqual(0.5);

    const failed = parseNote('');
    expect(failed.parse_method).toBe('failed');
    expect(failed.confidence).toBe(0);
  });

  it('verifies temporal boundary and aggregation behavior (date < D)', async () => {
    const supabaseModule = await import('@supabase/supabase-js');
    const createClientMock = supabaseModule.createClient as unknown as Mock;

    const dateD = '2026-02-14';
    const yesterday = '2026-02-13';
    const twoDaysBack = '2026-02-12';

    const entries: HabitEntryRow[] = [
      {
        user_id: TEST_USER_ID,
        date: yesterday,
        value: 1,
        notes: 'reg shower with skincare',
        logged_at: '2026-02-13T07:30:00.000Z',
      },
      {
        user_id: TEST_USER_ID,
        date: twoDaysBack,
        value: 1,
        notes: '2 meals cooked',
        duration_minutes: 22,
        logged_at: '2026-02-12T18:00:00.000Z',
      },
      {
        user_id: TEST_USER_ID,
        date: dateD,
        value: 1,
        notes: '6mg 99 pouches TODAY',
        logged_at: '2026-02-14T09:00:00.000Z',
      },
    ];

    createClientMock.mockImplementation(() => createMockSupabaseForEntries(entries));

    const { generateDailyContext } = await import('../../../src/lib/context/daily-context');
    const context = await generateDailyContext(TEST_USER_ID, new Date(`${dateD}T12:00:00.000Z`), 'http://x', 'key');

    expect(context.date).toBe(dateD);
    expect(context.hygiene.shower_done).toBe(true);

    // Today's distinctive nicotine entry must be excluded by temporal semantics.
    expect(context.substances.nicotine.used).toBe(false);
  });

  it('verifies API caching + invalidation + auth/error handling', async () => {
    const mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: TEST_USER_ID } },
      error: null,
    });

    vi.doMock('../../../src/lib/supabase/server', () => ({
      createServerClient: vi.fn(() => ({
        auth: {
          getUser: mockGetUser,
        },
      })),
    }));

    const generatedContext = {
      date: new Date().toISOString().split('T')[0],
      wake: { reliability: 0 },
      substances: {
        nicotine: { used: false, reliability: 0 },
        cannabis: { used: false, reliability: 0 },
        caffeine: { used: false, reliability: 0 },
      },
      meds: { taken: false, reliability: 0 },
      hygiene: { shower_done: false, reliability: 0 },
      meals: { reliability: 0 },
      day_flags: { low_energy_risk: false, sleep_debt_risk: false },
      duration_priors: {
        bathroom_min: 5,
        hygiene_min: 8,
        shower_min: 10,
        dress_min: 5,
        pack_min: 3,
        cook_simple_meal_min: 20,
      },
    };

    const generateDailyContextMock = vi.fn().mockResolvedValue(generatedContext);
    vi.doMock('../../../src/lib/context/daily-context', () => ({
      generateDailyContext: generateDailyContextMock,
    }));

    const { GET, invalidateDailyContextCache } = await import('../../../src/pages/api/context/today');
    const { habitCacheService } = await import('../../../src/lib/habits/cache-service');
    (habitCacheService as unknown as { cache: Map<string, unknown> }).cache.clear();

    const firstResponse = await GET({
      request: new Request('http://localhost/api/context/today'),
      cookies: {} as never,
    } as never);
    expect(firstResponse.status).toBe(200);
    expect(firstResponse.headers.get('X-Cache')).toBe('MISS');
    expect(generateDailyContextMock).toHaveBeenCalledTimes(1);

    const secondResponse = await GET({
      request: new Request('http://localhost/api/context/today'),
      cookies: {} as never,
    } as never);
    expect(secondResponse.status).toBe(200);
    expect(secondResponse.headers.get('X-Cache')).toBe('HIT');
    expect(generateDailyContextMock).toHaveBeenCalledTimes(1);

    invalidateDailyContextCache(TEST_USER_ID);

    const thirdResponse = await GET({
      request: new Request('http://localhost/api/context/today'),
      cookies: {} as never,
    } as never);
    expect(thirdResponse.status).toBe(200);
    expect(thirdResponse.headers.get('X-Cache')).toBe('MISS');
    expect(generateDailyContextMock).toHaveBeenCalledTimes(2);

    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const unauthorized = await GET({
      request: new Request('http://localhost/api/context/today'),
      cookies: {} as never,
    } as never);
    expect(unauthorized.status).toBe(401);
  });

  it('verifies Chain View surfaces enhanced data and reliability signals', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          meds: { reliability: 0.2 },
        }),
      })
    );

    const chain = buildChainForUI();
    const exitGate: ExitGate = {
      status: 'blocked',
      conditions: [
        { id: 'keys', name: 'Keys present', satisfied: false },
        { id: 'water', name: 'Water bottle filled', satisfied: true },
      ],
      blocked_reasons: ['Keys missing'],
    };

    render(
      <ChainView
        chain={chain}
        exitGate={exitGate}
        onStepComplete={vi.fn()}
        onGateConditionToggle={vi.fn()}
      />
    );

    expect(screen.getAllByText(/Complete by/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Start by/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Duration based on your history/i)).toBeInTheDocument();
    expect(screen.getByText(/Low energy risk detected/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText(/Exit gate suggestions may be less accurate due to limited recent data/i)
      ).toBeInTheDocument();
    });
  });
});
