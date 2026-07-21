import { Users, Send, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();

  // RLS scopes every one of these queries to the logged-in user's tenant.
  const [contactsRes, messagesRes, tenantRes] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true }),
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("direction", "outbound"),
    supabase
      .from("tenants")
      .select("subscription_tier, message_count, monthly_message_limit")
      .maybeSingle(),
  ]);

  const tenant = tenantRes.data;
  const plan = tenant?.subscription_tier
    ? tenant.subscription_tier.charAt(0).toUpperCase() +
      tenant.subscription_tier.slice(1)
    : "No plan yet";

  const stats = [
    {
      title: "Total Contacts",
      value: (contactsRes.count ?? 0).toLocaleString(),
      sub: "in your CRM",
      icon: Users,
    },
    {
      title: "Messages Sent",
      value: (messagesRes.count ?? 0).toLocaleString(),
      sub: tenant
        ? `${tenant.message_count} / ${tenant.monthly_message_limit || "∞"} this period`
        : "this period",
      icon: Send,
    },
    {
      title: "Active Plan",
      value: plan,
      sub: "manage in Settings → Billing",
      icon: CreditCard,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your WhatsApp CRM activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map(({ title, value, sub, icon: Icon }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
