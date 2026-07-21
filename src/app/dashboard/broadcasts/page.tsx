import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BroadcastsClient } from "./broadcasts-client";

export default async function BroadcastsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch campaigns, templates, and unique tags for the tenant (RLS scopes all)
  const [campaignsRes, templatesRes, contactsRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("*, template:template_id(id, name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("whatsapp_templates")
      .select("id, name, category, status, body")
      .eq("status", "approved")
      .order("name"),
    supabase
      .from("contacts")
      .select("tags"),
  ]);

  if (campaignsRes.error) console.error("Failed to fetch campaigns:", campaignsRes.error);
  if (templatesRes.error) console.error("Failed to fetch templates:", templatesRes.error);

  // Collect all unique tags from contacts
  const allTags = Array.from(
    new Set((contactsRes.data ?? []).flatMap((c) => c.tags))
  ).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Broadcasts</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage broadcast campaigns to your contacts.
          </p>
        </div>
      </div>

      <BroadcastsClient
        campaigns={campaignsRes.data ?? []}
        templates={templatesRes.data ?? []}
        availableTags={allTags}
      />
    </div>
  );
}
