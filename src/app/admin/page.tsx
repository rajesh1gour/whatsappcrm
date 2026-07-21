import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  Building2,
  TrendingUp,
  MessageSquare,
  DollarSign,
  PiggyBank,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Meta WhatsApp API estimated cost per conversation (industry standard)
const META_COST_PER_CONVERSATION = 0.025;

// Plan prices for MRR calculation
const TIER_PRICES: Record<string, number> = {
  basic: 49,
  standard: 99,
  premium: 249,
};

export default async function AdminOverviewPage() {
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

  // ── 1. Total Tenants ──────────────────────────────────────────
  const { count: totalTenants } = await admin
    .from("tenants")
    .select("*", { count: "exact", head: true });

  const { count: activeTenants } = await admin
    .from("tenants")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  // ── 2. All tenants for MRR calculation ────────────────────────
  const { data: allTenants } = await admin
    .from("tenants")
    .select("subscription_tier, status, message_count");

  // ── 3. Total messages across all tenants ──────────────────────
  const { count: totalMessages } = await admin
    .from("messages")
    .select("*", { count: "exact", head: true });

  // ── 4. Calculate metrics ──────────────────────────────────────
  const mrr =
    allTenants?.reduce((sum, t) => {
      if (
        t.status === "active" &&
        t.subscription_tier &&
        TIER_PRICES[t.subscription_tier]
      ) {
        return sum + TIER_PRICES[t.subscription_tier];
      }
      return sum;
    }, 0) ?? 0;

  const totalMsgs = totalMessages ?? 0;
  const estimatedApiCost = totalMsgs * META_COST_PER_CONVERSATION;
  const estimatedProfit = mrr - estimatedApiCost;
  const profitMargin =
    mrr > 0 ? ((estimatedProfit / mrr) * 100).toFixed(1) : "0.0";

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(n);

  const stats = [
    {
      title: "Total Tenants",
      value: (totalTenants ?? 0).toLocaleString(),
      sub: `${activeTenants ?? 0} active on the platform`,
      icon: Building2,
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    },
    {
      title: "Monthly Recurring Revenue",
      value: fmtCurrency(mrr),
      sub: "from active subscriptions",
      icon: TrendingUp,
      color:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
    {
      title: "Total Messages Sent",
      value: totalMsgs.toLocaleString(),
      sub: "across all tenants (all time)",
      icon: MessageSquare,
      color:
        "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    },
    {
      title: "Estimated API Cost",
      value: fmtCurrency(estimatedApiCost),
      sub: `$${META_COST_PER_CONVERSATION} per conversation × ${totalMsgs.toLocaleString()} messages`,
      icon: DollarSign,
      color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
    {
      title: "Estimated Profit",
      value: fmtCurrency(estimatedProfit),
      sub: `${profitMargin}% margin`,
      icon: PiggyBank,
      color:
        estimatedProfit >= 0
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    },
    {
      title: "Avg Revenue per Tenant",
      value: totalTenants && totalTenants > 0 ? fmtCurrency(mrr / totalTenants) : "$0.00",
      sub: `${activeTenants} paying / ${totalTenants} total`,
      icon: Users,
      color:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide profitability and usage metrics.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ title, value, sub, icon: Icon, color }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <div className={`flex size-8 items-center justify-center rounded-lg ${color}`}>
                <Icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
