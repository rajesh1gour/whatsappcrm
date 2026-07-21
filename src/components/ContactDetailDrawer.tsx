"use client";

import { useState, useEffect } from "react";
import {
  MessageCircle,
  Loader2,
  Inbox,
  Send,
  Clock,
  CheckCheck,
  XCircle,
  Bot,
  Eye,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Contact {
  id: string;
  name: string | null;
  phone_number: string;
  tags: string[];
  opt_in_status: "opted_in" | "opted_out" | "unknown";
  created_at: string | null;
}

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  body: string | null;
  message_type: string;
  sent_by_ai: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  mode: "ai" | "human" | "closed";
  last_message_at: string | null;
  unread_count: number;
}

interface ContactDetailDrawerProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusIcon(status: Message["status"]) {
  switch (status) {
    case "queued":
      return <Clock className="size-3.5 text-muted-foreground" />;
    case "sent":
      return <Send className="size-3.5 text-blue-500" />;
    case "delivered":
      return <CheckCheck className="size-3.5 text-emerald-500" />;
    case "read":
      return <Eye className="size-3.5 text-emerald-600" />;
    case "failed":
      return <XCircle className="size-3.5 text-destructive" />;
  }
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContactDetailDrawer({
  contact,
  open,
  onOpenChange,
}: ContactDetailDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !contact) return;

    let ignore = false;
    const contactId = contact.id;

    async function load() {
      setLoading(true);
      try {
        const supabase = createClient();

        const [convoRes, msgsRes] = await Promise.all([
          supabase
            .from("conversations")
            .select("id, mode, last_message_at, unread_count")
            .eq("contact_id", contactId)
            .maybeSingle(),
          supabase
            .from("messages")
            .select("id, direction, status, body, message_type, sent_by_ai, created_at")
            .eq("contact_id", contactId)
            .order("created_at", { ascending: true }),
        ]);

        if (ignore) return;
        if (convoRes.data) setConversation(convoRes.data);
        if (msgsRes.data) setMessages(msgsRes.data);
      } catch (error) {
        if (!ignore) {
          console.error("Failed to fetch conversation data:", error);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [open, contact?.id]);

  const optInBadge = (status: Contact["opt_in_status"]) => {
    const map: Record<Contact["opt_in_status"], { label: string; variant: "default" | "destructive" | "outline" }> = {
      opted_in: { label: "Opted in", variant: "default" },
      opted_out: { label: "Opted out", variant: "destructive" },
      unknown: { label: "Unknown", variant: "outline" },
    };
    const entry = map[status];
    return <Badge variant={entry.variant}>{entry.label}</Badge>;
  };

  const modeBadge = (mode: Conversation["mode"]) => {
    const map: Record<Conversation["mode"], { label: string; variant: "default" | "secondary" | "outline" }> = {
      ai: { label: "AI Mode", variant: "default" },
      human: { label: "Human", variant: "secondary" },
      closed: { label: "Closed", variant: "outline" },
    };
    const entry = map[mode];
    return <Badge variant={entry.variant}>{entry.label}</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        {contact && (
          <>
            {/* ── Header ─────────────────────────────────────────── */}
            <SheetHeader className="pb-0">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate text-lg">
                    {contact.name || "Unnamed Contact"}
                  </SheetTitle>
                  <SheetDescription className="mt-1 font-mono text-xs">
                    {contact.phone_number}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            {/* ── Contact Info Card ──────────────────────────────── */}
            <div className="mx-4 rounded-lg border bg-muted/30 p-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Status</span>
                  <div className="mt-0.5">{optInBadge(contact.opt_in_status)}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Since</span>
                  <p className="mt-0.5 text-xs">
                    {contact.created_at
                      ? formatDateTime(contact.created_at)
                      : "—"}
                  </p>
                </div>
              </div>
              {contact.tags.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs text-muted-foreground">Tags</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {contact.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {/* Conversation mode badge */}
              {conversation && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Conversation</span>
                  {modeBadge(conversation.mode)}
                  {conversation.unread_count > 0 && (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                      {conversation.unread_count} unread
                    </span>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* ── Message History ────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <MessageCircle className="size-3.5" />
                Message History
                {messages.length > 0 && (
                  <span className="text-muted-foreground/60">
                    ({messages.length})
                  </span>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.direction === "inbound"
                          ? "justify-start"
                          : "justify-end"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                          msg.direction === "inbound"
                            ? "border bg-muted/50"
                            : "bg-primary text-primary-foreground"
                        )}
                      >
                        {/* Message body */}
                        <p className="whitespace-pre-wrap break-words">
                          {msg.body || (
                            <span className="italic opacity-60">
                              [{msg.message_type}]
                            </span>
                          )}
                        </p>

                        {/* Footer: time + status + AI badge */}
                        <div
                          className={cn(
                            "mt-1.5 flex items-center gap-2",
                            msg.direction === "inbound"
                              ? "text-muted-foreground"
                              : "text-primary-foreground/70"
                          )}
                        >
                          <span className="text-[10px]">
                            {formatTime(msg.created_at)}
                          </span>
                          {msg.direction === "outbound" && (
                            <span className="flex items-center gap-0.5 text-[10px]">
                              {statusIcon(msg.status)}
                              <span className="capitalize">{msg.status}</span>
                            </span>
                          )}
                          {msg.sent_by_ai && (
                            <span className="flex items-center gap-0.5 text-[10px]">
                              <Bot className="size-3" />
                              AI
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* ── Empty messages state ────────────────────────── */
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Inbox className="size-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No messages yet
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Messages will appear here once you start a conversation.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
