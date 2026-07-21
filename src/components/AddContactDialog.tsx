"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Phone, User, Tags } from "lucide-react";
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

export function AddContactDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [optedIn, setOptedIn] = useState(true);

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

      const { error } = await supabase.from("contacts").insert({
        name: name.trim() || null,
        phone_number: phoneE164,
        tags,
        opt_in_status: optedIn ? "opted_in" : "opted_out",
      });

      if (error) throw error;

      toast.success(`${name.trim() || phoneE164} added to contacts.`);
      setOpen(false);
      setName("");
      setPhone("");
      setTagsInput("");
      setOptedIn(true);
      router.refresh();
    } catch (error) {
      console.error("Add contact error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to add contact. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="default" />}>
        <Plus className="size-4" />
        Add Contact
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>
              Add a new contact to your CRM. The phone number is required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                <User className="mr-1.5 inline size-3.5 text-muted-foreground" />
                Full Name
              </Label>
              <Input
                id="name"
                placeholder="e.g. Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                <Phone className="mr-1.5 inline size-3.5 text-muted-foreground" />
                Phone Number
                <span className="ml-1 text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                placeholder="e.g. +14155552671"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                International format with country code (e.g. +1 for US).
              </p>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">
                <Tags className="mr-1.5 inline size-3.5 text-muted-foreground" />
                Tags
              </Label>
              <Input
                id="tags"
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
                id="opted-in"
                checked={optedIn}
                onCheckedChange={(checked) => setOptedIn(checked === true)}
              />
              <Label htmlFor="opted-in" className="text-sm font-normal">
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
                "Save Contact"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
