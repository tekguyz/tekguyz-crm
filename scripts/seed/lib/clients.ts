import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadSeedEnv } from "./env";

// Service-role client — bypasses RLS entirely. Used for all direct
// leads/activity_logs seeding and for looking up/verifying orgs by name.
export function createAdminClient(): SupabaseClient {
  const { supabaseUrl, supabaseServiceKey } = loadSeedEnv();
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Anon-key client — only used to sign in as the demo owner so
// create_organization_with_owner has a real auth.uid() to resolve (that RPC
// requires an authenticated session; a service-role JWT resolves auth.uid()
// to NULL, per CLAUDE.md's Prompt 13a addendum).
export function createAnonClient(): SupabaseClient {
  const { supabaseUrl, supabaseAnonKey } = loadSeedEnv();
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
