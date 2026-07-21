import { redirect } from "next/navigation";
import { MessageCircle, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // getUser() re-validates the JWT against Supabase — never trust getSession()
  // alone in server code.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name, email, tenant_id, tenants ( name, status )")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Auth user exists but profile row is missing (trigger not applied?)
    redirect("/login?error=profile_missing");
  }

  const tenant = Array.isArray(profile.tenants)
    ? profile.tenants[0]
    : profile.tenants;

  // Suspended tenants are locked out of the app (Super Admin control)
  if (profile.role === "client" && tenant?.status === "suspended") {
    await supabase.auth.signOut();
    redirect("/login?error=account_suspended");
  }

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="flex w-64 shrink-0 flex-col bg-zinc-950 text-white">
        <div className="flex items-center gap-2 px-6 py-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600">
            <MessageCircle className="size-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            WhatsApp CRM
          </span>
        </div>

        <div className="px-6 pb-4">
          <p className="truncate text-xs text-zinc-500">
            {profile.role === "super_admin"
              ? "Platform Owner"
              : tenant?.name ?? "—"}
          </p>
        </div>

        <SidebarNav isSuperAdmin={profile.role === "super_admin"} />

        <div className="mt-auto border-t border-zinc-800 p-4">
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-medium">
              {profile.full_name ?? profile.email}
            </p>
            <p className="truncate text-xs text-zinc-500">{profile.email}</p>
          </div>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <LogOut className="size-4" />
              Log out
            </Button>
          </form>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-muted/30 p-8">{children}</main>
    </div>
  );
}
