// supabase/functions/get-generation-status/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, requireUser } from "../_shared/supabaseClient.ts";

const SIGNED_URL_EXPIRES_IN_SECONDS = 3600; // 1 hour

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, userClient, adminClient } = await requireUser(req);
    const url = new URL(req.url);
    const workflow_id = url.searchParams.get("workflow_id");
    const job_id = url.searchParams.get("job_id");

    if (!workflow_id && !job_id) {
      return new Response(JSON.stringify({ error: "Provide either workflow_id or job_id." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    let targetWorkflowId = workflow_id;

    // If job_id was provided, verify and get workflow_id
    let jobData: any = null;
    if (job_id) {
      const { data: job, error: jobErr } = await userClient
        .from("generation_jobs")
        .select("*")
        .eq("id", job_id)
        .eq("user_id", user.id)
        .single();

      if (jobErr || !job) {
        return new Response(JSON.stringify({ error: "Job not found or access denied." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }
      jobData = job;
      targetWorkflowId = job.workflow_id;
    }

    // Verify workflow
    const { data: workflow, error: wfErr } = await userClient
      .from("workflows")
      .select("id, name, prompt, aspect_ratio, output_count, status, created_at, updated_at")
      .eq("id", targetWorkflowId)
      .eq("user_id", user.id)
      .single();

    if (wfErr || !workflow) {
      return new Response(JSON.stringify({ error: "Workflow not found or access denied." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Fetch images associated with workflow
    const { data: images, error: imgErr } = await userClient
      .from("workflow_images")
      .select("*")
      .eq("workflow_id", workflow.id)
      .order("position", { ascending: true });

    if (imgErr) throw imgErr;

    // Generate short-lived signed URLs for private storage files
    const enrichedImages = await Promise.all(
      (images || []).map(async (img: any) => {
        let signedUrl: string | null = null;
        if (img.storage_path) {
          const bucket = img.role === "reference" ? "image-references" : "image-results";
          const { data: signedData } = await adminClient.storage
            .from(bucket)
            .createSignedUrl(img.storage_path, SIGNED_URL_EXPIRES_IN_SECONDS);
          signedUrl = signedData?.signedUrl || null;
        }

        return {
          id: img.id,
          role: img.role,
          position: img.position,
          mime_type: img.mime_type,
          file_size: img.file_size,
          prompt: img.prompt,
          status: img.status,
          error_message: img.error_message,
          signed_url: signedUrl,
          created_at: img.created_at,
        };
      })
    );

    return new Response(
      JSON.stringify({
        workflow,
        job: jobData,
        images: enrichedImages,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Failed to retrieve status." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

