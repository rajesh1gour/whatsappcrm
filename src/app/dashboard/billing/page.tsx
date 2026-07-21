"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------
// Price IDs come from environment variables so they can differ per environment
// (development / staging / production).  Create one Price per plan in your
// Stripe dashboard, then copy the price_xxxxx IDs here.
const PLANS = [
  {
    name: "Basic",
    price: "$49",
    description: "Perfect for small businesses getting started with WhatsApp CRM.",
    features: [
      "Up to 1,000 messages per month",
      "Up to 500 contacts",
      "Basic analytics dashboard",
      "Email support",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID ?? "",
    highlighted: false,
  },
  {
    name: "Standard",
    price: "$99",
    description: "For growing teams that need more power and automation.",
    features: [
      "Up to 5,000 messages per month",
      "Up to 5,000 contacts",
      "Advanced analytics & reporting",
      "AI chatbot integration",
      "Priority email support",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID ?? "",
    highlighted: true,
  },
  {
    name: "Premium",
    price: "$249",
    description: "For large enterprises with high-volume messaging needs.",
    features: [
      "Up to 20,000 messages per month",
      "Unlimited contacts",
      "Real-time analytics dashboard",
      "Advanced AI chatbot",
      "Custom integrations & webhooks",
      "Dedicated account manager",
    ],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID ?? "",
    highlighted: false,
  },
];

// ---------------------------------------------------------------------------
// Inner component (needs Suspense because it uses useSearchParams)
// ---------------------------------------------------------------------------
function BillingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);

  // Show one-time feedback when returning from Stripe Checkout
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      toast.success("Subscription successful! Welcome aboard.");
      // Clean up the URL without a full page reload
      router.replace("/dashboard/billing");
    } else if (canceled === "true") {
      toast.error("Checkout was canceled. No charges were made.");
      router.replace("/dashboard/billing");
    }
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubscribe(planName: string, priceId: string) {
    if (!priceId) {
      toast.error(
        "This plan is not yet configured. Please set the Stripe Price ID in your environment variables."
      );
      return;
    }

    setLoading(planName);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, planName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      // Redirect the user to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to start checkout. Please try again."
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Choose the plan that fits your business. Upgrade or downgrade anytime
          — changes take effect immediately.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            className={`relative flex flex-col transition-shadow duration-200 hover:shadow-lg ${
              plan.highlighted
                ? "border-primary/50 shadow-md ring-1 ring-primary/20"
                : ""
            }`}
          >
            {/* "Most Popular" badge */}
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                  Most Popular
                </span>
              </div>
            )}

            <CardHeader className="text-center">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-4xl font-bold tracking-tight">
                  {plan.price}
                </span>
                <span className="ml-1 text-sm text-muted-foreground">
                  /month
                </span>
              </div>
              <CardDescription className="mt-2">
                {plan.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Check className="size-3 text-primary" />
                    </span>
                    <span className="text-sm leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                variant={plan.highlighted ? "default" : "outline"}
                disabled={loading !== null}
                onClick={() => handleSubscribe(plan.name, plan.priceId)}
              >
                {loading === plan.name ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  "Subscribe"
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default export — wrapped in Suspense because useSearchParams requires it
// ---------------------------------------------------------------------------
export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}
