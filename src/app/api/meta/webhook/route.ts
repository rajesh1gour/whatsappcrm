import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";
import { getOpenAIClient } from "@/lib/openai/client";

const META_API_VERSION =
  process.env.NEXT_PUBLIC_META_GRAPH_API_VERSION ?? "v21.0";
const META_GRAPH_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
const OPENAI_MODEL = "gpt-4o-mini";

// ---------------------------------------------------------------------------
// POST payload type shapes (only the fields we care about)
// ---------------------------------------------------------------------------
interface WebhookEntry {
  id: string; // WABA ID
  changes: Array<{
    field: string;
    value: {
      messaging_product: string;
      metadata: {
        display_phone_number: string;
        phone_number_id: string;
      };
      contacts?: Array<{
        profile: { name: string };
        wa_id: string; // sender's phone number
      }>;
      messages?: Array<{
        from: string;
        id: string; // WAMID
        timestamp: string;
        type: string;
        text?: { body: string };
        image?: { id: string; mime_type?: string; sha256?: string };
        audio?: { id: string; mime_type?: string };
        video?: { id: string; mime_type?: string };
        document?: { id: string; mime_type?: string; filename?: string };
        interactive?: {
          type: string;
          button_reply?: { id: string; title: string };
          list_reply?: { id: string; title: string };
        };
        button?: { payload: string; text: string };
      }>;
      statuses?: Array<{
        id: string; // WAMID of the original outbound message
        recipient_id: string;
        status: "sent" | "delivered" | "read" | "failed";
        timestamp: string;
        conversation?: { id: string; origin?: { type?: string } };
        pricing?: { billable: boolean; pricing_model: string };
        errors?: Array<{ code: number; title: string; message?: string }>;
      }>;
    };
  }>;
}

/**
 * GET /api/meta/webhook
 *
 * Meta webhook verification handshake.
 * Meta sends:
 *   ?hub.mode=subscribe
 *   &hub.verify_token=<your_verify_token>
 *   &hub.challenge=<random_challenge>
 *
 * We must echo back hub.challenge with a 200 status.
 */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === "subscribe" && token === expectedToken && challenge) {
    console.log("✅ Meta webhook verified");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn("❌ Meta webhook verification failed", { mode, token });
  return new NextResponse("Verification failed", { status: 403 });
}

/**
 * POST /api/meta/webhook
 *
 * Receives WhatsApp webhook events from Meta.
 *
 * Handled:
 *   - inbound text / interactive / button messages → creates contact &
 *     message records, upserts conversation
 *   - message status updates ("sent", "delivered", "read", "failed") →
 *     updates the messages table
 *
 * Security: validates X-Hub-Signature-256 before processing.
 * Idempotency: checks if a WAMID has already been processed.
 */
