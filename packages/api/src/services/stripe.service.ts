import Stripe from "stripe";

// ─────────────────────────────────────────────────────────────────────────────
// Stripe client singleton
// ─────────────────────────────────────────────────────────────────────────────

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    stripeInstance = new Stripe(key, { apiVersion: "2026-01-28.clover" });
  }
  return stripeInstance;
}

// ─────────────────────────────────────────────────────────────────────────────
// Connected account management (Stripe Connect)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a Stripe Connect Express account for a restaurant.
 * Returns the account ID and an onboarding link.
 */
export async function createConnectedAccount(
  restaurantName: string,
  email: string,
): Promise<{ accountId: string; onboardingUrl: string }> {
  const stripe = getStripe();

  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    email,
    business_type: "company",
    company: { name: restaurantName },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings/payments?refresh=true`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings/payments?onboarding=complete`,
    type: "account_onboarding",
  });

  return {
    accountId: account.id,
    onboardingUrl: accountLink.url,
  };
}

/**
 * Retrieve account status from Stripe.
 */
export async function getAccountStatus(
  accountId: string,
): Promise<{ status: string; payoutsEnabled: boolean; chargesEnabled: boolean }> {
  const stripe = getStripe();
  const account = await stripe.accounts.retrieve(accountId);

  let status = "pending";
  if (account.charges_enabled && account.payouts_enabled) {
    status = "active";
  } else if (account.requirements?.disabled_reason) {
    status = "restricted";
  }

  return {
    status,
    payoutsEnabled: account.payouts_enabled ?? false,
    chargesEnabled: account.charges_enabled ?? false,
  };
}

/**
 * Generate a new onboarding link for an existing account.
 */
export async function createOnboardingLink(
  accountId: string,
): Promise<string> {
  const stripe = getStripe();

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings/payments?refresh=true`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/settings/payments?onboarding=complete`,
    type: "account_onboarding",
  });

  return accountLink.url;
}

/**
 * Create a Stripe login link for the connected account dashboard.
 */
export async function createDashboardLink(accountId: string): Promise<string> {
  const stripe = getStripe();
  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink.url;
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment intents (deposits)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a payment intent for collecting a deposit.
 */
export async function createPaymentIntent(opts: {
  amount: number;
  currency: string;
  stripeAccountId: string;
  reservationId: string;
  customerEmail?: string;
}): Promise<{ paymentIntentId: string; clientSecret: string }> {
  const stripe = getStripe();

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: opts.amount,
      currency: opts.currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        reservationId: opts.reservationId,
        type: "deposit",
      },
      receipt_email: opts.customerEmail,
    },
    { stripeAccount: opts.stripeAccountId },
  );

  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret!,
  };
}

/**
 * Capture a previously authorized payment intent.
 */
export async function capturePaymentIntent(
  paymentIntentId: string,
  stripeAccountId: string,
): Promise<void> {
  const stripe = getStripe();
  await stripe.paymentIntents.capture(paymentIntentId, undefined, {
    stripeAccount: stripeAccountId,
  });
}

/**
 * Refund a captured payment intent.
 */
export async function refundPaymentIntent(
  paymentIntentId: string,
  stripeAccountId: string,
  amount?: number,
): Promise<string> {
  const stripe = getStripe();

  const refund = await stripe.refunds.create(
    {
      payment_intent: paymentIntentId,
      ...(amount ? { amount } : {}),
    },
    { stripeAccount: stripeAccountId },
  );

  return refund.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Setup intents (save card for no-show protection)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a setup intent to save a card without charging.
 */
export async function createSetupIntent(opts: {
  stripeAccountId: string;
  reservationId: string;
  customerEmail?: string;
}): Promise<{ setupIntentId: string; clientSecret: string }> {
  const stripe = getStripe();

  const setupIntent = await stripe.setupIntents.create(
    {
      automatic_payment_methods: { enabled: true },
      metadata: {
        reservationId: opts.reservationId,
        type: "no_show_protection",
      },
    },
    { stripeAccount: opts.stripeAccountId },
  );

  return {
    setupIntentId: setupIntent.id,
    clientSecret: setupIntent.client_secret!,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// No-show charges
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Charge a stored payment method for a no-show fee.
 */
export async function chargeNoShowFee(opts: {
  amount: number;
  currency: string;
  stripeAccountId: string;
  paymentMethodId: string;
  reservationId: string;
  customerEmail?: string;
}): Promise<{ paymentIntentId: string }> {
  const stripe = getStripe();

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: opts.amount,
      currency: opts.currency.toLowerCase(),
      payment_method: opts.paymentMethodId,
      confirm: true,
      off_session: true,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
      metadata: {
        reservationId: opts.reservationId,
        type: "no_show_fee",
      },
      receipt_email: opts.customerEmail,
    },
    { stripeAccount: opts.stripeAccountId },
  );

  return { paymentIntentId: paymentIntent.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook verification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify and construct a Stripe webhook event.
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set");
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Retrieve a payment intent (for webhook handling).
 */
export async function retrievePaymentIntent(
  paymentIntentId: string,
  stripeAccountId?: string,
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe();
  return stripe.paymentIntents.retrieve(
    paymentIntentId,
    stripeAccountId ? { stripeAccount: stripeAccountId } : undefined,
  );
}

/**
 * Retrieve a setup intent to get the payment method ID.
 */
export async function retrieveSetupIntent(
  setupIntentId: string,
  stripeAccountId?: string,
): Promise<Stripe.SetupIntent> {
  const stripe = getStripe();
  return stripe.setupIntents.retrieve(
    setupIntentId,
    stripeAccountId ? { stripeAccount: stripeAccountId } : undefined,
  );
}

/**
 * List recent charges for a connected account (for transaction history).
 */
export async function listRecentCharges(
  stripeAccountId: string,
  limit: number = 20,
): Promise<Stripe.PaymentIntent[]> {
  const stripe = getStripe();

  const paymentIntents = await stripe.paymentIntents.list(
    { limit },
    { stripeAccount: stripeAccountId },
  );

  return paymentIntents.data;
}
