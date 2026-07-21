"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Search,
  MessageSquare,
  Frown,
  Bot,
  User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ChatWindow } from "@/components/ChatWindow";
import type { Thread } from "./page";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InboxClientProps {
  threads: Thread[];
  tenantId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(iso: string | null) {
  if (!iso) return "";
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InboxClient({ threads: initialThreads, tenantId }: InboxClientProps) {
  const supabase = createClient();
  const [threads, setThreads] = useState(initialThreads);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null
  );
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return threads;
    const q = search.toLowerCase();
    return threads.filter(
      (t) =>
        t.contactName?.toLowerCase().includes(q) ||
        t.phoneNumber.includes(q) ||
        t.lastMessage?.toLowerCase().includes(q)
    );
  }, [threads, search]);

  const selectedThread = threads.find(
    (t) => t.contactId === selectedContactId
  );

  // Sort: unread first, then by last message time
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // Unread count descending
      if (a.unreadCount !== b.unreadCount) {
        return b.unreadCount - a.unreadCount;
      }
      // Then most recent message first
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [filtered]);

  // ── Mark thread as read when selected ────────────────────────────
  const handleSelectThread = useCallback(
    async (contactId: string, conversationId: string) => {
      setSelectedContactId(contactId);

      // Optimistically clear unread in local state
      setThreads((prev) =>
        prev.map((t) =>
          t.conversationId === conversationId
            ? { ...t, unreadCount: 0 }
            : t
        )
      );

      // Persist to database (fire-and-forget)
      try {
        await supabase
          .from("conversations")
          .update({ unread_count: 0 })
          .eq("id", conversationId);
      } catch (err) {
        console.error("Failed to mark conversation as read:", err);
      }
    },
    [supabase]
  );

  return (
    <div className="flex h-full">
      {/* ── Left Panel: Thread List ───────────────────────────────── */}
      <div className="flex w-80 shrink-0 flex-col border-r bg-card">
        {/* Header */}
        <div className="border-b px-4 py-4">
          <h2 className="text-base font-semibold">Inbox</h2>
          <p className="text-xs text-muted-foreground">
            {threads.length} conversation{threads.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Search */}
        <div className="border-b px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search messages…"
              className="h-8 pl-7 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto">
          {sorted.length > 0 ? (
            <div className="divide-y">
              {sorted.map((thread) => (
                <button
                  key={thread.conversationId}
                  onClick={() =>
                    handleSelectThread(
                      thread.contactId,
                      thread.conversationId
                    )
                  }
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                    selectedContactId === thread.contactId
                      ? "bg-muted"
                      : ""
                  )}
                >
                  {/* Avatar placeholder */}
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="size-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {thread.contactName || "Unnamed"}
                      </p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatTime(thread.lastMessageAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {thread.lastMessage || (
                        <span className="italic opacity-60">
                          No messages yet
                        </span>
                      )}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      {/* Mode badge */}
                      {thread.mode === "ai" && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-purple-100 px-1 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          <Bot className="size-2.5" />
                          AI
                        </span>
                      )}
                      {thread.mode === "human" && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          <User className="size-2.5" />
                          Human
                        </span>
                      )}
                      {/* Unread badge */}
                      {thread.unreadCount > 0 && (
                        <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Frown className="size-6 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                {search
                  ? "No conversations match"
                  : "No conversations yet"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Panel: Chat Window ──────────────────────────────── */}
      <div className="flex flex-1 flex-col">
        {selectedContactId && selectedThread ? (
          <ChatWindow
            key={selectedContactId}
            contactId={selectedContactId}
            contactName={selectedThread.contactName}
            phoneNumber={selectedThread.phoneNumber}
            tenantId={tenantId}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto size-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                Select a conversation
              </p>
              <p className="text-xs text-muted-foreground/60">
                Choose a thread from the left panel to view messages
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