export async function POST(request: NextRequest) {
  // 1. Verify the HMAC signature
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifySignature(rawBody, signature)) {
    console.error("❌ Invalid X-Hub-Signature-256");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // 2. Parse the payload
  let payload: { entry?: WebhookEntry[] };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.entry?.length) {
    return NextResponse.json({ received: true });
  }

  // 3. Process each entry (one per WABA that sent the event)
  const admin = createAdminClient();

  for (const entry of payload.entry) {
    // Find the tenant by their WABA ID
    const { data: connections } = await admin
      .from("whatsapp_connections")
      .select("id, tenant_id, phone_number_id")
      .eq("waba_id", entry.id)
      .limit(1);

    const connection = connections?.[0];
    if (!connection) {
      console.warn(`⚠️ No tenant found for WABA ${entry.id} — skipping`);
      continue;
    }

    for (const change of entry.changes) {
      if (change.field !== "messages") continue;

      const value = change.value;

      // ---------------------------------------------------------------
      // Inbound messages
      // ---------------------------------------------------------------
      if (value.messages?.length) {
        for (const msg of value.messages) {
          // Idempotency: skip if we already have this WAMID
          const { count } = await admin
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("wamid", msg.id);

          if (count && count > 0) {
            continue;
          }

          const senderWaId = msg.from;
          const contactName =
            value.contacts?.find((c) => c.wa_id === senderWaId)?.profile
              ?.name ?? null;

          // Upsert the contact (create if first time, update name)
          const { data: contact, error: contactError } = await admin
            .from("contacts")
            .upsert(
              {
                tenant_id: connection.tenant_id,
                phone_number: senderWaId,
                name: contactName,
                opt_in_status: "opted_in",
                opt_in_at: new Date().toISOString(),
              },
              {
                onConflict: "tenant_id,phone_number",
                ignoreDuplicates: false,
              }
            )
            .select("id")
            .single();

          if (contactError || !contact) {
            console.error("Failed to upsert contact:", contactError);
            continue;
          }

          // Check if a conversation already exists for this contact
          const { data: existingConversation } = await admin
            .from("conversations")
            .select("id, unread_count")
            .eq("tenant_id", connection.tenant_id)
            .eq("contact_id", contact.id)
            .maybeSingle();

          let conversationId: string | null = null;

          if (existingConversation) {
            // Increment unread count atomically
            conversationId = existingConversation.id;
            await admin
              .from("conversations")
              .update({
                unread_count: existingConversation.unread_count + 1,
                last_message_at: new Date().toISOString(),
              })
              .eq("id", existingConversation.id);
          } else {
            // Create a new conversation
            const { data: newConversation } = await admin
              .from("conversations")
              .insert({
                tenant_id: connection.tenant_id,
                contact_id: contact.id,
                mode: "ai",
                unread_count: 1,
                last_message_at: new Date().toISOString(),
              })
              .select("id")
              .single();

            conversationId = newConversation?.id ?? null;
          }

          // Extract message body from the appropriate field
          const body = extractMessageBody(msg);

          // Insert the message
          const { error: msgError } = await admin
            .from("messages")
            .insert({
              tenant_id: connection.tenant_id,
              contact_id: contact.id,
              conversation_id: conversationId,
              direction: "inbound",
              status: "delivered",
              body,
              message_type: msg.type,
              wamid: msg.id,
              created_at: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
              status_updated_at: new Date().toISOString(),
            });

          if (msgError) {
            console.error("Failed to insert inbound message:", msgError);
            continue;
          }

          // ──────────────────────────────────────────────────────────
          // AI Chatbot Reply — trigger for any message with a body
          // ──────────────────────────────────────────────────────────
          if (body && conversationId) {
            await handleAiReply({
              admin,
              tenantId: connection.tenant_id,
              connectionId: connection.id,
              contactId: contact.id,
              conversationId,
              incomingMessage: body,
              senderWaId,
            });
          }
        }
      }

      // ---------------------------------------------------------------
      // Outbound message status updates
      // ---------------------------------------------------------------
      if (value.statuses?.length) {
        for (const status of value.statuses) {
          const updateFields: Record<string, unknown> = {
            status: status.status,
            status_updated_at: new Date().toISOString(),
          };

          if (status.status === "failed" && status.errors?.length) {
            updateFields.error_code = String(status.errors[0].code);
            updateFields.error_message = status.errors[0].title;
          }

          const { error: updateError } = await admin
            .from("messages")
            .update(updateFields)
            .eq("wamid", status.id);

          if (updateError) {
            console.error(
              `Failed to update message status for WAMID ${status.id}:`,
              updateError
            );
          } else {
            console.log(
              `📬 Message ${status.id} → ${status.status}`
            );
          }
        }
      }
    }
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validates the X-Hub-Signature-256 header against the raw request body
 * using the Meta App Secret.
 */
function verifySignature(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) return false;

  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.warn("META_APP_SECRET is not set — skipping signature validation");
    return true; // allow in dev
  }

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  const sig = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  if (sig.length !== expected.length) return false;

  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

/**
 * Extracts the message body text from a webhook message object based on its type.
 */
function extractMessageBody(msg: {
  type: string;
  text?: { body: string };
  image?: Record<string, unknown>;
  audio?: Record<string, unknown>;
  video?: Record<string, unknown>;
  document?: { filename?: string };
  interactive?: {
    button_reply?: { title: string };
    list_reply?: { title: string };
  };
  button?: { text: string };
}): string | null {
  switch (msg.type) {
    case "text":
      return msg.text?.body ?? null;
    case "interactive": {
      const btn = msg.interactive?.button_reply;
      const list = msg.interactive?.list_reply;
      return btn?.title ?? list?.title ?? null;
    }
    case "button":
      return msg.button?.text ?? null;
    case "image":
      return "[Image]";
    case "audio":
      return "[Audio]";
    case "video":
      return "[Video]";
    case "document":
      return msg.document?.filename
        ? `[Document: ${msg.document.filename}]`
        : "[Document]";
    default:
      return `[${msg.type}]`;
  }
}

