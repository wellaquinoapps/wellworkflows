// supabase/functions/manage-api-credentials/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, requireAdminUser } from "../_shared/supabaseClient.ts";
import { encryptSecret, maskApiKey } from "../_shared/crypto.ts";
import { testGeminiApiKey } from "../_shared/gemini.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, adminClient } = await requireAdminUser(req);

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || (await req.clone().json().catch(() => ({}))).action;

    // 1. LIST CREDENTIALS (Returns masked key, never encrypted_api_key)
    if (req.method === "GET" || action === "list") {
      const { data, error } = await adminClient
        .from("api_credentials")
        .select("id, label, google_project_ref, priority, enabled, status, last_used_at, cooldown_until, last_error_code, created_at, updated_at")
        .order("priority", { ascending: false });

      if (error) throw error;

      const maskedData = data.map((item: any) => ({
        ...item,
        masked_key: "••••••••••••••••",
      }));

      return new Response(JSON.stringify({ credentials: maskedData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const body = await req.json();

    // 2. CREATE CREDENTIAL
    if (action === "create") {
      const { label, apiKey, googleProjectRef, priority = 1, enabled = true } = body;

      if (!label || !apiKey) {
        return new Response(JSON.stringify({ error: "Missing label or apiKey." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Encrypt API Key with AES-256-GCM
      const encryptedKey = await encryptSecret(apiKey.trim());

      const { data, error } = await adminClient
        .from("api_credentials")
        .insert({
          label: label.trim(),
          encrypted_api_key: encryptedKey,
          google_project_ref: googleProjectRef?.trim() || null,
          priority: Number(priority),
          enabled: Boolean(enabled),
          status: "active",
        })
        .select("id, label, google_project_ref, priority, enabled, status, created_at")
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({
          credential: {
            ...data,
            masked_key: maskApiKey(apiKey.trim()),
          },
          message: "Credential encrypted and registered successfully.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 201,
        }
      );
    }

    // 3. UPDATE CREDENTIAL (label, priority, enabled, status)
    if (action === "update") {
      const { id, label, googleProjectRef, priority, enabled, status } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing credential id." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const updates: Record<string, any> = {};
      if (label !== undefined) updates.label = label;
      if (googleProjectRef !== undefined) updates.google_project_ref = googleProjectRef;
      if (priority !== undefined) updates.priority = Number(priority);
      if (enabled !== undefined) updates.enabled = Boolean(enabled);
      if (status !== undefined) updates.status = status;

      const { data, error } = await adminClient
        .from("api_credentials")
        .update(updates)
        .eq("id", id)
        .select("id, label, google_project_ref, priority, enabled, status, updated_at")
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ credential: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 4. TEST CREDENTIAL
    if (action === "test") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing credential id." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const { data: cred, error: fetchError } = await adminClient
        .from("api_credentials")
        .select("id, encrypted_api_key")
        .eq("id", id)
        .single();

      if (fetchError || !cred) {
        return new Response(JSON.stringify({ error: "Credential not found." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      const { decryptSecret } = await import("../_shared/crypto.ts");
      const decryptedKey = await decryptSecret(cred.encrypted_api_key);
      const isValid = await testGeminiApiKey(decryptedKey);

      await adminClient
        .from("api_credentials")
        .update({
          status: isValid ? "active" : "invalid",
          last_error_code: isValid ? null : "TEST_FAILED_OR_INVALID",
        })
        .eq("id", id);

      return new Response(
        JSON.stringify({
          valid: isValid,
          status: isValid ? "active" : "invalid",
          message: isValid ? "Credential is valid and ready." : "Credential test failed or unauthorized.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 5. DELETE CREDENTIAL
    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return new Response(JSON.stringify({ error: "Missing credential id." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const { error: deleteError } = await adminClient
        .from("api_credentials")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ message: "Credential removed successfully." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: err.message || "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: err.message?.includes("Unauthorized") ? 401 : err.message?.includes("Forbidden") ? 403 : 500,
      }
    );
  }
});

