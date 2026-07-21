import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { Building2, PauseCircle, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

async function suspendTenant(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    throw new Error("Forbidden");
  }

  const tenantId = formData.get("tenantId") as string;
  if (!tenantId) throw new Error("Missing tenantId");

  const admin = createAdminClient();
  await admin.from("tenants").update({ status: "suspended" }).eq("id", tenantId);

  revalidatePath("/admin/tenants");
}

async function activateTenant(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    throw new Error("Forbidden");
  }

  const tenantId = formData.get("tenantId") as string;
  if (!tenantId) throw new Error("Missing tenantId");

  const admin = createAdminClient();
  await admin.from("tenants").update({ status: "active" }).eq("id", tenantId);

  revalidatePath("/admin/tenants");
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default async function AdminTenantsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "super_admin") {
    redirect("/dashboard");
  }

  const admin = createAdminClient();

  const { data: tenants, error } = await admin
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch tenants:", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <Building2 className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tenant Management
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage all tenants on the platform.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Tenants</CardTitle>
          <CardDescription>
            {tenants?.length ?? 0} tenant{(tenants?.length ?? 0) !== 1 ? "s" : ""}{" "}
            registered.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {tenants && tenants.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Messages Sent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => {
                  const tierLabel = tenant.subscription_tier
                    ? tenant.subscription_tier.charAt(0).toUpperCase() +
                      tenant.subscription_tier.slice(1)
                    : "No plan";

                  return (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">
                        {tenant.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tenant.subscription_tier === "premium" ||
                            tenant.subscription_tier === "standard"
                              ? "default"
                              : tenant.subscription_tier === "basic"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {tierLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {tenant.message_count.toLocaleString()}
                        {tenant.monthly_message_limit > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {" "}
                            / {tenant.monthly_message_limit.toLocaleString()}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tenant.status} />
                      </TableCell>
                      <TableCell>
                        {tenant.status === "active" ? (
                          <form action={suspendTenant}>
                            <input
                              type="hidden"
                              name="tenantId"
                              value={tenant.id}
                            />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-muted-foreground hover:text-amber-600"
                            >
                              <PauseCircle className="size-4" />
                              Suspend
                            </Button>
                          </form>
                        ) : tenant.status === "suspended" ? (
                          <form action={activateTenant}>
                            <input
                              type="hidden"
                              name="tenantId"
                              value={tenant.id}
                            />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-muted-foreground hover:text-emerald-600"
                            >
                              <PlayCircle className="size-4" />
                              Activate
                            </Button>
                          </form>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Building2 className="size-8 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium">No tenants yet</p>
                <p className="text-xs text-muted-foreground">
                  Tenants will appear here once they sign up.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StatusBadge({
  status,
}: {
  status: "active" | "suspended" | "cancelled";
}) {
  const map: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    active: { label: "Active", variant: "default" },
    suspended: { label: "Suspended", variant: "destructive" },
    cancelled: { label: "Cancelled", variant: "outline" },
  };
  const { label, variant } = map[status] ?? {
    label: status,
    variant: "outline" as const,
  };
  return <Badge variant={variant}>{label}</Badge>;
}
