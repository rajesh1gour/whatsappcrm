import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client — BYPASSES Row Level Security.
 *
 * Use ONLY in trusted server contexts:
 *   - Meta webhook handlers (incoming messages, status updates)
 *   - Stripe webhook handlers
 *   - The broadcast queue worker
 *   - Reading/writing whatsapp_credentials (tokens are invisible to RLS users)
 *   - Super Admin operations
 *
 * The `server-only` import makes any accidental client-side import a
 * build-time error.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
