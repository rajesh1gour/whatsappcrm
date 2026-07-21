import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const META_GRAPH_BASE = "https://graph.facebook.com/v21.0";

/**
 * POST /api/campaigns/send
 *
 * Sends a broadcast campaign by iterating over the target contacts and
 * sending the selected WhatsApp template via the Meta API.
 *
 * Body: { campaignId: string }
 *
 * Security:
 *   - User must be authenticated
 *   - Campaign must belong to the user's tenant (RLS enforced)
 *   - Tenant must have a connected WhatsApp Business Account
 *   - Admin client used to read credentials (no RLS) and to write messages
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get the user's tenant
    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    // 3. Parse request body
    const { campaignId } = await request.json();
    if (!campaignId) {
      return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
    }

    // 4. Fetch the campaign (RLS ensures it belongs to this tenant)
    const { data: campaign, error: campError } = await supabase
      .from("campaigns")
      .select("*, template:template_id(id, name, body, category)")
      .eq("id", campaignId)
      .single();

    if (campError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status !== "draft" && campaign.status !== "failed" && campaign.status !== "cancelled") {
      return NextResponse.json(
        { error: `Cannot send campaign with status "${campaign.status}"` },
        { status: 400 }
      );
    }

    if (!campaign.template) {
      return NextResponse.json({ error: "Campaign has no template" }, { status: 400 });
    }

    // 5. Fetch the tenant's WhatsApp connection and credentials
    const admin = createAdminClient();

    const { data: connection } = await admin
      .from("whatsapp_connections")
      .select("id, phone_number_id, waba_id")
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "connected")
      .maybeSingle();

    if (!connection) {
      return NextResponse.json(
        { error: "No WhatsApp Business Account connected. Connect one in Settings first." },
        { status: 400 }
      );
    }

    const { data: credentials } = await admin
      .from("whatsapp_credentials")
      .select("access_token")
      .eq("connection_id", connection.id)
      .maybeSingle();

    if (!credentials?.access_token) {
      return NextResponse.json(
        { error: "WhatsApp access token not found. Reconnect your account." },
        { status: 400 }
      );
    }

    // Capture narrowed values for the inner function closures
    const accessToken = credentials.access_token;
    const tenantId = profile!.tenant_id;
    const templateName = campaign.template!.name;
    const templateBody = campaign.template!.body;

    // 6. Find the target contacts
    let query = admin
      .from("contacts")
      .select("id, phone_number, name")
      .eq("tenant_id", profile.tenant_id)
      .eq("opt_in_status", "opted_in");

    if (campaign.target_tags && campaign.target_tags.length > 0) {
      // Use overlaps (&& operator) so contacts matching ANY tag are included
      query = query.overlaps("tags", campaign.target_tags);
    }

    const { data: contacts, error: contactsError } = await query;

    if (contactsError || !contacts?.length) {
      return NextResponse.json(
        { error: "No opted-in contacts match the campaign audience" },
        { status: 400 }
      );
    }

    // 7. Mark campaign as "sending" and set audience size
    const now = new Date().toISOString();
    await admin
      .from("campaigns")
      .update({
        status: "sending",
        audience_size: contacts.length,
        started_at: now,
        sent_count: 0,
        delivered_count: 0,
        read_count: 0,
        failed_count: 0,
      })
      .eq("id", campaignId);

    // 8. Send the template message to each contact via Meta API.
    //    We send in batches of 20 to avoid overwhelming Meta's rate limits.
    const sendUrl = `${META_GRAPH_BASE}/${connection.phone_number_id}/messages`;
    const BATCH_SIZE = 20;

    async function sendOne(contact: { id: string; phone_number: string }) {
      try {
        const res = await fetch(sendUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: contact.phone_number,
            type: "template",
            template: {
              name: templateName,
              language: { code: "en" },
            },
          }),
        });

        const data = await res.json();

        if (res.ok && data.messages?.[0]?.id) {
          const wamid: string = data.messages[0].id;

          await admin.from("messages").insert({
            tenant_id: tenantId,
            contact_id: contact.id,
            campaign_id: campaignId,
            direction: "outbound",
            status: "queued",
            body: templateBody,
            message_type: "template",
            wamid,
            sent_by_ai: false,
          });

          return { ok: true as const };
        } else {
          console.error(`Failed to send to ${contact.phone_number}:`, data);
          await admin.from("messages").insert({
            tenant_id: tenantId,
            contact_id: contact.id,
            campaign_id: campaignId,
            direction: "outbound",
            status: "failed",
            body: templateBody,
            message_type: "template",
            sent_by_ai: false,
            error_message: data.error?.message ?? "API error",
          });
          return { ok: false as const };
        }
      } catch (err) {
        console.error(`Network error sending to ${contact.phone_number}:`, err);
        return { ok: false as const };
      }
    }

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(sendOne));

      for (const result of results) {
        if (result.status === "fulfilled" && result.value.ok) {
          sent++;
        } else {
          failed++;
        }
      }
    }

    // 9. Update campaign counters
    const finalStatus = failed > 0 && sent === 0 ? "failed" : "sending";
    await admin
      .from("campaigns")
      .update({
        sent_count: sent,
        failed_count: failed,
        status: finalStatus,
        ...(finalStatus === "failed" ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq("id", campaignId);

    // 10. Increment the tenant's message_count
    const { data: tenant } = await admin
      .from("tenants")
      .select("message_count")
      .eq("id", tenantId)
      .single();

    const newCount = (tenant?.message_count ?? 0) + sent;
    await admin
      .from("tenants")
      .update({ message_count: newCount })
      .eq("id", tenantId);

    console.log(
      `✅ Campaign ${campaignId}: ${sent} sent, ${failed} failed (${contacts.length} total)`
    );

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: contacts.length,
    });
  } catch (error) {
    console.error("Send campaign error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send campaign" },
      { status: 500 }
    );
  }
}
