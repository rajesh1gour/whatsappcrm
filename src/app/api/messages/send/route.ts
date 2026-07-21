import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const META_API_VERSION =
  process.env.NEXT_PUBLIC_META_GRAPH_API_VERSION ?? "v21.0";
const META_GRAPH_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

/**
 * POST /api/messages/send
 *
 * Sends a text message to a contact via the Meta WhatsApp Cloud API and
 * records the outbound message in the database.
 *
 * Body:
 * {
 *   contactId: string,   // The contact's UUID in our DB
 *   tenantId?: string,   // (Optional — derived from auth if not provided)
 *   body: string          // The message text to send
 * }
 *
 * Security:
 *   - User must be authenticated
 *   - The contact must belong to the user's tenant (RLS enforced)
 *   - Uses admin client (service_role) to read credentials and write
 *     the outbound message
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

    // 3. Parse and validate body
    const body = await request.json();
    const {
      contactId,
      body: messageBody,
    } = body;

    if (!contactId || typeof contactId !== "string") {
      return NextResponse.json(
        { error: "contactId is required" },
        { status: 400 }
      );
    }

    if (!messageBody || typeof messageBody !== "string" || !messageBody.trim()) {
      return NextResponse.json(
        { error: "body is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    // 4. Verify the contact belongs to this tenant
    const admin = createAdminClient();

    const { data: contact, error: contactError } = await admin
      .from("contacts")
      .select("id, phone_number")
      .eq("id", contactId)
      .eq("tenant_id", profile.tenant_id)
      .single();

    if (contactError || !contact) {
      return NextResponse.json(
        { error: "Contact not found or does not belong to your tenant" },
        { status: 404 }
      );
    }

    // 5. Fetch the tenant's WhatsApp connection and credentials
    const { data: connection } = await admin
      .from("whatsapp_connections")
      .select("id, phone_number_id")
      .eq("tenant_id", profile.tenant_id)
      .eq("status", "connected")
      .maybeSingle();

    if (!connection) {
      return NextResponse.json(
        {
          error:
            "No WhatsApp Business Account connected. Set one up in Settings first.",
        },
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

    // 6. Find or create the conversation for this contact
    const { data: existingConversation } = await admin
      .from("conversations")
      .select("id")
      .eq("tenant_id", profile.tenant_id)
      .eq("contact_id", contact.id)
      .maybeSingle();

    let conversationId: string | null = existingConversation?.id ?? null;

    if (!conversationId) {
      const { data: newConversation } = await admin
        .from("conversations")
        .insert({
          tenant_id: profile.tenant_id,
          contact_id: contact.id,
          mode: "human",
          unread_count: 0,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      conversationId = newConversation?.id ?? null;
    } else {
      // Update conversation's last_message_at
      await admin
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          unread_count: 0, // Reset unread when agent views/sends
        })
        .eq("id", conversationId);
    }

    // 7. Send the message via the Meta WhatsApp Cloud API
    const sendUrl = `${META_GRAPH_BASE}/${connection.phone_number_id}/messages`;

    const metaRes = await fetch(sendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: contact.phone_number,
        type: "text",
        text: { preview_url: false, body: messageBody.trim() },
      }),
    });

    const metaData = await metaRes.json();

    let wamid: string | null = null;
    let messageStatus: string;

    if (metaRes.ok && metaData.messages?.[0]?.id) {
      wamid = metaData.messages[0].id;
      messageStatus = "sent";
    } else {
      console.error("Meta API send failed:", metaData);
      messageStatus = "failed";
    }

    // 8. Record the outbound message in the database
    const { data: insertedMessage, error: insertError } = await admin
      .from("messages")
      .insert({
        tenant_id: profile.tenant_id,
        contact_id: contact.id,
        conversation_id: conversationId,
        direction: "outbound",
        status: messageStatus,
        body: messageBody.trim(),
        message_type: "text",
        wamid,
        sent_by_ai: false,
        created_at: new Date().toISOString(),
        status_updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to record outbound message:", insertError);
    }

    // 9. If the message failed, we still return the error but the message
    //    is recorded in the DB with status "failed"
    if (messageStatus === "failed") {
      return NextResponse.json(
        {
          error: metaData.error?.message ?? "Failed to send WhatsApp message",
          messageId: insertedMessage?.id ?? null,
        },
        { status: 502 }
      );
    }

    console.log(
      `📤 Manual reply sent to ${contact.phone_number} (WAMID: ${wamid})`
    );

    return NextResponse.json({
      success: true,
      messageId: insertedMessage?.id ?? null,
      wamid,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send message",
      },
      { status: 500 }
    );
  }
}
