import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for the authenticated user's tenant.
 * Body: { priceId: string, planName: string }
 * Returns: { url: string } — redirect the user to this Stripe Checkout page.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the user via Supabase session cookie
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch the user's tenant_id from the users table
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      console.error("Profile lookup failed:", profileError);
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 400 }
      );
    }

    // 3. Parse the request body
    const { priceId, planName } = await request.json();

    if (!priceId || !planName) {
      return NextResponse.json(
        { error: "Missing required fields: priceId and planName" },
        { status: 400 }
      );
    }

    // 4. Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      // The tenant id is placed in both client_reference_id and metadata so the
      // webhook can reliably identify which tenant to update.
      client_reference_id: profile.tenant_id,
      customer_email: user.email ?? undefined,
      metadata: {
        tenant_id: profile.tenant_id,
        plan_name: planName,
        user_id: user.id,
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${request.nextUrl.origin}/dashboard/billing?success=true`,
      cancel_url: `${request.nextUrl.origin}/dashboard/billing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
