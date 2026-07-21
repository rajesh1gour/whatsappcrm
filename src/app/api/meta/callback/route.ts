import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const META_GRAPH_VERSION = process.env.NEXT_PUBLIC_META_GRAPH_API_VERSION ?? "v21.0";
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

/**
 * POST /api/meta/callback
 *
 * Called by the frontend after the user completes the WhatsApp Embedded
 * Signup flow.  The frontend sends the short-lived authorisation code (from
 * the FB.login callback) together with the WABA info (from the
 * WA_EMBEDDED_SIGNUP message event).
 *
 * Body: {
 *   code: string;              // short-lived OAuth code from FB.login
 *   wabaId: string;            // WhatsApp Business Account ID
 *   phoneNumberId: string;     // Business Phone Number ID
 *   displayPhoneNumber?: string;
 *   verifiedName?: string;
 * }
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

    // 2. Get the user's tenant
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("tenant_id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.tenant_id) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 400 }
      );
    }

    // 3. Parse the request body
    const { code, wabaId, phoneNumberId, displayPhoneNumber, verifiedName } =
      await request.json();

    if (!code || !wabaId || !phoneNumberId) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: code, wabaId, phoneNumberId",
        },
        { status: 400 }
      );
    }

    // 4. Exchange the short-lived code for a long-lived access token
    const appId = process.env.NEXT_PUBLIC_META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      return NextResponse.json(
        { error: "Meta App is not configured on the server" },
        { status: 503 }
      );
    }

    const tokenUrl = new URL(`${META_GRAPH_BASE}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("grant_type", "authorization_code");
    tokenUrl.searchParams.set("code", code);
    // The redirect_uri must match what was registered in the Meta App
    // Dashboard for the Embedded Signup configuration.
    tokenUrl.searchParams.set(
      "redirect_uri",
      process.env.META_OAUTH_REDIRECT_URI ??
        `${request.nextUrl.origin}/dashboard/settings`
    );

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Meta token exchange failed:", tokenData);
      return NextResponse.json(
        { error: "Failed to exchange code for access token" },
        { status: 502 }
      );
    }

    const accessToken: string = tokenData.access_token;
    const tokenExpiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // 5. Store the WABA connection and credentials in the database
    //    We use the admin client (service_role) so we can write to
    //    whatsapp_credentials which has no RLS policies, and bypass the
    //    tenant billing-column protection.
    const admin = createAdminClient();

    // Upsert the whatsapp_connections row (at most one per tenant)
    const { data: connection, error: connError } = await admin
      .from("whatsapp_connections")
      .upsert(
        {
          tenant_id: profile.tenant_id,
          waba_id: wabaId,
          phone_number_id: phoneNumberId,
          display_phone_number: displayPhoneNumber ?? null,
          verified_name: verifiedName ?? null,
          status: "connected",
          connected_at: new Date().toISOString(),
        },
        {
          // If a row for this tenant already exists, update it
          onConflict: "tenant_id",
          ignoreDuplicates: false,
        }
      )
      .select("id")
      .single();

    if (connError) {
      console.error("Failed to save WhatsApp connection:", connError);
      return NextResponse.json(
        { error: "Database error: could not save connection" },
        { status: 500 }
      );
    }

    // Store the access token in the credentials table (RLS-locked)
    const { error: credError } = await admin
      .from("whatsapp_credentials")
      .upsert(
        {
          connection_id: connection!.id,
          access_token: accessToken,
          token_expires_at: tokenExpiresAt,
        },
        {
          onConflict: "connection_id",
          ignoreDuplicates: false,
        }
      );

    if (credError) {
      console.error("Failed to save WhatsApp credentials:", credError);
      return NextResponse.json(
        { error: "Database error: could not save credentials" },
        { status: 500 }
      );
    }

    console.log(
      `✅ Tenant ${profile.tenant_id} connected WABA ${wabaId} (phone: ${phoneNumberId})`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Meta callback error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to complete Meta signup",
      },
      { status: 500 }
    );
  }
}
