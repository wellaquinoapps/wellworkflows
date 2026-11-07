// supabase/functions/delete-workflow/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, requireUser } from "../_shared/supabaseClient.ts";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, userClient, adminClient } = await requireUser(req);
    const body = await req.json();
    const { workflow_id } = body;

    if (!workflow_id) {
      return new Response(JSON.stringify({ error: "Missing workflow_id." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // 1. Check ownership
    const { data: workflow, error: wfError } = await userClient
      .from("workflows")
      .select("id")
      .eq("id", workflow_id)
      .eq("user_id", user.id)
      .single();

    if (wfError || !workflow) {
      return new Response(JSON.stringify({ error: "Workflow not found or access denied." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // 2. Fetch all files from workflow_images
    const { data: images, error: imgError } = await userClient
      .from("workflow_images")
      .select("role, storage_path")
      .eq("workflow_id", workflow_id);

    if (imgError) throw imgError;

    const referenceFiles = (images || [])
      .filter((img: any) => img.role === "reference" && img.storage_path)
      .map((img: any) => img.storage_path);

    const resultFiles = (images || [])
      .filter((img: any) => img.role === "result" && img.storage_path)
      .map((img: any) => img.storage_path);

    // 3. Delete files from Storage buckets
    if (referenceFiles.length > 0) {
      const { error: delRefErr } = await adminClient.storage
        .from("image-references")
        .remove(referenceFiles);
      if (delRefErr) {
        console.error("Warning: Error removing some reference images:", delRefErr);
      }
    }

    if (resultFiles.length > 0) {
      const { error: delResErr } = await adminClient.storage
        .from("image-results")
        .remove(resultFiles);
      if (delResErr) {
        console.error("Warning: Error removing some result images:", delResErr);
      }
    }

    // 4. Delete the workflow record (cascading deletes workflow_images and generation_jobs)
    const { error: deleteWfError } = await userClient
      .from("workflows")
      .delete()
      .eq("id", workflow_id)
      .eq("user_id", user.id);

    if (deleteWfError) throw deleteWfError;

    return new Response(
      JSON.stringify({
        message: "Workflow and all associated storage files deleted successfully.",
        workflow_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to delete workflow." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

