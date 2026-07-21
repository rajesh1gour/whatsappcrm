"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  Send,
  Bot,
  User,
  Clock,
  CheckCheck,
  XCircle,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  direction: "inbound" | "outbound";
  status: "queued" | "sent" | "delivered" | "read" | "failed";
  body: string | null;
  message_type: string;
  sent_by_ai: boolean;
  created_at: string;
}

interface ChatWindowProps {
  contactId: string;
  contactName: string | null;
  phoneNumber: string;
  tenantId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusIcon({ status }: { status: Message["status"] }) {
  switch (status) {
    case "queued":
      return <Clock className="size-3 text-muted-foreground" />;
    case "sent":
      return <Send className="size-3 text-blue-400" />;
    case "delivered":
      return <CheckCheck className="size-3 text-emerald-400" />;
    case "read":
      return <Eye className="size-3 text-emerald-400" />;
    case "failed":
      return <XCircle className="size-3 text-destructive" />;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatWindow({
  contactId,
  contactName,
  phoneNumber,
  tenantId,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const supabase = useRef(createClient()).current;

  // ── Initial fetch ─────────────────────────────────────────────────
  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("messages")
        .select(
          "id, direction, status, body, message_type, sent_by_ai, created_at"
        )
        .eq("contact_id", contactId)
        .order("created_at", { ascending: true });

      if (!ignore && data) {
        setMessages(data);
      }
      if (!ignore) setLoading(false);
    }

    load();
    return () => {
      ignore = true;
    };
  }, [contactId, supabase]);

  // ── Supabase Realtime subscription ────────────────────────────────
  useEffect(() => {
    // Listen for INSERT on messages where contact_id matches
    const channel = supabase
      .channel(`messages:contact_id=eq.${contactId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `contact_id=eq.${contactId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Remove any temp (optimistic) messages for this contact
            const filtered = prev.filter((m) => !m.id.startsWith("temp_"));
            // Only add if not already present (dedup)
            if (filtered.some((m) => m.id === newMsg.id)) return filtered;
            return [...filtered, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId, supabase]);

  // ── Auto-scroll to bottom ─────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);

    // Generate a temporary ID for optimistic update
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      direction: "outbound",
      status: "queued",
      body: text,
      message_type: "text",
      sent_by_ai: false,
      created_at: new Date().toISOString(),
    };

    // Optimistic add
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          tenantId,
          body: text,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send");
      }

      // Replace the optimistic message with the real one (or let Realtime do it)
      // The Realtime subscription will pick up the actual DB insert, but we
      // update optimistically here for instant feedback.
      if (data.messageId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...m, id: data.messageId, status: "sent" as const }
              : m
          )
        );
      } else {
        // Remove optimistic message if no real ID returned
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (error) {
      console.error("Send error:", error);
      // Mark optimistic message as failed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, status: "failed" as const } : m
        )
      );
    } finally {
      setSending(false);
    }
  }, [input, sending, contactId, tenantId]);

  // ── Handle Enter key ──────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      {/* ── Chat Header ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {contactName || "Unnamed Contact"}
          </p>
          <p className="truncate text-xs text-muted-foreground">{phoneNumber}</p>
        </div>
      </div>

      {/* ── Messages Area ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-3">
            {messages.map((msg, idx) => {
              const showDate =
                idx === 0 ||
                new Date(msg.created_at).toDateString() !==
                  new Date(messages[idx - 1].created_at).toDateString();

              return (
                <div key={msg.id}>
                  {/* Date separator */}
                  {showDate && (
                    <div className="mb-3 mt-1 text-center">
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] text-muted-foreground">
                        {formatDateTime(msg.created_at)}
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex",
                      msg.direction === "inbound"
                        ? "justify-start"
                        : "justify-end"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm",
                        msg.direction === "inbound"
                          ? "border bg-muted/50 rounded-bl-sm"
                          : "bg-primary text-primary-foreground rounded-br-sm"
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
                          "mt-1 flex items-center gap-1.5",
                          msg.direction === "inbound"
                            ? "justify-start"
                            : "justify-end"
                        )}
                      >
                        <span
                          className={cn(
                            "text-[10px]",
                            msg.direction === "inbound"
                              ? "text-muted-foreground"
                              : "text-primary-foreground/60"
                          )}
                        >
                          {formatTime(msg.created_at)}
                        </span>
                        {msg.direction === "outbound" && (
                          <StatusIcon status={msg.status} />
                        )}
                        {msg.sent_by_ai && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-purple-100/80 px-1 py-0.5 text-[9px] font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                            <Bot className="size-2.5" />
                            AI
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <Bot className="size-6 text-muted-foreground/50" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              No messages yet
            </p>
            <p className="text-xs text-muted-foreground/60">
              Start the conversation by sending a message below.
            </p>
          </div>
        )}
      </div>

      {/* ── Message Input ──────────────────────────────────────── */}
      <div className="border-t px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Type a message…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
