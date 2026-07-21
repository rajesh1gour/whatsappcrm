"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Phone,
  User,
  Tag,
  MessageCircle,
  Frown,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddContactDialog } from "@/components/AddContactDialog";
import { UploadCSVDialog } from "@/components/UploadCSVDialog";
import { EditContactDialog } from "@/components/EditContactDialog";
import { DeleteContactDialog } from "@/components/DeleteContactDialog";
import { ContactDetailDrawer } from "@/components/ContactDetailDrawer";

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

interface ContactsClientProps {
  contacts: Contact[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ContactsClient({ contacts }: ContactsClientProps) {
  const [search, setSearch] = useState("");
  const [drawerContact, setDrawerContact] = useState<Contact | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.phone_number.includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [contacts, search]);

  const optInBadge = (status: Contact["opt_in_status"]) => {
    const map: Record<
      Contact["opt_in_status"],
      { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
    > = {
      opted_in: { label: "Opted in", variant: "default" },
      opted_out: { label: "Opted out", variant: "destructive" },
      unknown: { label: "Unknown", variant: "outline" },
    };
    const entry = map[status];
    return <Badge variant={entry.variant}>{entry.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* ── Toolbar ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone or tag…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <AddContactDialog />
        <UploadCSVDialog />
      </div>

      {/* ── Table ────────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">
                  <div className="flex items-center gap-1.5">
                    <User className="size-3.5 text-muted-foreground" />
                    Name
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1.5">
                    <Phone className="size-3.5 text-muted-foreground" />
                    Phone Number
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1.5">
                    <Tag className="size-3.5 text-muted-foreground" />
                    Tags
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="size-3.5 text-muted-foreground" />
                    Opt-in Status
                  </div>
                </TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contact) => (
                <TableRow
                  key={contact.id}
                  className="group cursor-pointer"
                  onClick={() => {
                    setDrawerContact(contact);
                    setDrawerOpen(true);
                  }}
                >
                  <TableCell className="font-medium">
                    {contact.name || (
                      <span className="italic text-muted-foreground">
                        Unnamed
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {contact.phone_number}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.length > 0 ? (
                        contact.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{optInBadge(contact.opt_in_status)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Actions</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <EditContactDialog contact={contact} />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setDrawerContact(contact);
                            setDrawerOpen(true);
                          }}
                        >
                          <Eye className="size-4" />
                          View History
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">
                          <DeleteContactDialog contact={contact} />
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* ── Empty state ─────────────────────────────────────────── */
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center">
          <Frown className="size-10 text-muted-foreground/50" />
          <div>
            <p className="text-sm font-medium">
              {search
                ? "No contacts match your search"
                : "No contacts yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {search
                ? "Try a different search term."
                : "Add a contact manually or import a CSV to get started."}
            </p>
          </div>
        </div>
      )}

      {/* ── Footer count ─────────────────────────────────────────── */}
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {contacts.length} contact
        {contacts.length !== 1 ? "s" : ""}
      </p>

      {/* ── Contact Detail Drawer ──────────────────────────────── */}
      <ContactDetailDrawer
        contact={drawerContact}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
