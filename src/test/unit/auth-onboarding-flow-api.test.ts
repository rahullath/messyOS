import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUserMock = vi.fn();
const getUserPreferencesMock = vi.fn();
const createDefaultPreferencesMock = vi.fn();
const fromMock = vi.fn();

vi.mock('../../lib/auth/simple-multi-user', () => ({
  createServerAuth: () => ({
    getUser: getUserMock,
    getUserPreferences: getUserPreferencesMock,
    createDefaultPreferences: createDefaultPreferencesMock,
    supabase: {
      from: fromMock,
    },
  }),
}));

import { GET as checkOnboardingGET } from '../../pages/api/auth/check-onboarding';
import { POST as skipOnboardingPOST } from '../../pages/api/skip-onboarding';
import { POST as completeOnboardingPOST } from '../../pages/api/user/complete-onboarding';

describe('auth + onboarding flow endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ id: 'user-1', email: 'u@example.com' });
  });

  it('reports completed onboarding when preferences exist', async () => {
    getUserPreferencesMock.mockResolvedValue({ user_id: 'user-1', theme: 'dark' });

    const response = await checkOnboardingGET({
      cookies: {} as never,
    } as never);

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.completed).toBe(true);
    expect(payload.user.id).toBe('user-1');
  });

  it('skip-onboarding initializes default preferences when missing', async () => {
    getUserPreferencesMock.mockResolvedValue(null);
    createDefaultPreferencesMock.mockResolvedValue({ user_id: 'user-1' });

    const response = await skipOnboardingPOST({
      cookies: {} as never,
    } as never);

    expect(response.status).toBe(200);
    expect(createDefaultPreferencesMock).toHaveBeenCalledWith('user-1', 'u@example.com');
  });

  it('complete-onboarding upserts preferences and redirects for form submission', async () => {
    getUserPreferencesMock.mockResolvedValue({ user_id: 'user-1', theme: 'dark' });

    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    const maybeSingleMock = vi.fn().mockResolvedValue({
      data: {
        preferences: {
          theme: 'dark',
          enabled_modules: ['habits'],
        },
      },
      error: null,
    });
    const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    fromMock.mockReturnValue({
      select: selectMock,
      upsert: upsertMock,
    });

    const response = await completeOnboardingPOST({
      request: new Request('http://localhost/api/user/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: '',
      }),
      cookies: {} as never,
    } as never);

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/dashboard');
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });
});
