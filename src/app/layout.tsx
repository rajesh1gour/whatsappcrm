import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "WhatsApp CRM — Multi-Tenant SaaS",
    template: "%s — WhatsApp CRM",
  },
  description:
    "A multi-tenant WhatsApp CRM platform with AI chatbot, broadcast campaigns, and subscription billing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
