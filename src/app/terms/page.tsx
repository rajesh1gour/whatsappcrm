import { MessageCircle } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service",
  description:
    "Terms and conditions for using WhatsApp CRM — a multi-tenant SaaS platform integrating with the WhatsApp Business API.",
};

const sections = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    content: (
      <p>
        By accessing or using WhatsApp CRM ("the Platform," "we," "our," or
        "us"), you agree to be bound by these Terms of Service ("Terms"). If
        you do not agree to all of these Terms, you may not access or use the
        Platform. These Terms apply to all visitors, users, and customers who
        register for an account.
      </p>
    ),
  },
  {
    id: "description",
    title: "2. Description of Service",
    content: (
      <div className="space-y-3">
        <p>
          WhatsApp CRM is a multi-tenant SaaS platform that integrates with the
          Meta WhatsApp Cloud API to provide businesses with:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Inbound and outbound WhatsApp messaging</li>
          <li>Contact management and CSV import</li>
          <li>AI-powered chatbot automation</li>
          <li>Broadcast campaign management using WhatsApp templates</li>
          <li>Multi-agent inbox with human handoff</li>
          <li>Usage analytics and reporting</li>
        </ul>
        <p>
          The Platform is provided on a subscription basis with tiered pricing
          plans as described on our billing page.
        </p>
      </div>
    ),
  },
  {
    id: "accounts",
    title: "3. User Accounts & Registration",
    content: (
      <div className="space-y-3">
        <p>To use the Platform, you must register for an account. You agree to:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Provide accurate, current, and complete account information
            (including your legal business name, email address, and company
            name).
          </li>
          <li>
            Maintain and promptly update your account information to keep it
            accurate.
          </li>
          <li>
            Maintain the confidentiality of your login credentials and accept
            responsibility for all activity under your account.
          </li>
          <li>
            Notify us immediately of any unauthorized use of your account or
            any other security breach.
          </li>
          <li>
            Be at least 18 years of age and have the legal authority to enter
            into these Terms on behalf of your business.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "subscriptions",
    title: "4. Subscriptions & Billing",
    content: (
      <div className="space-y-3">
        <p>
          Subscription fees are billed in advance on a monthly basis through
          our payment processor, Stripe.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Plan Tiers:</strong> We offer Basic, Standard, and Premium
            plans with varying message limits and feature sets. Details are
            available on our billing page.
          </li>
          <li>
            <strong>Payment Method:</strong> A valid credit card is required to
            subscribe. By providing your payment information, you authorize us
            to charge the applicable subscription fees automatically each
            billing period.
          </li>
          <li>
            <strong>Message Limits:</strong> Each plan has a monthly message
            cap. Usage exceeding the cap will be processed according to the
            terms of your specific plan or may result in a temporary pause of
            outbound messaging until the next billing period.
          </li>
          <li>
            <strong>Upgrades & Downgrades:</strong> You may upgrade or
            downgrade your plan at any time. Upgrades take effect immediately
            and you will be charged the prorated difference. Downgrades take
            effect at the start of the next billing period.
          </li>
          <li>
            <strong>Cancellation:</strong> You may cancel your subscription at
            any time through the billing page or by contacting support.
            Cancellation takes effect at the end of the current billing period.
            After cancellation, your account will be downgraded to a
            read-only/canceled state for 90 days, after which data will be
            permanently deleted.
          </li>
          <li>
            <strong>Non-Payment:</strong> If payment fails, we will retry
            according to Stripe's automated retry schedule. Continued
            non-payment will result in account suspension and eventual
            cancellation.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "acceptable-use",
    title: "5. Acceptable Use Policy",
    content: (
      <div className="space-y-3">
        <p>You agree not to use the Platform for any unlawful purpose or in violation of these Terms. Prohibited activities include:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Sending unsolicited messages or spam in violation of WhatsApp's
            Business Messaging Policy and applicable anti-spam laws.
          </li>
          <li>
            Using the Platform to transmit any harmful, fraudulent, deceptive,
            or illegal content.
          </li>
          <li>
            Attempting to bypass usage limits, access other tenants' data, or
            compromise the security of the Platform.
          </li>
          <li>
            Using the Platform in violation of Meta's{" "}
            <a
              href="https://www.whatsapp.com/legal/business-policy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 hover:underline dark:text-emerald-400"
            >
              WhatsApp Business Messaging Policy
            </a>
            , including sending marketing messages without opt-in consent from
            recipients.
          </li>
          <li>
            Reverse-engineering, decompiling, or attempting to extract the
            source code of the Platform.
          </li>
          <li>
            Using automated scripts, bots, or scrapers to access the Platform
            except through the provided APIs.
          </li>
        </ul>
        <p className="mt-2">
          We reserve the right to suspend or terminate accounts that violate
          this Acceptable Use Policy without notice.
        </p>
      </div>
    ),
  },
  {
    id: "whatsapp-compliance",
    title: "6. WhatsApp & Meta Compliance",
    content: (
      <div className="space-y-3">
        <p>
          As a Platform integrating with the WhatsApp Business API, you agree
          to comply with all applicable Meta policies:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Opt-In Requirement:</strong> You must obtain explicit,
            documented opt-in consent from each contact before sending
            messages via the Platform. Proof of opt-in must be maintained and
            provided upon request.
          </li>
          <li>
            <strong>Message Templates:</strong> Broadcast campaigns must use
            pre-approved WhatsApp message templates. You are responsible for
            ensuring template content complies with Meta's template guidelines.
          </li>
          <li>
            <strong>24-Hour Service Window:</strong> Free-form replies to
            customer-initiated conversations are permitted within the 24-hour
            customer service window. Marketing messages outside this window
            require pre-approved templates.
          </li>
          <li>
            <strong>Quality Rating:</strong> You are responsible for
            maintaining a good WhatsApp Business Account quality rating. Low
            quality ratings resulting from your messaging practices may result
            in messaging restrictions imposed by Meta.
          </li>
          <li>
            <strong>Indemnification:</strong> You agree to indemnify and hold
            us harmless from any penalties, restrictions, or damages resulting
            from your violation of Meta's policies.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "data-processing",
    title: "7. Data Processing & GDPR",
    content: (
      <div className="space-y-3">
        <p>
          To the extent we process personal data on your behalf, we act as a
          data processor and you act as a data controller. Our data processing
          practices are governed by our{" "}
          <Link
            href="/privacy"
            className="text-emerald-600 hover:underline dark:text-emerald-400"
          >
            Privacy Policy
          </Link>{" "}
          and the following commitments:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            We process personal data only in accordance with your documented
            instructions (as expressed through your use of the Platform) and as
            required by applicable law.
          </li>
          <li>
            We implement appropriate technical and organizational measures to
            protect personal data, including encryption at rest (AES-256) and
            in transit (TLS 1.3), tenant isolation via Row Level Security, and
            access controls.
          </li>
          <li>
            We maintain a list of sub-processors (Stripe, OpenAI, Supabase,
            Vercel, Meta) who may access personal data for the purposes of
            delivering the Platform. We contractually require each
            sub-processor to maintain equivalent data protection standards.
          </li>
          <li>
            Upon termination of your account, we will delete or return all
            personal data in accordance with our retention policy, subject to
            legal requirements.
          </li>
          <li>
            We will notify you without undue delay of any data breach
            involving your personal data.
          </li>
          <li>
            We will assist you in responding to data subject access requests
            under the GDPR, CCPA, and similar regulations.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "intellectual-property",
    title: "8. Intellectual Property",
    content: (
      <div className="space-y-3">
        <p>
          <strong>Our IP:</strong> The Platform, including its source code,
          design, branding, and content, is owned by us and protected by
          intellectual property laws. You are granted a limited,
          non-exclusive, non-transferable license to use the Platform during
          the term of your subscription.
        </p>
        <p>
          <strong>Your IP:</strong> You retain all rights to your business
          data, contact lists, message content, and any custom configurations
          you create while using the Platform. We claim no ownership over your
          data.
        </p>
        <p>
          <strong>Feedback:</strong> Any suggestions, feature requests, or
          feedback you provide may be used by us without obligation to you.
        </p>
      </div>
    ),
  },
  {
    id: "limitation-liability",
    title: "9. Limitation of Liability",
    content: (
      <div className="space-y-3">
        <p>
          To the maximum extent permitted by applicable law:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            The Platform is provided &quot;as is&quot; and &quot;as
            available&quot; without warranties of any kind, either express or
            implied, including but not limited to warranties of
            merchantability, fitness for a particular purpose, or
            non-infringement.
          </li>
          <li>
            We do not warrant that the Platform will be uninterrupted,
            error-free, secure, or free from viruses or other harmful
            components.
          </li>
          <li>
            In no event shall our total liability to you for all claims
            arising from or relating to these Terms or your use of the
            Platform exceed the total amount paid by you to us in the twelve
            (12) months preceding the event giving rise to the claim.
          </li>
          <li>
            We shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages, including but not limited to
            loss of profits, data, business, or goodwill, even if advised of
            the possibility of such damages.
          </li>
          <li>
            We are not liable for any downtime, data loss, or service
            disruption caused by third-party services (Meta, Stripe, OpenAI,
            Supabase, Vercel) on which the Platform relies.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "indemnification",
    title: "10. Indemnification",
    content: (
      <p>
        You agree to indemnify, defend, and hold harmless WhatsApp CRM, its
        officers, directors, employees, and agents from and against any and
        all claims, liabilities, damages, losses, costs, expenses, or fees
        (including reasonable attorneys' fees) arising from or relating to:
        (a) your use of the Platform in violation of these Terms; (b) your
        violation of Meta's WhatsApp Business Messaging Policy; (c) your
        violation of any applicable law or regulation; or (d) your content or
        data submitted through the Platform.
      </p>
    ),
  },
  {
    id: "termination",
    title: "11. Termination",
    content: (
      <div className="space-y-3">
        <p>
          Either party may terminate these Terms as follows:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>By You:</strong> You may terminate your account at any
            time by canceling your subscription through the billing page or
            contacting support.
          </li>
          <li>
            <strong>By Us:</strong> We may suspend or terminate your access to
            the Platform immediately without notice if: (a) you breach any
            provision of these Terms; (b) your account is used in violation of
            Meta's policies; (c) your payment is delinquent; or (d) we are
            required to do so by law.
          </li>
          <li>
            <strong>Effect of Termination:</strong> Upon termination, your
            right to access the Platform ceases immediately. Your data will be
            retained for 90 days in read-only/exportable form, after which it
            will be permanently deleted.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "changes-to-terms",
    title: "12. Changes to These Terms",
    content: (
      <p>
        We reserve the right to modify these Terms at any time. Material
        changes will be communicated via email to the account holder and/or
        through a notice on the Platform. Your continued use of the Platform
        after the effective date of the changes constitutes acceptance of the
        updated Terms. If you do not agree to the changes, you may terminate
        your account before the changes take effect.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "13. Governing Law",
    content: (
      <p>
        These Terms shall be governed by and construed in accordance with the
        laws of Assam, India, without regard to its conflict of law
        provisions. Any disputes arising from these Terms shall be resolved
        exclusively in the courts of Hailakandi, Assam, India.
      </p>
    ),
  },
  {
    id: "contact",
    title: "14. Contact Information",
    content: (
      <div className="space-y-2">
        <p>
          For questions, complaints, or notices regarding these Terms, please
          contact us:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Email:</strong>{" "}
            <a
              href="mailto:rajeshgour047@gmail.com"
              className="text-emerald-600 hover:underline dark:text-emerald-400"
            >
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
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
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

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-svh bg-muted/30">
      {/* ── Header ───────────────────────────────────────*/}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <MessageCircle className="size-5" />
          </div>
          <div className="flex-1">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight hover:text-emerald-600 transition-colors"
            >
              WhatsApp CRM
            </Link>
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link
              href="/login"
              className="hover:text-foreground transition-colors"
            >
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
              Terms of Service
            </h1>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              These Terms of Service govern your use of the WhatsApp CRM
              platform, including all features, APIs, and associated services.
              Please read them carefully before creating an account or using
              the Platform.
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
          </div>
        </div>
      </footer>
    </div>
  );
}
