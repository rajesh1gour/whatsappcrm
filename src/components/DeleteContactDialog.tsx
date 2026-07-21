"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
}

interface DeleteContactDialogProps {
  contact: Contact;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeleteContactDialog({ contact }: DeleteContactDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const displayName = contact.name || contact.phone_number;

  async function handleDelete() {
    setLoading(true);
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", contact.id);

      if (error) throw error;

      toast.success(`${displayName} has been removed.`);
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Delete contact error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete contact. Please try again."
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
            className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-sm text-destructive outline-hidden hover:bg-destructive/10"
          >
            <Trash2 className="size-4" />
            Delete
          </button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="size-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Delete Contact</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-medium text-foreground">
                  {displayName}
                </span>
                ? This will also permanently delete all conversations and
                messages associated with this contact. This action cannot be
                undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-4" showCloseButton>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                Delete Contact
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
