import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContactsClient } from "./contacts-client";

export default async function ContactsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch contacts for the current tenant (RLS scopes this automatically)
  const { data: contacts, error } = await supabase
    .from("contacts")
    .select("id, name, phone_number, tags, opt_in_status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch contacts:", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            Manage your phonebook — {contacts?.length ?? 0} contact
            {(contacts?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <ContactsClient contacts={contacts ?? []} />
    </div>
  );
}
