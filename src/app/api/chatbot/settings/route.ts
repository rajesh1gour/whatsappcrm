import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PUT /api/chatbot/settings
 *
 * Updates the tenant's chatbot configuration.
 *
 * Body:
 * {
 *   enabled: boolean,
 *   systemPrompt: string,
 *   handoffKeywords: string[],
 *   maxAiReplies: number
 * }
 *
 * Security: user must be authenticated and belong to the tenant whose
 * config is being updated. RLS on chatbot_configs enforces isolation.
 */
export async function PUT(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!profile?.tenant_id) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    // 2. Parse and validate body
    const body = await request.json();
    const { enabled, systemPrompt, handoffKeywords, maxAiReplies } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
        { status: 400 }
      );
    }

    if (typeof systemPrompt !== "string") {
      return NextResponse.json(
        { error: "systemPrompt must be a string" },
        { status: 400 }
      );
    }

    if (!Array.isArray(handoffKeywords) || handoffKeywords.length === 0) {
      return NextResponse.json(
        { error: "handoffKeywords must be a non-empty array" },
        { status: 400 }
      );
    }

    const maxReplies = Math.max(1, Math.min(100, Number(maxAiReplies) || 10));

    // 3. Use admin client to upsert (bypasses RLS for write, but we verify
    //    the tenant_id matches the authenticated user)
    const admin = createAdminClient();

    const { error } = await admin.from("chatbot_configs").upsert(
      {
        tenant_id: profile.tenant_id,
        enabled,
        system_prompt: systemPrompt,
        handoff_keywords: handoffKeywords,
        max_ai_replies_per_conversation: maxReplies,
      },
      {
        onConflict: "tenant_id",
        ignoreDuplicates: false,
      }
    );

    if (error) {
      console.error("Failed to save chatbot config:", error);
      return NextResponse.json(
        { error: "Database error: could not save settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Chatbot settings error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to save chatbot settings",
      },
      { status: 500 }
    );
  }
}
