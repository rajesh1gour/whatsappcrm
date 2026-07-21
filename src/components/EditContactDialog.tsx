"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, Phone, User, Tags } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Contact {
  id: string;
  name: string | null;
  phone_number: string;
  tags: string[];
  opt_in_status: "opted_in" | "opted_out" | "unknown";
}

interface EditContactDialogProps {
  contact: Contact;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EditContactDialog({ contact }: EditContactDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(contact.name ?? "");
  const [phone, setPhone] = useState(contact.phone_number);
  const [tagsInput, setTagsInput] = useState(contact.tags.join(", "));
  const [optedIn, setOptedIn] = useState(contact.opt_in_status === "opted_in");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const phoneClean = phone.replace(/[\s\-\(\)\.]/g, "");
    const phoneE164 = phoneClean.startsWith("+")
      ? phoneClean
      : `+${phoneClean}`;

    if (!/^\+\d{7,15}$/.test(phoneE164)) {
      toast.error(
        "Invalid phone number. Use international format (e.g. +14155552671)."
      );
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    setLoading(true);
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("contacts")
        .update({
          name: name.trim() || null,
          phone_number: phoneE164,
          tags,
          opt_in_status: optedIn ? "opted_in" : "opted_out",
        })
        .eq("id", contact.id);

      if (error) throw error;

      toast.success("Contact updated successfully.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Edit contact error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update contact. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-foreground outline-hidden hover:bg-accent"
          >
            <Pencil className="size-4" />
            Edit
          </button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update the details for {contact.name || contact.phone_number}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name">
                <User className="mr-1.5 inline size-3.5 text-muted-foreground" />
                Full Name
              </Label>
              <Input
                id="edit-name"
                placeholder="e.g. Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="edit-phone">
                <Phone className="mr-1.5 inline size-3.5 text-muted-foreground" />
                Phone Number
                <span className="ml-1 text-destructive">*</span>
              </Label>
              <Input
                id="edit-phone"
                placeholder="e.g. +14155552671"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="edit-tags">
                <Tags className="mr-1.5 inline size-3.5 text-muted-foreground" />
                Tags
              </Label>
              <Input
                id="edit-tags"
                placeholder="e.g. vip, lead, support"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of tags.
              </p>
            </div>

            {/* Opt-in */}
            <div className="flex items-center gap-3">
              <Checkbox
                id="edit-opted-in"
                checked={optedIn}
                onCheckedChange={(checked) => setOptedIn(checked === true)}
              />
              <Label htmlFor="edit-opted-in" className="text-sm font-normal">
                Contact has opted in to receive WhatsApp messages
              </Label>
            </div>
          </div>

          <DialogFooter showCloseButton>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
