type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

const RESEND_API_URL = 'https://api.resend.com/emails';

function getEnvValue(primary: string | undefined, fallback: string | undefined): string | undefined {
  const value = primary || fallback;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export async function sendTransactionalEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = getEnvValue(import.meta.env.RESEND_API_KEY, process.env.RESEND_API_KEY);
  const from = getEnvValue(import.meta.env.RESEND_FROM_EMAIL, process.env.RESEND_FROM_EMAIL);

  if (!apiKey || !from) {
    // Email delivery is optional in local/staging environments.
    return false;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function sendWaitlistConfirmationEmail(email: string): Promise<boolean> {
  return sendTransactionalEmail({
    to: email,
    subject: 'You are on the MeshOS waitlist',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>You're on the waitlist</h2>
        <p>Thanks for joining MeshOS early access.</p>
        <p>We are building executive-function support for real daily stability.</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(email: string): Promise<boolean> {
  return sendTransactionalEmail({
    to: email,
    subject: 'Welcome to MeshOS',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>Welcome to MeshOS</h2>
        <p>Your account is ready.</p>
        <p>Start with your first chain and keep the day traversable.</p>
      </div>
    `,
  });
}
