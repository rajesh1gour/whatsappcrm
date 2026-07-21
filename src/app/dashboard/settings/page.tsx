import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WhatsAppSetup } from "./whatsapp-setup";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the user's profile and tenant details
  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  // Fetch the WhatsApp connection if one exists (RLS allows reads for
  // the tenant's own connection)
  const { data: connection } = await supabase
    .from("whatsapp_connections")
    .select("*")
    .eq("tenant_id", profile.tenant_id)
    .maybeSingle();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and WhatsApp integration.
        </p>
      </div>

      {/* ── WhatsApp Connection ──────────────────────────────────── */}
      <WhatsAppSetup
        tenantId={profile.tenant_id}
        connection={
          connection
            ? {
                id: connection.id,
                wabaId: connection.waba_id,
                phoneNumberId: connection.phone_number_id,
                displayPhoneNumber: connection.display_phone_number,
                verifiedName: connection.verified_name,
                qualityRating: connection.quality_rating,
                status: connection.status,
                connectedAt: connection.connected_at,
              }
            : null
        }
      />
    </div>
  );
}
