import { MessageCircle } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description:
    "How WhatsApp CRM collects, uses, and protects your data. Compliant with Meta App Review requirements.",
};

const sections = [
  {
    id: "introduction",
    title: "1. Introduction",
    content: (
      <p>
        Welcome to WhatsApp CRM ("we," "our," or "us"). We are committed to
        protecting your personal data and respecting your privacy. This Privacy
        Policy explains how we collect, use, disclose, and safeguard your
        information when you use our multi-tenant SaaS platform that integrates
        with the WhatsApp Business API.
      </p>
    ),
  },
  {
    id: "information-we-collect",
    title: "2. Information We Collect",
    content: (
      <div className="space-y-3">
        <p>We collect the following categories of information:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Account Information:</strong> When you sign up, we collect
            your name, email address, company name, and password.
          </li>
          <li>
            <strong>Billing Information:</strong> We collect payment data
            processed securely through Stripe, including your billing address
            and payment method tokens. We do not store full credit card
            numbers.
          </li>
          <li>
            <strong>WhatsApp Business Data:</strong> With your authorization, we
            access your WhatsApp Business Account via the Meta APIs, including:
            <ul className="list-disc pl-6 mt-2">
              <li>Inbound and outbound message content</li>
              <li>Contact phone numbers and profile names</li>
              <li>Message delivery status and quality ratings</li>
              <li>Business phone number information</li>
            </ul>
          </li>
          <li>
            <strong>Contact Data:</strong> You may upload contact lists
            containing phone numbers, names, and custom attributes for your
            WhatsApp marketing and support operations.
          </li>
          <li>
            <strong>Usage Data:</strong> We collect information about how you
            interact with our platform, including features used, message
            volumes, and session activity.
          </li>
          <li>
            <strong>Technical Data:</strong> IP address, browser type, device
            information, and cookies (as described in our Cookie Policy).
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "how-we-use-information",
    title: "3. How We Use Your Information",
    content: (
      <div className="space-y-3">
        <p>We use the collected information for the following purposes:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Service Delivery:</strong> To operate, maintain, and
            provide the features of our WhatsApp CRM platform, including
            sending and receiving messages, managing contacts, and powering
            the AI chatbot.
          </li>
          <li>
            <strong>Billing:</strong> To process subscriptions, invoices, and
            payments through Stripe.
          </li>
          <li>
            <strong>Support:</strong> To respond to your inquiries, provide
            technical support, and resolve issues.
          </li>
          <li>
            <strong>Improvement:</strong> To analyze usage patterns and
            improve our platform&apos;s functionality, performance, and user
            experience.
          </li>
          <li>
            <strong>Compliance:</strong> To comply with legal obligations,
            enforce our Terms of Service, and protect our rights.
          </li>
          <li>
            <strong>AI Processing:</strong> Message content sent to the AI
            chatbot is processed through OpenAI&apos;s API to generate
            automated replies. This data is handled in accordance with
            OpenAI&apos;s privacy commitments.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "data-sharing",
    title: "4. How We Share Your Data",
    content: (
      <div className="space-y-3">
        <p>We share your data only with the following third-party service providers who help us deliver the platform:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Meta (WhatsApp):</strong> Message content and contact
            information are shared with Meta through the WhatsApp Cloud API to
            facilitate message delivery. This is governed by Meta&apos;s
            Terms of Service and Privacy Policy.
          </li>
          <li>
            <strong>Stripe:</strong> Payment information is transmitted to
            Stripe for subscription billing. We never store full credit card
            details on our servers.
          </li>
          <li>
            <strong>OpenAI:</strong> If the AI chatbot feature is enabled,
            message content may be sent to OpenAI for generating automated
            replies. OpenAI does not use API data for training unless
            explicitly opted in.
          </li>
          <li>
            <strong>Supabase:</strong> Our database and authentication
            infrastructure is hosted on Supabase. Data is encrypted at rest
            and in transit.
          </li>
          <li>
            <strong>Vercel:</strong> Our application is hosted on Vercel&apos;s
            serverless platform.
          </li>
        </ul>
        <p className="mt-4">
          We do <strong>not</strong> sell your personal data to third parties.
          We do <strong>not</strong> use your customers&apos; WhatsApp data for
          any purpose other than delivering the messaging service you have
          subscribed to.
        </p>
      </div>
    ),
  },
  {
    id: "data-retention",
    title: "5. Data Retention",
    content: (
      <div className="space-y-3">
        <p>We retain your data for the following periods:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Account Data:</strong> Retained for as long as your
            account is active, plus 90 days after cancellation.
          </li>
          <li>
            <strong>Message Data:</strong> Retained for the duration of your
            subscription. Upon cancellation, message history is preserved in
            read-only mode for 90 days, then permanently deleted.
          </li>
          <li>
            <strong>Contact Data:</strong> Retained until you delete the
            contact or cancel your account.
          </li>
          <li>
            <strong>Usage Records:</strong> Aggregated and anonymized usage
            data may be retained for analytics purposes beyond account
            termination.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "your-rights",
    title: "6. Your Rights",
    content: (
      <div className="space-y-3">
        <p>
          Depending on your jurisdiction (including under GDPR and CCPA), you
          may have the following rights:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Access:</strong> Request a copy of the personal data we
            hold about you.
          </li>
          <li>
            <strong>Rectification:</strong> Request correction of inaccurate
            or incomplete data.
          </li>
          <li>
            <strong>Deletion:</strong> Request deletion of your data,
            subject to legal retention requirements.
          </li>
          <li>
            <strong>Portability:</strong> Request a machine-readable export of
            your data.
          </li>
          <li>
            <strong>Objection:</strong> Object to the processing of your data
            for certain purposes.
          </li>
          <li>
            <strong>Withdraw Consent:</strong> Withdraw consent at any time
            where processing is based on consent.
          </li>
        </ul>
        <p className="mt-2">
          To exercise any of these rights, please contact us at the email
          address below. We will respond within 30 days.
        </p>
      </div>
    ),
  },
  {
    id: "data-security",
    title: "7. Data Security",
    content: (
      <div className="space-y-3">
        <p>
          We implement appropriate technical and organizational measures to
          protect your data, including:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Encryption at rest using AES-256</li>
          <li>Encryption in transit via TLS 1.3</li>
          <li>Row Level Security (RLS) to enforce tenant isolation</li>
          <li>Service-role authentication restricted to server-side code</li>
          <li>Regular security audits and dependency scanning</li>
          <li>Access controls limiting internal staff access to production
            data</li>
        </ul>
      </div>
    ),
  },
  {
    id: "cookies",
    title: "8. Cookies",
    content: (
      <p>
        We use essential cookies required for authentication and session
        management via Supabase Auth. These are necessary for the platform to
        function. We do not use tracking or advertising cookies. For more
        details, please see our Cookie Policy.
      </p>
    ),
  },
  {
    id: "children",
    title: "9. Children&apos;s Privacy",
    content: (
      <p>
        Our platform is not intended for individuals under the age of 18. We
        do not knowingly collect personal data from children. If you believe
        we have inadvertently collected data from a child, please contact us
        immediately so we can delete it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "10. Changes to This Policy",
    content: (
      <p>
        We may update this Privacy Policy from time to time. Material changes
        will be communicated via email or through a notice on our platform.
        Continued use of the platform after changes constitutes acceptance
        of the updated policy.
      </p>
    ),
  },
  {
    id: "contact",
    title: "11. Contact Us",
    content: (
      <div className="space-y-2">
        <p>
          If you have any questions, concerns, or requests regarding this
          Privacy Policy, please contact us:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Email:</strong>{" "}
            <a href="mailto:rajeshgour047@gmail.com" className="text-emerald-600 hover:underline dark:text-emerald-400">
              rajeshgour047@gmail.com
            </a>
          </li>
          <li>
            <strong>Company:</strong> RajTechLabs
          </li>
          <li>
            <strong>Mailing Address:</strong> Hailakandi, Assam, India
          </li>
        </ul>
        <p className="mt-2 text-sm text-muted-foreground">
          <em>
            Last updated: {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </em>
        </p>
      </div>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-svh bg-muted/30">
      {/* ── Header ───────────────────────────────────────*/}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <MessageCircle className="size-5" />
          </div>
          <div className="flex-1">
            <Link href="/" className="text-sm font-semibold tracking-tight hover:text-emerald-600 transition-colors">
              WhatsApp CRM
            </Link>
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────*/}
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
          {/* Title */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              This Privacy Policy describes how WhatsApp CRM collects, uses,
              processes, and protects your personal data when you use our
              WhatsApp Business API integration platform. It reflects our
              commitment to data protection and transparency.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.id} id={section.id}>
                <h2 className="text-xl font-semibold tracking-tight mb-3">
                  {section.title}
                </h2>
                <div className="text-sm leading-relaxed text-muted-foreground">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────*/}
      <footer className="border-t bg-background">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 px-4 py-6 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p>&copy; {new Date().getFullYear()} WhatsApp CRM. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
