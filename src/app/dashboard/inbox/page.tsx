import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Inbox } from "lucide-react";
import { InboxClient } from "./inbox-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Thread {
  conversationId: string;
  contactId: string;
  contactName: string | null;
  phoneNumber: string;
  mode: "ai" | "human" | "closed";
  unreadCount: number;
  lastMessage: string | null;
  lastMessageDirection: string | null;
  lastMessageAt: string | null;
}

// ---------------------------------------------------------------------------
// Server Component
// ---------------------------------------------------------------------------

export default async function InboxPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) redirect("/login");

  // Use admin client to read conversations across the tenant
  const admin = createAdminClient();

  // Fetch all conversations for this tenant with contact info
  const { data: conversations, error: convError } = await admin
    .from("conversations")
    .select(`
      id,
      mode,
      unread_count,
      last_message_at,
      contact:contact_id ( id, name, phone_number )
    `)
    .eq("tenant_id", profile.tenant_id)
    .order("last_message_at", { ascending: false });

  if (convError) {
    console.error("Failed to fetch conversations:", convError);
  }

  // Fetch the most recent message body for each conversation
  // We do this by getting all conversation IDs and fetching their latest message
  const conversationIds = (conversations ?? []).map((c) => c.id);

  let latestMessages: Map<string, { body: string | null; direction: string }> =
    new Map();

  if (conversationIds.length > 0) {
    // Optimisation: fetch the last message per conversation via a single
    // window-function approach: get all messages for these conversations,
    // ordered by created_at desc, then pick the first per conversation_id
    const { data: msgs } = await admin
      .from("messages")
      .select("conversation_id, body, direction, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false });

    if (msgs) {
      // Deduplicate: keep only the first (most recent) message per conversation
      const seen = new Set<string>();
      for (const msg of msgs) {
        if (!seen.has(msg.conversation_id)) {
          seen.add(msg.conversation_id);
          latestMessages.set(msg.conversation_id, {
            body: msg.body,
            direction: msg.direction,
          });
        }
      }
    }
  }

  // Build thread list
  const threads: Thread[] = (conversations ?? []).map((c) => {
    const contact = Array.isArray(c.contact) ? c.contact[0] : c.contact;
    const latest = latestMessages.get(c.id);

    return {
      conversationId: c.id,
      contactId: contact?.id ?? "",
      contactName: contact?.name ?? null,
      phoneNumber: contact?.phone_number ?? "",
      mode: c.mode,
      unreadCount: c.unread_count,
      lastMessage: latest?.body ?? null,
      lastMessageDirection: latest?.direction ?? null,
      lastMessageAt: c.last_message_at,
    };
  });

  return (
    <div className="h-[calc(100vh-4rem)] -m-8">
      <InboxClient
        threads={threads}
        tenantId={profile.tenant_id}
      />
    </div>
  );
}
