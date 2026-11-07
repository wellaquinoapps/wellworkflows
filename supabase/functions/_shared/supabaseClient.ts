// supabase/functions/_shared/supabaseClient.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

/**
 * Creates an authenticated Supabase client using caller's JWT token
 */
export function createAuthenticatedClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("SUPABASE_URL or SUPABASE_ANON_KEY missing in environment.");
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Creates an admin client with service_role privileges
 * Used strictly within backend Edge Functions for privileged DB / storage tasks
 */
export function createAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in environment.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Validates the user and checks if user has admin privileges
 */
export async function requireAdminUser(req: Request) {
  const userClient = createAuthenticatedClient(req);
  const { data: { user }, error: userError } = await userClient.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized: Invalid user session.");
  }

  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    throw new Error("Forbidden: Admin privileges required.");
  }

  return { user, adminClient };
}

/**
 * Validates the user from JWT
 */
export async function requireUser(req: Request) {
  const userClient = createAuthenticatedClient(req);
  const { data: { user }, error: userError } = await userClient.auth.getUser();

  if (userError || !user) {
    throw new Error("Unauthorized: Invalid user session.");
  }

  return { user, userClient, adminClient: createAdminClient() };
}