// ---------------------------------------------------------------------------
// AI Chatbot Helpers
// ---------------------------------------------------------------------------

interface AiReplyParams {
  admin: ReturnType<typeof createAdminClient>;
  tenantId: string;
  connectionId: string;
  contactId: string;
  conversationId: string;
  incomingMessage: string;
  senderWaId: string;
}

/**
 * Handles the AI chatbot reply flow for an incoming text message.
 *
 * 1. Fetches the tenant's chatbot config
 * 2. Checks for human-handoff keywords → sets conversation mode to 'human'
 * 3. If chatbot is enabled & conversation is in 'ai' mode:
 *    - Fetches conversation history (last 10 messages)
 *    - Calls OpenAI Chat Completions
 *    - Sends the reply via the Meta WhatsApp Cloud API
 *    - Saves the outbound AI message
 */
async function handleAiReply({
  admin,
  tenantId,
  connectionId,
  contactId,
  conversationId,
  incomingMessage,
  senderWaId,
}: AiReplyParams): Promise<void> {
  try {
    // 1. Fetch chatbot config
    const { data: chatbotConfig } = await admin
      .from("chatbot_configs")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!chatbotConfig?.enabled) {
      return; // Chatbot is disabled for this tenant
    }

    // 2. Fetch the current conversation to check its mode
    const { data: conversation } = await admin
      .from("conversations")
      .select("mode")
      .eq("id", conversationId)
      .maybeSingle();

    if (!conversation) return;

    // If conversation is already in 'human' mode, don't trigger the AI
    if (conversation.mode === "human" || conversation.mode === "closed") {
      return;
    }

    // 3. Check for human-handoff keywords
    const keywords = chatbotConfig.handoff_keywords ?? [
      "human",
      "agent",
      "support",
    ];
    const messageLower = incomingMessage.toLowerCase().trim();
    const matchedKeyword = keywords.find((kw: string) =>
      messageLower.includes(kw.toLowerCase())
    );

    if (matchedKeyword) {
      console.log(
        `🤝 Handoff keyword "${matchedKeyword}" detected — switching conversation ${conversationId} to human mode`
      );

      // Set conversation mode to 'human' so future messages skip the AI
      await admin
        .from("conversations")
        .update({ mode: "human", updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      return;
    }

    // 4. Ensure conversation is in 'ai' mode before replying
    //    (it should already be, but just to be safe)
    if (conversation.mode !== "ai") return;

    // 5. Count existing AI replies in this conversation
    const { count: aiReplyCount } = await admin
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("sent_by_ai", true);

    const maxReplies = chatbotConfig.max_ai_replies_per_conversation ?? 10;
    if (aiReplyCount && aiReplyCount >= maxReplies) {
      console.log(
        `⚠️ Max AI replies (${maxReplies}) reached for conversation ${conversationId} — switching to human mode`
      );

      await admin
        .from("conversations")
        .update({ mode: "human", updated_at: new Date().toISOString() })
        .eq("id", conversationId);

      // Optionally send a notification to the customer that they'll
      // be connected to a human agent
      await sendWaText({
        admin,
        tenantId,
        connectionId,
        contactId,
        conversationId,
        to: senderWaId,
        body:
          "You've reached the message limit for our AI assistant. A human agent will follow up shortly. Thank you for your patience! 🙏",
        sentByAi: true,
      });

      return;
    }

    // 6. Fetch the last 10 messages for conversation history
    const { data: recentMessages } = await admin
      .from("messages")
      .select("direction, body, created_at, sent_by_ai")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Build the conversation history for OpenAI (oldest first)
    const history = (recentMessages ?? []).reverse().map((m) => ({
      role: m.direction === "inbound" ? ("user" as const) : ("assistant" as const),
      content: m.body ?? "",
    }));

    // 7. Build the system prompt from chatbot config
    const systemPrompt = buildSystemPrompt(chatbotConfig);

    // 8. Call OpenAI
    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const replyText = completion.choices?.[0]?.message?.content;

    if (!replyText) {
      console.error("OpenAI returned an empty response");
      return;
    }

    // 9. Send the AI reply via the Meta WhatsApp Cloud API
    await sendWaText({
      admin,
      tenantId,
      connectionId,
      contactId,
      conversationId,
      to: `${senderWaId}`,
      body: replyText,
      sentByAi: true,
    });

    console.log(`🤖 AI reply sent to ${senderWaId}`);
  } catch (error) {
    console.error("AI chatbot error:", error);
    // Don't re-throw — a failure to reply should not crash the webhook
  }
}

// ---------------------------------------------------------------------------
// System Prompt Builder
// ---------------------------------------------------------------------------

/**
 * Builds the system prompt from the chatbot config stored in the database.
 *
 * Priority:
 *   1. If the user has set a custom `system_prompt`, use it directly.
 *   2. Otherwise, build one from `business_description`, `tone`, etc.
 */
function buildSystemPrompt(config: {
  system_prompt: string | null;
  business_description: string | null;
  tone: string | null;
  handoff_keywords: string[] | null;
}): string {
  // 1. Use a custom system_prompt if the user set one
  if (config.system_prompt?.trim()) {
    return config.system_prompt.trim();
  }

  // 2. Fall back to building from structured fields
  const desc = config.business_description?.trim() ?? "";
  const tone = config.tone?.trim() ?? "friendly";
  const keywords = config.handoff_keywords ?? ["human", "agent", "support"];

  const parts: string[] = [
    `You are a helpful AI assistant for a business.`,
  ];

  if (desc) {
    parts.push(`\nBusiness context:\n${desc}`);
  }

  parts.push(
    `\nTone: ${tone}. Keep responses concise, friendly, and helpful.`,
    `You are having a WhatsApp conversation with a customer.`,
    `Keep your responses under 400 words.`,
    `Do not use markdown formatting. Use plain text only.`,
    `If the customer asks to speak to a human, acknowledges they want human assistance,`,
    `or types any of these keywords: ${keywords.join(", ")}`,
    `you should politely let them know you're transferring them to a human agent.`
  );

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// WhatsApp Message Sender
// ---------------------------------------------------------------------------

interface SendWaTextParams {
  admin: ReturnType<typeof createAdminClient>;
  tenantId: string;
  connectionId: string;
  contactId: string;
  conversationId: string;
  to: string;
  body: string;
  sentByAi: boolean;
}

/**
 * Sends a text message via the Meta WhatsApp Cloud API and records it in the
 * messages table.
 */
async function sendWaText({
  admin,
  tenantId,
  connectionId,
  contactId,
  conversationId,
  to,
  body,
  sentByAi,
}: SendWaTextParams): Promise<void> {
  // 1. Fetch the WhatsApp credentials for this connection
  const { data: credentials } = await admin
    .from("whatsapp_credentials")
    .select("access_token")
    .eq("connection_id", connectionId)
    .maybeSingle();

  if (!credentials?.access_token) {
    console.error(
      `No WhatsApp credentials found for connection ${connectionId} — cannot send reply`
    );
    return;
  }

  // 2. Fetch the phone_number_id from the connection
  const { data: connection } = await admin
    .from("whatsapp_connections")
    .select("phone_number_id")
    .eq("id", connectionId)
    .maybeSingle();

  if (!connection?.phone_number_id) {
    console.error(
      `No phone_number_id for connection ${connectionId} — cannot send reply`
    );
    return;
  }

  // 3. Send the message via the Meta API
  const sendUrl = `${META_GRAPH_BASE}/${connection.phone_number_id}/messages`;

  try {
    const res = await fetch(sendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body },
      }),
    });

    const data = await res.json();

    if (res.ok && data.messages?.[0]?.id) {
      const wamid: string = data.messages[0].id;

      // Record the outbound message
      const { error: insertError } = await admin.from("messages").insert({
        tenant_id: tenantId,
        contact_id: contactId,
        conversation_id: conversationId,
        direction: "outbound",
        status: "sent",
        body,
        message_type: "text",
        wamid,
        sent_by_ai: sentByAi,
        created_at: new Date().toISOString(),
        status_updated_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error("Failed to record outbound AI message:", insertError);
      }
    } else {
      console.error("Meta API send failed:", data);
    }
  } catch (error) {
    console.error("Failed to send WhatsApp message:", error);
  }
}

