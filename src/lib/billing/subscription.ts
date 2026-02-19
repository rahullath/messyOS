export type SubscriptionStatus = 'trial' | 'active' | 'premium' | 'cancelled' | 'past_due';

export interface BillingSnapshot {
  status: SubscriptionStatus;
  trialEndDate?: string;
  isTrialExpired: boolean;
  isAccessAllowed: boolean;
}

export function getBillingSnapshot(preferences: Record<string, any> | null | undefined): BillingSnapshot {
  const status = (preferences?.subscription_status || 'trial') as SubscriptionStatus;
  const trialEndDate = typeof preferences?.trial_end_date === 'string'
    ? preferences.trial_end_date
    : undefined;

  const trialMs = trialEndDate ? new Date(trialEndDate).getTime() : NaN;
  const isTrialExpired = Number.isFinite(trialMs) ? trialMs < Date.now() : false;

  const isAccessAllowed =
    status === 'active' ||
    status === 'premium' ||
    (status === 'trial' && !isTrialExpired);

  return {
    status,
    trialEndDate,
    isTrialExpired,
    isAccessAllowed,
  };
}
