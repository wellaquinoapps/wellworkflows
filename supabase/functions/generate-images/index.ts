// supabase/functions/generate-images/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, requireUser } from "../_shared/supabaseClient.ts";
import { decryptSecret } from "../_shared/crypto.ts";
import { generateSingleImageWithGemini, GeminiError } from "../_shared/gemini.ts";

interface GenerateRequestBody {
  workflow_id: string;
  individual_prompts?: string[]; // optional array with up to 4 prompts
  retry_failed_only?: boolean;
}

// Cooldown period in minutes when 429 occurs
const COOLDOWN_MINUTES = 10;
const MAX_ATTEMPTS_PER_OUTPUT = 3;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, userClient, adminClient } = await requireUser(req);
    const body: GenerateRequestBody = await req.json();
    const { workflow_id, individual_prompts = [], retry_failed_only = false } = body;

    if (!workflow_id) {
      return new Response(JSON.stringify({ error: "Missing workflow_id." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // 1. Fetch workflow and verify ownership
    const { data: workflow, error: wfError } = await userClient
      .from("workflows")
      .select("*")
      .eq("id", workflow_id)
      .eq("user_id", user.id)
      .single();

    if (wfError || !workflow) {
      return new Response(JSON.stringify({ error: "Workflow not found or unauthorized." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // 2. Fetch Reference Images
    const { data: refImages, error: refError } = await userClient
      .from("workflow_images")
      .select("*")
      .eq("workflow_id", workflow_id)
      .eq("role", "reference")
      .order("position", { ascending: true });

    if (refError) throw refError;

    // Download reference images into memory buffers for Gemini call
    const loadedReferenceImages: Array<{ bytes: Uint8Array; mimeType: string }> = [];
    if (refImages && refImages.length > 0) {
      for (const ref of refImages) {
        const { data: fileData, error: downloadError } = await adminClient.storage
          .from("image-references")
          .download(ref.storage_path);

        if (!downloadError && fileData) {
          const arrayBuf = await fileData.arrayBuffer();
          loadedReferenceImages.push({
            bytes: new Uint8Array(arrayBuf),
            mimeType: ref.mime_type || "image/jpeg",
          });
        }
      }
    }

    // 3. Create or update generation job
    const totalCount = workflow.output_count || 4;

    const { data: job, error: jobError } = await adminClient
      .from("generation_jobs")
      .insert({
        workflow_id: workflow.id,
        user_id: user.id,
        status: "processing",
        requested_count: totalCount,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (jobError) throw jobError;

    // Update workflow status
    await adminClient
      .from("workflows")
      .update({ status: "processing" })
      .eq("id", workflow.id);

    // 4. Identify which positions to generate
    const positionsToProcess: number[] = [];
    if (retry_failed_only) {
      // Find failed or missing positions
      const { data: existingResults } = await adminClient
        .from("workflow_images")
        .select("position, status")
        .eq("workflow_id", workflow.id)
        .eq("role", "result");

      const completedPositions = new Set(
        existingResults?.filter((r: any) => r.status === "completed").map((r: any) => r.position) || []
      );

      for (let pos = 1; pos <= totalCount; pos++) {
        if (!completedPositions.has(pos)) {
          positionsToProcess.push(pos);
        }
      }
    } else {
      for (let pos = 1; pos <= totalCount; pos++) {
        positionsToProcess.push(pos);
      }
    }

    let completedCount = totalCount - positionsToProcess.length;
    let failedCount = 0;
    const outputResults: any[] = [];

    // Helper: Lease credential using the DB function with atomic SKIP LOCKED
    async function leaseCredential() {
      const { data, error } = await adminClient.rpc("lease_gemini_credential");
      if (error || !data || data.length === 0) {
        return null;
      }
      return data[0];
    }

    // 5. Generate images independently
    for (const position of positionsToProcess) {
      const outputPrompt = individual_prompts[position - 1]?.trim() || workflow.prompt;

      // Upsert record in workflow_images as queued/processing
      const { data: imgRecord, error: imgInitError } = await adminClient
        .from("workflow_images")
        .upsert(
          {
            workflow_id: workflow.id,
            user_id: user.id,
            role: "result",
            position: position,
            storage_path: `${user.id}/${workflow.id}/result_${position}.png`,
            mime_type: "image/png",
            prompt: outputPrompt,
            status: "processing",
            error_message: null,
          },
          { onConflict: "workflow_id,position,role" }
        )
        .select()
        .single();

      let success = false;
      let attempt = 0;
      let lastErrorMessage = "";

      while (!success && attempt < MAX_ATTEMPTS_PER_OUTPUT) {
        attempt++;

        // Lease eligible key atomically
        const cred = await leaseCredential();
        if (!cred) {
          lastErrorMessage = "No eligible Google Gemini credentials available. All keys may be disabled or in cooldown.";
          break;
        }

        const credentialId = cred.credential_id;
        let plainApiKey = "";

        try {
          plainApiKey = await decryptSecret(cred.encrypted_key);
        } catch (decErr: any) {
          await adminClient
            .from("api_credentials")
            .update({ status: "invalid", last_error_code: "DECRYPTION_ERROR" })
            .eq("id", credentialId);
          continue;
        }

        const callStartTime = Date.now();
        try {
          const result = await generateSingleImageWithGemini({
            apiKey: plainApiKey,
            prompt: outputPrompt,
            aspectRatio: workflow.aspect_ratio,
            referenceImages: loadedReferenceImages,
          });

          // Upload generated image to private bucket image-results
          const storagePath = `${user.id}/${workflow.id}/result_${position}_${Date.now()}.png`;
          const { error: uploadError } = await adminClient.storage
            .from("image-results")
            .upload(storagePath, result.imageBytes, {
              contentType: result.mimeType,
              upsert: true,
            });

          if (uploadError) throw uploadError;

          // Update image record to completed
          await adminClient
            .from("workflow_images")
            .update({
              storage_path: storagePath,
              mime_type: result.mimeType,
              file_size: result.imageBytes.byteLength,
              status: "completed",
              error_message: null,
            })
            .eq("workflow_id", workflow.id)
            .eq("position", position)
            .eq("role", "result");

          // Log API Usage (Safe metadata only, no prompts or keys)
          await adminClient.from("api_usage_logs").insert({
            credential_id: credentialId,
            job_id: job.id,
            model: "imagen-3.0-generate-002",
            operation: "generate_image",
            http_status: 200,
            success: true,
            latency_ms: Date.now() - callStartTime,
          });

          success = true;
          completedCount++;
          outputResults.push({ position, status: "completed", storage_path: storagePath });
        } catch (err: any) {
          const isGeminiErr = err instanceof GeminiError;
          lastErrorMessage = err.message || "Unknown error during generation";

          // Log API failure
          await adminClient.from("api_usage_logs").insert({
            credential_id: credentialId,
            job_id: job.id,
            model: "imagen-3.0-generate-002",
            operation: "generate_image",
            http_status: err.statusCode || 500,
            success: false,
            latency_ms: Date.now() - callStartTime,
            error_code: isGeminiErr ? err.errorType : "INTERNAL_ERROR",
          });

          if (isGeminiErr) {
            if (err.errorType === "QUOTA") {
              // Mark key in cooldown and switch key
              const cooldownUntil = new Date(Date.now() + COOLDOWN_MINUTES * 60 * 1000).toISOString();
              await adminClient
                .from("api_credentials")
                .update({
                  status: "cooldown",
                  cooldown_until: cooldownUntil,
                  last_error_code: "QUOTA_EXCEEDED_429",
                })
                .eq("id", credentialId);
              // Loop will naturally lease next key on next iteration
              continue;
            } else if (err.errorType === "INVALID_KEY") {
              // Mark key as invalid
              await adminClient
                .from("api_credentials")
                .update({
                  status: "invalid",
                  last_error_code: "INVALID_CREDENTIAL",
                })
                .eq("id", credentialId);
              // Try next key
              continue;
            } else if (err.errorType === "CONTENT_POLICY") {
              // Don't switch keys for content policy violations
              break;
            }
          }

          // Backoff jitter for transient network failures
          await new Promise((res) => setTimeout(res, 500 + Math.random() * 500));
        }
      }

      if (!success) {
        failedCount++;
        await adminClient
          .from("workflow_images")
          .update({
            status: "failed",
            error_message: lastErrorMessage.slice(0, 500),
          })
          .eq("workflow_id", workflow.id)
          .eq("position", position)
          .eq("role", "result");

        outputResults.push({ position, status: "failed", error: lastErrorMessage });
      }
    }

    // 6. Update Job & Workflow final status
    const finalStatus =
      completedCount === totalCount ? "completed" : completedCount > 0 ? "partial" : "failed";

    await adminClient
      .from("generation_jobs")
      .update({
        status: finalStatus,
        completed_count: completedCount,
        failed_count: failedCount,
        finished_at: new Date().toISOString(),
        error_summary: failedCount > 0 ? `${failedCount} output(s) failed.` : null,
      })
      .eq("id", job.id);

    await adminClient
      .from("workflows")
      .update({ status: finalStatus })
      .eq("id", workflow.id);

    return new Response(
      JSON.stringify({
        job_id: job.id,
        workflow_id: workflow.id,
        status: finalStatus,
        completed_count: completedCount,
        failed_count: failedCount,
        results: outputResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Failed to process image generation" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

