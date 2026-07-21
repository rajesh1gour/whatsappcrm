import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ---------------------------------------------------------------------------
// Subscription tier types — must match the DB enum exactly.
// ---------------------------------------------------------------------------
const SUBSCRIPTION_TIERS = ["basic", "standard", "premium", "free", "canceled"] as const;
type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

// ---------------------------------------------------------------------------
// Plan configuration — maps a plan name to its DB tier and usage limits.
// The plan_name is sent from the front-end as metadata during checkout.
// ---------------------------------------------------------------------------
const PLAN_CONFIG: Record<string, { tier: SubscriptionTier; monthly_message_limit: number }> = {
  basic:    { tier: "basic",    monthly_message_limit: 1_000 },
  standard: { tier: "standard", monthly_message_limit: 5_000 },
  premium:  { tier: "premium",  monthly_message_limit: 20_000 },
};

/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe events via webhook.  Signature-verified via the
 * STRIPE_WEBHOOK_SECRET env var.  Uses the Supabase service-role client
 * (createAdminClient) to bypass RLS when updating the tenants table.
 *
 * Handled events:
 *   - checkout.session.completed      → activate / upgrade the tenant
 *   - customer.subscription.deleted   → downgrade the tenant to no-plan
 *   - customer.subscription.updated   → sync plan changes & renewals
 *   - invoice.paid                    → sync period end, reset usage counters
 *   - invoice.payment_failed          → log failure for monitoring
 */
