"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  CreditCard,
  Settings,
  ShieldCheck,
  Bot,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

const clientLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/contacts", label: "Contacts", icon: Users },
  { href: "/dashboard/broadcasts", label: "Broadcasts", icon: Megaphone },
  { href: "/dashboard/chatbot", label: "AI Chatbot", icon: Bot },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function SidebarNav({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const pathname = usePathname();

  const links = isSuperAdmin
    ? [
        ...clientLinks,
        { href: "/admin", label: "Admin Panel", icon: ShieldCheck },
      ]
    : clientLinks;

  return (
    <nav className="flex flex-col gap-1 px-3">
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
