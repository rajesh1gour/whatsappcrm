"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MessageCircle,
  Bot,
  Send,
  Users,
  BarChart3,
  Shield,
  Zap,
  Check,
  ArrowRight,
  Star,
  Menu,
} from "lucide-react";
import { FadeIn, SlideUp } from "@/components/animations";
import MobileDrawer from "@/components/mobile-drawer";

const features = [
  {
    icon: Bot,
    title: "AI Chatbot",
    description:
      "Automate customer conversations with an intelligent AI chatbot that understands context, handles handoffs, and learns from every interaction.",
  },
  {
    icon: Send,
    title: "Broadcast Campaigns",
    description:
      "Send WhatsApp template messages to thousands of contacts with a single click. Target by tags, track delivery, and measure engagement.",
  },
  {
    icon: Users,
    title: "Multi-Agent Inbox",
    description:
      "Manage all conversations in one place. Assign agents, switch between AI and human modes, and never miss a message.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    description:
      "Track message volumes, delivery rates, AI reply counts, and usage patterns. Make data-driven decisions for your business.",
  },
  {
    icon: Shield,
    title: "Tenant Isolation",
    description:
      "Enterprise-grade security with Row Level Security. Every tenant's data is fully isolated — your customers' data stays private.",
  },
  {
    icon: Zap,
    title: "Contact Management",
    description:
      "Import contacts via CSV, organize with tags, track opt-in status, and segment your audience for targeted campaigns.",
  },
];

const stats = [
  { value: "99.9%", label: "Uptime SLA" },
  { value: "< 2s", label: "AI Response Time" },
  { value: "50K+", label: "Messages Daily" },
  { value: "256-bit", label: "Encryption" },
];

const steps = [
  {
    number: "01",
    title: "Connect WhatsApp",
    description:
      "Link your WhatsApp Business Account in minutes using Meta's Embedded Signup — no developer work required.",
  },
  {
    number: "02",
    title: "Import Contacts",
    description:
      "Upload your contact list via CSV or add manually. Tag and segment your audience for targeted messaging.",
  },
  {
    number: "03",
    title: "Start Messaging",
    description:
      "Reply to customers, set up your AI chatbot, or launch broadcast campaigns — all from one dashboard.",
  },
];

const plans = [
  {
    name: "Basic",
    price: "$49",
    description: "For small businesses getting started.",
    features: [
      "1,000 messages/month",
      "500 contacts",
      "Basic analytics",
      "Email support",
    ],
    highlighted: false,
  },
  {
    name: "Standard",
    price: "$99",
    description: "For growing teams that need more power.",
    features: [
      "5,000 messages/month",
      "5,000 contacts",
      "Advanced analytics",
      "AI chatbot",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    name: "Premium",
    price: "$249",
    description: "For high-volume enterprises.",
    features: [
      "20,000 messages/month",
      "Unlimited contacts",
      "Real-time analytics",
      "Advanced AI chatbot",
      "Dedicated account manager",
    ],
    highlighted: false,
  },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-svh">
      {/* ── Header ───────────────────────────────────────*/}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <MessageCircle className="size-5" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-semibold tracking-tight">
              WhatsApp CRM
            </span>
          </div>

          {/* Desktop nav — hidden on mobile */}
          <nav className="hidden items-center gap-4 text-sm sm:flex">
            <a
              href="#features"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </a>
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Get started
              <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </nav>

          {/* Mobile hamburger — visible on small screens */}
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-drawer"
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors sm:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* ── Main Content ─────────────────────────────────*/}
      <main>

      {/* ── Hero ─────────────────────────────────────────*/}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-emerald-50/50 to-background dark:from-emerald-950/10">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <FadeIn delay={0}>
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                <Star className="size-3" />
                Multi-tenant WhatsApp CRM for modern businesses
              </div>
            </FadeIn>
            <FadeIn delay={100}>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Manage WhatsApp Conversations
                <span className="block text-emerald-600">at Scale</span>
              </h1>
            </FadeIn>
            <FadeIn delay={200}>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground max-w-2xl mx-auto">
                AI-powered chatbot, multi-agent inbox, broadcast campaigns, and
                subscription billing — all in one platform. Connect your
                WhatsApp Business Account and start growing today.
              </p>
            </FadeIn>
            <FadeIn delay={300}>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  Start free trial
                  <ArrowRight className="size-4" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border bg-background px-6 text-sm font-medium shadow-sm hover:bg-muted transition-colors"
                >
                  See features
                </a>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────*/}
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((stat, i) => (
              <FadeIn key={stat.label} delay={i * 100}>
                <div className="text-center">
                  <p className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────*/}
      <section id="features" className="border-b py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <SlideUp>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything you need to
                <span className="text-emerald-600"> grow on WhatsApp</span>
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                From AI automation to broadcast campaigns, our platform gives you
                the tools to manage WhatsApp at scale.
              </p>
            </div>
          </SlideUp>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <FadeIn key={feature.title} delay={i * 100}>
                <div className="group rounded-xl border bg-card p-6 transition-shadow hover:shadow-lg">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <feature.icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────*/}
      <section className="border-b bg-muted/30 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <SlideUp>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Get started in
                <span className="text-emerald-600"> 3 simple steps</span>
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                No technical expertise needed. Connect, import, and start
                messaging in minutes.
              </p>
            </div>
          </SlideUp>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <FadeIn key={step.number} delay={i * 120}>
                <div className="relative text-center">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {step.number}
                  </div>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────*/}
      <section id="pricing" className="border-b py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <SlideUp>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Simple, transparent
                <span className="text-emerald-600"> pricing</span>
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Choose the plan that fits your business. Upgrade or downgrade
                anytime.
              </p>
            </div>
          </SlideUp>
          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {plans.map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 120}>
                <div
                  className={`relative flex flex-col rounded-xl border bg-card p-6 transition-shadow hover:shadow-lg ${
                    plan.highlighted
                      ? "border-emerald-200 ring-1 ring-emerald-300 dark:border-emerald-800 dark:ring-emerald-700"
                      : ""
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold tracking-tight">
                        {plan.price}
                      </span>
                      <span className="ml-1 text-sm text-muted-foreground">
                        /month
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>
                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-6 inline-flex h-10 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      plan.highlighted
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "border bg-background hover:bg-muted"
                    }`}
                  >
                    Get started
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────*/}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <SlideUp>
            <div className="mx-auto max-w-2xl rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 px-8 py-16 text-center text-white sm:px-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to transform your WhatsApp communication?
              </h2>
              <p className="mt-4 leading-relaxed text-emerald-100">
                Join thousands of businesses using WhatsApp CRM to automate
                support, engage customers, and drive growth.
              </p>
              <Link
                href="/signup"
                className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-medium text-emerald-800 shadow-sm hover:bg-emerald-50 transition-colors"
              >
                Get started free
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </SlideUp>
        </div>
      </section>

      </main>

      {/* ── Footer ───────────────────────────────────────*/}
      <FadeIn>
        <footer className="border-t bg-muted/30">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex size-7 items-center justify-center rounded-md bg-emerald-600 text-white">
                <MessageCircle className="size-4" />
              </div>
              <span className="font-semibold">WhatsApp CRM</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link
                href="/privacy"
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/login"
                className="hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} RajTechLabs. All rights reserved.
            </p>
          </div>
        </footer>
      </FadeIn>
    </div>
  );
}
