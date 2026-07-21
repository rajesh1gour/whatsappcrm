"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Megaphone,
  Loader2,
  Send,
  XCircle,
  BarChart3,
  Calendar,
  Clock,
  Target,
  CheckCircle2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Campaign {
  id: string;
  name: string;
  status: "draft" | "scheduled" | "queued" | "sending" | "completed" | "failed" | "cancelled";
  target_tags: string[];
  audience_size: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  clicked_count: number;
  failed_count: number;
  created_at: string;
  template: { id: string; name: string } | null;
}

interface CampaignDetailSheetProps {
  campaign: Campaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const statusConfig: Record<
  Campaign["status"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "ghost" }
> = {
  draft:     { label: "Draft",     variant: "ghost" },
  scheduled: { label: "Scheduled", variant: "secondary" },
  queued:    { label: "Queued",    variant: "secondary" },
  sending:   { label: "Sending",   variant: "default" },
  completed: { label: "Completed", variant: "default" },
  failed:    { label: "Failed",    variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

const canSend = (s: Campaign["status"]) =>
  s === "draft" || s === "failed" || s === "cancelled";
const canCancel = (s: Campaign["status"]) =>
  s === "scheduled" || s === "queued" || s === "sending";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
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

export function CampaignDetailSheet({
  campaign,
  open,
  onOpenChange,
}: CampaignDetailSheetProps) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [refreshedCampaign, setRefreshedCampaign] = useState<Campaign | null>(null);

  // Refresh campaign data when the sheet opens
  useEffect(() => {
    if (!open || !campaign) return;
    let ignore = false;
    const campaignId = campaign.id;

    async function load() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("campaigns")
          .select("*, template:template_id(id, name)")
          .eq("id", campaignId)
          .single();
        if (!ignore && data) setRefreshedCampaign(data as unknown as Campaign);
      } catch {
        // Silently fall back to the prop data
      }
    }
    load();
    return () => { ignore = true; };
  }, [open, campaign?.id]);

  const campaignData = refreshedCampaign ?? campaign;
  if (!campaignData) return null;
  const c: Campaign = campaignData;

  const cfg = statusConfig[c.status];
  const total = c.sent_count + c.failed_count;
  const deliveredRate = total > 0 ? Math.round((c.delivered_count / total) * 100) : 0;
  const readRate = total > 0 ? Math.round((c.read_count / total) * 100) : 0;

  async function handleSend() {
    setSending(true);
    try {
      const res = await fetch("/api/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: c.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send campaign");
      if (c) toast.success(`Campaign "${c.name}" is being sent!`);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Send error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send campaign");
    } finally {
      setSending(false);
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      if (!c) return;
      const supabase = createClient();
      const { error } = await supabase
        .from("campaigns")
        .update({ status: "cancelled" })
        .eq("id", c.id);
      if (error) throw error;
      toast.success("Campaign cancelled.");
      setRefreshedCampaign({ ...c, status: "cancelled" });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel campaign");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle className="truncate">{c.name}</SheetTitle>
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
          </div>
          {c.template && (
            <SheetDescription>Template: {c.template.name}</SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          {/* ── Stats grid ──────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Target} label="Audience" value={String(c.audience_size)} />
            <StatCard icon={BarChart3} label="Sent" value={String(c.sent_count)} />
            <StatCard icon={CheckCircle2} label="Delivered" value={`${c.delivered_count} (${deliveredRate}%)`} />
            <StatCard icon={Eye} label="Read" value={`${c.read_count} (${readRate}%)`} />
          </div>

          {/* ── Progress bar ──────────────────────────────────────── */}
          {total > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Delivery Progress
              </p>
              <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                {c.delivered_count > 0 && (
                  <div
                    className="bg-emerald-500 transition-all"
                    style={{ width: `${(c.delivered_count / total) * 100}%` }}
                  />
                )}
                {c.sent_count - c.delivered_count > 0 && (
                  <div
                    className="bg-blue-400 transition-all"
                    style={{ width: `${((c.sent_count - c.delivered_count) / total) * 100}%` }}
                  />
                )}
                {c.failed_count > 0 && (
                  <div
                    className="bg-destructive transition-all"
                    style={{ width: `${(c.failed_count / total) * 100}%` }}
                  />
                )}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span className="text-emerald-600">
                  {c.delivered_count} delivered
                </span>
                <span className="text-destructive">
                  {c.failed_count} failed
                </span>
              </div>
            </div>
          )}

          {/* ── Details ──────────────────────────────────────────── */}
          <Separator />
          <div className="space-y-3 text-sm">
            <h4 className="text-xs font-medium text-muted-foreground">Details</h4>
            {c.target_tags.length > 0 && (
              <div className="flex items-start gap-2">
                <Target className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Target Tags</p>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {c.target_tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-xs">{formatDate(c.created_at)}</p>
              </div>
            </div>
            {c.scheduled_at && (
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Scheduled</p>
                  <p className="text-xs">{formatDate(c.scheduled_at)}</p>
                </div>
              </div>
            )}
            {c.started_at && (
              <div className="flex items-start gap-2">
                <Send className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Started</p>
                  <p className="text-xs">{formatDate(c.started_at)}</p>
                </div>
              </div>
            )}
            {c.completed_at && (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-xs">{formatDate(c.completed_at)}</p>
                </div>
              </div>
            )}
            {c.failed_count > 0 && (
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div>
                  <p className="text-xs text-destructive">
                    {c.failed_count} message{c.failed_count !== 1 ? "s" : ""} failed
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Actions ──────────────────────────────────────── */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            {canSend(c.status) && (
              <Button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 gap-2"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {sending ? "Sending…" : "Send Now"}
              </Button>
            )}
            {canCancel(c.status) && (
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 gap-2"
              >
                {cancelling ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <XCircle className="size-4" />
                )}
                Cancel
              </Button>
            )}
            {!canSend(c.status) && !canCancel(c.status) && (
              <p className="w-full text-center text-xs text-muted-foreground">
                No actions available for this campaign.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// StatCard sub-component
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
