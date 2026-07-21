"use client";

import { useState } from "react";
import {
  Megaphone,
  Frown,
  Calendar,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateCampaignDialog } from "@/components/CreateCampaignDialog";
import { CampaignDetailSheet } from "@/components/CampaignDetailSheet";

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

interface Template {
  id: string;
  name: string;
  category: "marketing" | "utility" | "authentication";
  status: string;
  body: string;
}

interface BroadcastsClientProps {
  campaigns: Campaign[];
  templates: Template[];
  availableTags: string[];
}

// ---------------------------------------------------------------------------
// Status badge helper
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BroadcastsClient({ campaigns, templates, availableTags }: BroadcastsClientProps) {
  const [detailCampaign, setDetailCampaign] = useState<Campaign | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  function openDetail(c: Campaign) {
    setDetailCampaign(c);
    setDetailOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
        </p>
        <CreateCampaignDialog
          templates={templates}
          availableTags={availableTags}
        />
      </div>

      {/* Campaign table */}
      {campaigns.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead className="text-right">Sent / Delivered / Read</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => {
                const cfg = statusConfig[campaign.status];
                return (
                  <TableRow
                    key={campaign.id}
                    className="cursor-pointer"
                    onClick={() => openDetail(campaign)}
                  >
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-medium">{campaign.name}</p>
                        {campaign.template && (
                          <p className="text-xs text-muted-foreground">
                            Template: {campaign.template.name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {campaign.audience_size} contact
                      {campaign.audience_size !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {campaign.scheduled_at ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(campaign.scheduled_at).toLocaleDateString()}
                        </span>
                      ) : campaign.status === "completed" ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="size-3" />
                          Sent
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground/60">
                          <Clock className="size-3" />
                          Now
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {campaign.sent_count > 0 || campaign.delivered_count > 0 ? (
                        <span className="text-muted-foreground">
                          {campaign.sent_count} / {campaign.delivered_count} / {campaign.read_count}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center">
          <Megaphone className="size-10 text-muted-foreground/50" />
          <div>
            <p className="text-sm font-medium">No campaigns yet</p>
            <p className="text-xs text-muted-foreground">
              Create your first broadcast campaign to send WhatsApp messages to
              your contacts.
            </p>
          </div>
          <CreateCampaignDialog
            templates={templates}
            availableTags={availableTags}
            trigger={
              <Button variant="default" size="sm">
                Create Campaign
              </Button>
            }
          />
        </div>
      )}

      {/* Detail sheet */}
      <CampaignDetailSheet
        campaign={detailCampaign}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
