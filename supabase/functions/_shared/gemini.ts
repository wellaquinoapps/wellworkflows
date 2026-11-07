// supabase/functions/_shared/gemini.ts
// Client for Google Gemini Image Generation / Editing API (Imagen 3 / Gemini Nano Banana).
// Handles image references, aspect ratios, error classification, and quota cooldowns.

export interface GeminiGenerateOptions {
  apiKey: string;
  prompt: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  referenceImages?: Array<{
    bytes: Uint8Array;
    mimeType: string;
  }>;
}

export interface GeminiResult {
  imageBytes: Uint8Array;
  mimeType: string;
}

export type GeminiErrorType = "QUOTA" | "INVALID_KEY" | "CONTENT_POLICY" | "SERVER" | "CLIENT";

export class GeminiError extends Error {
  errorType: GeminiErrorType;
  statusCode?: number;

  constructor(message: string, errorType: GeminiErrorType, statusCode?: number) {
    super(message);
    this.name = "GeminiError";
    this.errorType = errorType;
    this.statusCode = statusCode;
  }
}

/**
 * Maps standard aspect ratio strings to Imagen / Gemini compatible aspect ratio parameters
 */
function mapAspectRatio(ratio: "9:16" | "16:9" | "1:1"): string {
  switch (ratio) {
    case "9:16":
      return "9:16";
    case "16:9":
      return "16:9";
    case "1:1":
      return "1:1";
    default:
      throw new GeminiError(`Unsupported aspect ratio: ${ratio}`, "CLIENT");
  }
}

/**
 * Tests if an API key is valid by calling a lightweight models endpoint or generate call
 */
export async function testGeminiApiKey(apiKey: string): Promise<boolean> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url, { method: "GET" });
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    return false;
  }
  return response.ok;
}

/**
 * Calls Google Imagen 3 or Gemini multimodal endpoint to synthesize or compose images.
 * By default uses 'imagen-3.0-generate-002'.
 */
export async function generateSingleImageWithGemini(
  options: GeminiGenerateOptions
): Promise<GeminiResult> {
  const { apiKey, prompt, aspectRatio, referenceImages = [] } = options;

  // If reference images are present, we instruct Imagen / Gemini to preserve product details & integrate into background
  const formattedAspectRatio = mapAspectRatio(aspectRatio);

  // Model: imagen-3.0-generate-002 for high fidelity image synthesis
  // Endpoint: predict / generateImages
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

  let enhancedPrompt = prompt;
  if (referenceImages.length > 0) {
    enhancedPrompt = `${prompt} (Preserve product identity, colors, logos, and integrate naturally into lighting, reflections, and perspective)`;
  }

  const payload: Record<string, unknown> = {
    instances: [
      {
        prompt: enhancedPrompt,
      },
    ],
    parameters: {
      sampleCount: 1,
      aspectRatio: formattedAspectRatio,
      outputOptions: {
        mimeType: "image/png",
      },
    },
  };

  // Add reference images if supplied
  if (referenceImages.length > 0) {
    (payload.instances as any)[0].imagePrompt = referenceImages.map((img) => ({
      bytesBase64Encoded: btoa(String.fromCharCode(...img.bytes)),
      mimeType: img.mimeType,
    }));
  }

  let response: Response;
  const startTime = Date.now();

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (netErr: any) {
    throw new GeminiError(`Network failure contacting Google API: ${netErr.message}`, "SERVER");
  }

  const latencyMs = Date.now() - startTime;

  if (!response.ok) {
    const errorBody = await response.text();
    let parsedMessage = errorBody;
    try {
      const jsonErr = JSON.parse(errorBody);
      parsedMessage = jsonErr.error?.message || errorBody;
    } catch {
      // keep raw string
    }

    if (response.status === 429) {
      throw new GeminiError(`Google API Quota exceeded: ${parsedMessage}`, "QUOTA", 429);
    }
    if (response.status === 401 || response.status === 403) {
      throw new GeminiError(`Google API Key invalid or unauthorized: ${parsedMessage}`, "INVALID_KEY", response.status);
    }
    if (response.status === 400 && parsedMessage.toLowerCase().includes("safety")) {
      throw new GeminiError(`Image content violated safety guidelines: ${parsedMessage}`, "CONTENT_POLICY", 400);
    }
    if (response.status >= 500) {
      throw new GeminiError(`Google API internal server error: ${parsedMessage}`, "SERVER", response.status);
    }

    throw new GeminiError(`Google API error (${response.status}): ${parsedMessage}`, "CLIENT", response.status);
  }

  const data = await response.json();
  const prediction = data.predictions?.[0];

  if (!prediction?.bytesBase64Encoded) {
    throw new GeminiError("No image data returned from Google Imagen API.", "SERVER");
  }

  const binaryString = atob(prediction.bytesBase64Encoded);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return {
    imageBytes: bytes,
    mimeType: prediction.mimeType || "image/png",
  };
}

