import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/contacts/bulk-insert
 *
 * Bulk-insert contacts from a CSV upload.  Each contact is validated and
 * upserted so re-uploading the same file is idempotent.
 *
 * Body: { contacts: Array<{ name?: string; phone_number: string; tags?: string[]; opt_in_status?: string }> }
 *
 * The phone_number must be E.164 with a leading + (e.g. +14155552671).
 * The front-end CSV parser is expected to strip non-digit characters and
 * prepend the + before sending.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get the user's tenant_id (RLS will also scope the insert, but we
    //    need it explicitly for the contact rows)
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 400 }
      );
    }

    // 3. Parse the request body
    const { contacts } = await request.json();

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: "Contacts array is required and must not be empty" },
        { status: 400 }
      );
    }

    if (contacts.length > 1000) {
      return NextResponse.json(
        { error: "Maximum 1000 contacts per upload" },
        { status: 400 }
      );
    }

    // 4. Validate and normalise each contact
    const validContacts: Array<{
      tenant_id: string;
      name: string | null;
      phone_number: string;
      tags: string[];
      opt_in_status: "opted_in" | "opted_out" | "unknown";
    }> = [];

    const errors: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      const rowNum = i + 1;

      // Phone number is required
      if (!c.phone_number || typeof c.phone_number !== "string") {
        errors.push({ row: rowNum, reason: "Missing phone_number" });
        continue;
      }

      // Must be valid E.164 format
      const phone = c.phone_number.trim();
      if (!/^\+\d{7,15}$/.test(phone)) {
        errors.push({
          row: rowNum,
          reason: `Invalid phone number format: "${phone}". Must be E.164 with + prefix (e.g. +14155552671)`,
        });
        continue;
      }

      const optIn = c.opt_in_status?.toLowerCase().trim();
      const optInStatus: "opted_in" | "opted_out" | "unknown" =
        optIn === "opted_in"
          ? "opted_in"
          : optIn === "opted_out"
            ? "opted_out"
            : "unknown";

      validContacts.push({
        tenant_id: profile.tenant_id,
        name: c.name?.trim() || null,
        phone_number: phone,
        tags: Array.isArray(c.tags) ? c.tags.map((t: string) => t.trim()).filter(Boolean) : [],
        opt_in_status: optInStatus,
      });
    }

    // 5. Upsert contacts (idempotent — re-uploading the same CSV won't
    //    create duplicates thanks to the tenant_id / phone_number unique
    //    constraint).  We report the total rows processed since upsert may
    //    update existing rows rather than inserting new ones.
    let insertedCount = 0;
    if (validContacts.length > 0) {
      const { error: insertError } = await supabase
        .from("contacts")
        .upsert(validContacts, {
          onConflict: "tenant_id,phone_number",
          ignoreDuplicates: false,
        });

      if (insertError) {
        console.error("Bulk insert failed:", insertError);
        return NextResponse.json(
          { error: "Database error: could not insert contacts" },
          { status: 500 }
        );
      }

      insertedCount = validContacts.length;
    }

    return NextResponse.json({
      success: true,
      inserted: insertedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Bulk insert error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to import contacts",
      },
      { status: 500 }
    );
  }
}