export async function POST(request: NextRequest) {
  // 1. Read the raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  // 2. Verify the webhook signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 3. Use the service-role Supabase client (bypasses RLS)
  const supabase = createAdminClient();

  try {
    switch (event.type) {
      // -------------------------------------------------------------------
      // checkout.session.completed
      // -------------------------------------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenant_id ?? session.client_reference_id;
        const planName = session.metadata?.plan_name?.toLowerCase().trim();
        const plan = planName ? PLAN_CONFIG[planName] : undefined;

        if (!tenantId) {
          console.error("checkout.session.completed — no tenant_id in metadata");
          return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 });
        }

        if (!plan) {
          console.error(`checkout.session.completed — unknown plan: "${planName}"`);
          return NextResponse.json({ error: "Invalid plan name" }, { status: 400 });
        }

        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : null;

        // Retrieve the current_period_end from the subscription so we can track it
        let currentPeriodEnd: string | null = null;
        if (subscriptionId) {
          try {
            const subscription: any = await stripe.subscriptions.retrieve(subscriptionId);
            currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
          } catch (err) {
            console.error("Failed to retrieve subscription details:", err);
          }
        }

        const { error: updateError } = await supabase
          .from("tenants")
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscriptionId,
            subscription_tier: plan.tier as SubscriptionTier,
            monthly_message_limit: plan.monthly_message_limit,
            message_count: 0,
            usage_period_start: new Date().toISOString(),
            ...(currentPeriodEnd
              ? { subscription_current_period_end: currentPeriodEnd }
              : {}),
          })
          .eq("id", tenantId);

        if (updateError) {
          console.error("Failed to update tenant after checkout:", updateError);
          return NextResponse.json({ error: "Database update failed" }, { status: 500 });
        }

        console.log(
          `✅ Tenant ${tenantId} subscribed to "${planName}" (sub: ${subscriptionId})`
        );
        break;
      }

      // -------------------------------------------------------------------
      // customer.subscription.deleted
      // -------------------------------------------------------------------
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Downgrade to 'canceled' tier so the tenant retains read-only access
        // (or a minimal grace experience) but cannot send new messages.
        const { error: updateError } = await supabase
          .from("tenants")
          .update({
            stripe_subscription_id: null,
            subscription_tier: "canceled",
            monthly_message_limit: 0,
            message_count: 0,
          })
          .eq("stripe_customer_id", customerId);

        if (updateError) {
          console.error("Failed to downgrade tenant:", updateError);
          return NextResponse.json({ error: "Database update failed" }, { status: 500 });
        }

        console.log(`✅ Tenant (customer: ${customerId}) subscription canceled → tier: canceled`);
        break;
      }

      // -------------------------------------------------------------------
      // customer.subscription.updated
      // -------------------------------------------------------------------
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Infer the plan from the subscription items.  This handles
        // upgrades/downgrades initiated from the Stripe Customer Portal.
        const lookupKey = subscription.items.data[0]?.price?.lookup_key;
        const planName = lookupKey?.toLowerCase().trim();
        const plan = planName ? PLAN_CONFIG[planName] : undefined;

        const updateFields: Record<string, unknown> = {
          subscription_current_period_end: new Date(
            (subscription as any).current_period_end * 1000
          ).toISOString(),
        };

        if (plan) {
          updateFields.subscription_tier = plan.tier as SubscriptionTier;
          updateFields.monthly_message_limit = plan.monthly_message_limit;
        }

        const { error: updateError } = await supabase
          .from("tenants")
          .update(updateFields)
          .eq("stripe_customer_id", customerId);

        if (updateError) {
          console.error("Failed to sync subscription update:", updateError);
          return NextResponse.json({ error: "Database update failed" }, { status: 500 });
        }

        console.log(
          `✅ Tenant (customer: ${customerId}) subscription updated${
            plan ? ` to "${planName}"` : ""
          }`
        );
        break;
      }

      // -------------------------------------------------------------------
      // invoice.paid
      // -------------------------------------------------------------------
      // A recurring invoice was paid — this fires at the start of each new
      // billing period and confirms payment succeeded.  We use it to sync the
      // period end date, reset the usage counters, and mark the tenant as
      // active (in case they were previously flagged for failed payments).
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        if (invoice.billing_reason === "subscription_create") {
          // Ignore the very first invoice — checkout.session.completed handles
          // the initial provisioning already.
          console.log(`ℹ️ invoice.paid (subscription_create) — skipping, handled by checkout`);
          break;
        }

        // invoice.period_end reflects the billing period for subscription
        // invoices — simpler and more reliable than navigating lines.data.
        const periodEnd = invoice.period_end;

        const updateFields: Record<string, unknown> = {
          message_count: 0,
          usage_period_start: new Date().toISOString(),
          status: "active",
        };

        if (periodEnd) {
          updateFields.subscription_current_period_end = new Date(
            periodEnd * 1000
          ).toISOString();
        }

        const { error: updateError } = await supabase
          .from("tenants")
          .update(updateFields)
          .eq("stripe_customer_id", customerId);

        if (updateError) {
          console.error("Failed to update tenant after invoice.paid:", updateError);
          return NextResponse.json({ error: "Database update failed" }, { status: 500 });
        }

        console.log(`✅ Tenant (customer: ${customerId}) invoice paid — counters reset`);
        break;
      }

      // -------------------------------------------------------------------
      // invoice.payment_failed
      // -------------------------------------------------------------------
      // A recurring invoice payment failed.  Stripe will retry automatically
      // based on the dashboard retry schedule.  We log the failure for
      // monitoring but do NOT suspend immediately — the tenant retains access
      // during the grace period.  If the final retry fails, a
      // customer.subscription.deleted event will fire and our existing handler
      // will downgrade them.
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const attemptCount = invoice.attempt_count ?? 1;
        const nextAttempt = invoice.next_payment_attempt
          ? new Date(invoice.next_payment_attempt * 1000).toISOString()
          : "none";

        // For logging / alerting — you can route this to your observability
        // platform (Sentry, DataDog, etc.) in production.
        console.warn(
          `⚠️ Tenant (customer: ${customerId}) payment FAILED` +
            ` — attempt ${attemptCount}, next retry: ${nextAttempt}`
        );

        // If it's the final attempt (next_payment_attempt is null), the
        // subscription will be canceled soon.  We proactively flag them.
        if (!invoice.next_payment_attempt) {
          console.warn(
            `⚠️ Tenant (customer: ${customerId}) — no more retries, ` +
              `subscription will be canceled`
          );
        }

        break;
      }

      default:
        console.log(`ℹ️ Unhandled Stripe event type: ${event.type}`);
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

