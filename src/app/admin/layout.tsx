import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShieldCheck, LayoutDashboard, Building2, FileText } from "lucide-react";
import Link from "next/link";

const adminLinks = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/tenants",
    label: "Tenants",
    icon: Building2,
  },
  {
    href: "/admin/templates",
    label: "Template Moderation",
    icon: FileText,
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh">
      {/* ── Admin Sidebar ──────────────────────────────────────── */}
      <aside className="flex w-64 shrink-0 flex-col bg-zinc-950 text-white">
        <div className="flex items-center gap-2 px-6 py-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-amber-600">
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <span className="text-sm font-semibold tracking-tight">
              Admin Panel
            </span>
            <p className="text-[10px] leading-tight text-zinc-500">
              WhatsApp CRM SaaS
            </p>
          </div>
        </div>

        <div className="px-6 pb-4">
          <p className="truncate text-xs text-zinc-500">Platform Owner</p>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {adminLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-white"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-zinc-800 p-4">
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-medium">
              {profile.full_name ?? profile.email}
            </p>
            <p className="truncate text-xs text-zinc-500">{profile.email}</p>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-white"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-muted/30 p-8">{children}</main>
    </div>
  );
}
