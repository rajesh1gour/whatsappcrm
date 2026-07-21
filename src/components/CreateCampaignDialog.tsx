"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Megaphone,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Check,
  CalendarIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Template {
  id: string;
  name: string;
  category: string;
  status: string;
  body: string;
}

interface CreateCampaignDialogProps {
  templates: Template[];
  availableTags: string[];
  trigger?: React.ReactElement;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

const STEPS = [
  { title: "Details", description: "Name and template" },
  { title: "Audience", description: "Who to send to" },
  { title: "Schedule", description: "When to send" },
  { title: "Review", description: "Confirm and launch" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CreateCampaignDialog({
  templates,
  availableTags,
  trigger,
}: CreateCampaignDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [scheduleNow, setScheduleNow] = useState(true);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const selectedTemplate = templates.find((t) => t.id === templateId);

  function resetForm() {
    setStep(0);
    setName("");
    setTemplateId("");
    setSelectedTags([]);
    setScheduleNow(true);
    setScheduledDate("");
    setScheduledTime("");
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleCreate() {
    if (!name.trim() || !templateId) {
      toast.error("Campaign name and template are required.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      const { error } = await supabase.from("campaigns").insert({
        name: name.trim(),
        template_id: templateId,
        target_tags: selectedTags,
        status: "draft",
        scheduled_at: scheduleNow
          ? null
          : new Date(`${scheduledDate}T${scheduledTime}`).toISOString(),
      });

      if (error) throw error;

      toast.success("Campaign created successfully!");
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {
      console.error("Create campaign error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create campaign"
      );
    } finally {
      setLoading(false);
    }
  }

  const canNext =
    (step === 0 && name.trim() && templateId) ||
    step === 1 ||
    step === 2 ||
    step === 3;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant="default">
              <Megaphone className="size-4" />
              Create Campaign
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Broadcast Campaign</DialogTitle>
          <DialogDescription>
            Send a WhatsApp template message to your contacts.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between px-1">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex items-center gap-2">
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                      ? "border-2 border-primary text-primary"
                      : "border text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </div>
              <div className="hidden sm:block">
                <p
                  className={`text-xs font-medium ${
                    i <= step ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.title}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {s.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* ── Step content ──────────────────────────────────────── */}
        <div className="min-h-[200px] space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  placeholder="e.g. Black Friday Sale"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template">WhatsApp Template</Label>
                <Select value={templateId} onValueChange={(value) => { if (value !== null) setTemplateId(value); }}>
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Select a template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.length === 0 && (
                      <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                        No approved templates available.
                      </div>
                    )}
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        <span className="flex items-center gap-2">
                          {t.name}
                          <Badge variant="outline" className="text-[10px]">
                            {t.category}
                          </Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <div className="rounded-lg border bg-muted/30 p-2 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Preview:</p>
                    <p className="mt-1 line-clamp-3">{selectedTemplate.body}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div>
                <Label>Target Audience</Label>
                <p className="text-xs text-muted-foreground">
                  Select tags to filter contacts. Leave empty to target all
                  opted-in contacts.
                </p>
              </div>
              {availableTags.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  No tags found. Add tags to your contacts first.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
              {selectedTags.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="size-3" />
                  Targeting contacts tagged with:{" "}
                  {selectedTags.join(", ")}
                </div>
              )}
              {selectedTags.length === 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Megaphone className="size-3" />
                  Targeting all opted-in contacts
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Label>Schedule</Label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer has-checked:border-primary has-checked:bg-primary/5">
                  <input
                    type="radio"
                    name="schedule"
                    checked={scheduleNow}
                    onChange={() => setScheduleNow(true)}
                    className="size-4 accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">Send immediately</p>
                    <p className="text-xs text-muted-foreground">
                      Campaign will start as soon as it&apos;s created.
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer has-checked:border-primary has-checked:bg-primary/5">
                  <input
                    type="radio"
                    name="schedule"
                    checked={!scheduleNow}
                    onChange={() => setScheduleNow(false)}
                    className="size-4 accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">Schedule for later</p>
                    <p className="text-xs text-muted-foreground">
                      Choose a date and time for the campaign to start.
                    </p>
                  </div>
                </label>
                {!scheduleNow && (
                  <div className="grid grid-cols-2 gap-3 pl-7">
                    <div className="space-y-1">
                      <Label htmlFor="sched-date" className="text-xs">Date</Label>
                      <Input
                        id="sched-date"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="sched-time" className="text-xs">Time</Label>
                      <Input
                        id="sched-time"
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-4 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-xs text-muted-foreground">Campaign</span>
                  <p className="font-medium">{name || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Template</span>
                  <p className="font-medium">{selectedTemplate?.name || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Audience</span>
                  <p className="font-medium">
                    {selectedTags.length > 0
                      ? `Tags: ${selectedTags.join(", ")}`
                      : "All opted-in contacts"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Schedule</span>
                  <p className="font-medium">
                    {scheduleNow
                      ? "Immediately"
                      : `${scheduledDate} at ${scheduledTime}`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter showCloseButton>
          <div className="flex w-full justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="size-4" />
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                Next
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Megaphone className="size-4" />
                    Create Campaign
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
