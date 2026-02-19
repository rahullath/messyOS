import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

function normalize(value: string | undefined): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const stripeKey = normalize(import.meta.env.STRIPE_SECRET_KEY) || normalize(process.env.STRIPE_SECRET_KEY);
    const stripePriceId = normalize(import.meta.env.STRIPE_PRICE_ID) || normalize(process.env.STRIPE_PRICE_ID) || 'price_1T2Ydo8XD40e7vZKdr9IAKQm';
    const stripeProductId = normalize(import.meta.env.STRIPE_PRODUCT_ID) || normalize(process.env.STRIPE_PRODUCT_ID) || 'prod_U00VtAW0BnrgBy';
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const appUrl = normalize(import.meta.env.PUBLIC_APP_URL) || normalize(process.env.PUBLIC_APP_URL) || new URL(request.url).origin;
    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('success_url', `${appUrl}/billing?status=success`);
    params.set('cancel_url', `${appUrl}/billing?status=cancel`);
    params.set('customer_email', user.email || '');
    params.set('metadata[user_id]', user.id);
    params.set('metadata[product_id]', stripeProductId);
    params.set('line_items[0][quantity]', '1');
    params.set('line_items[0][price]', stripePriceId);

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.url) {
      return new Response(JSON.stringify({ error: payload?.error?.message || 'Failed to create Stripe session' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ url: payload.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Unexpected error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
