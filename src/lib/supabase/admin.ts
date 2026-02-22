import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase admin client with service role privileges.
 * CAUTION: This bypasses RLS - only use for admin operations.
 *
 * Use cases:
 * - Creating user profiles after signup (no user session yet)
 * - Admin operations that need to bypass RLS
 * - Background jobs and webhooks
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseServiceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY - required for admin operations"
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
