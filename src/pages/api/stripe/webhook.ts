import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createHmac, timingSafeEqual } from 'node:crypto';

function normalize(value: string | undefined): string | undefined {
  const v = value || '';
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function getEnvValue(primary: string | undefined, fallback: string | undefined): string | undefined {
  const value = primary || fallback;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function verifyStripeSignature(payload: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((segment) => {
      const [k, v] = segment.split('=');
      return [k, v];
    })
  ) as Record<string, string>;

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');
  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

async function updateSubscriptionByUserId(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  patch: Record<string, any>
) {
  const { data: existing } = await supabase
    .from('user_preferences')
    .select('preferences')
    .eq('user_id', userId)
    .maybeSingle();

  const preferences = existing?.preferences && typeof existing.preferences === 'object'
    ? existing.preferences
    : {};

  await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: userId,
        preferences: {
          ...preferences,
          ...patch,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
}

function mapStripeSubscriptionStatus(status: string): string {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'past_due' || status === 'unpaid') return 'past_due';
  if (status === 'canceled' || status === 'incomplete_expired') return 'cancelled';
  return 'trial';
}

export const POST: APIRoute = async ({ request }) => {
  const supabaseUrl = getEnvValue(normalize(import.meta.env.PUBLIC_SUPABASE_URL), normalize(process.env.PUBLIC_SUPABASE_URL));
  const serviceRoleKey = getEnvValue(normalize(import.meta.env.SUPABASE_SERVICE_ROLE_KEY), normalize(process.env.SUPABASE_SERVICE_ROLE_KEY));
  const webhookSecret = getEnvValue(normalize(import.meta.env.STRIPE_WEBHOOK_SECRET), normalize(process.env.STRIPE_WEBHOOK_SECRET));

  if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
    return new Response('Missing Stripe/Supabase webhook env', { status: 500 });
  }

  const rawPayload = await request.text();
  const signature = request.headers.get('stripe-signature');
  const verified = verifyStripeSignature(rawPayload, signature, webhookSecret);
  if (!verified) {
    return new Response('Invalid signature', { status: 400 });
  }

  const event = JSON.parse(rawPayload);
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session?.metadata?.user_id;
      if (userId) {
        await updateSubscriptionByUserId(supabase, userId, {
          subscription_status: 'active',
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          subscribed_at: new Date().toISOString(),
        });
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const mappedStatus = mapStripeSubscriptionStatus(subscription.status);

      const { data: rows } = await supabase
        .from('user_preferences')
        .select('user_id, preferences')
        .contains('preferences', { stripe_customer_id: customerId })
        .limit(1);

      const row = rows?.[0];
      if (row?.user_id) {
        await updateSubscriptionByUserId(supabase, row.user_id, {
          subscription_status: mappedStatus,
          stripe_subscription_id: subscription.id,
        });
      }
    }

    return new Response('ok', { status: 200 });
  } catch {
    return new Response('Webhook handler failure', { status: 500 });
  }
};
