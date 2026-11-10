import http from 'http';
import crypto from 'crypto';
import https from 'https';

const PORT = 3001;

// Configuration from env or defaults
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dttgyctwfbennrsmodkn.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dGd5Y3R3ZmJlbm5yc21vZGtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDA4OTU3OSwiZXhwIjoyMTA5NjY1NTc5fQ.OOINXVDLyVTCUsAvLBmrJMjqco48UHgq8YRcuml4WYo';
const MASTER_ENCRYPTION_KEY = process.env.MASTER_ENCRYPTION_KEY || '6c8d35f49e1a8b270c3d9a1f5e8b4c207a9e3d1f5b8c2e4a6d0f9b3c1e7a5d2f';

// Derive 256-bit key
const keyMaterial = crypto.createHash('sha256').update(MASTER_ENCRYPTION_KEY).digest();

// Supported models
const SUPPORTED_MODELS = [
  'free-flux-synthesis',
  'imagen-3.0-generate-002',
  'imagen-3.0-fast-generate-001',
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro',
];
const DEFAULT_MODEL = 'free-flux-synthesis';

// ── Crypto helpers ──────────────────────────────────────────────────────────
function encryptSecret(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyMaterial, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString('base64');
}

function decryptSecret(base64) {
  const combined = Buffer.from(base64, 'base64');
  const iv = combined.subarray(0, 12);
  const tag = combined.subarray(combined.length - 16);
  const ciphertext = combined.subarray(12, combined.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyMaterial, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext, null, 'utf8') + decipher.final('utf8');
}

function maskApiKey(key) {
  if (!key || key.length < 8) return '••••••••';
  return `${key.slice(0, 6)}••••••••${key.slice(-4)}`;
}

// ── Supabase REST helper ────────────────────────────────────────────────────
function supabaseRest(endpoint, method = 'GET', body = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, SUPABASE_URL);
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      method,
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
        ...extraHeaders,
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Google API helpers ──────────────────────────────────────────────────────
function downloadBuffer(urlStr) {
  return new Promise((resolve, reject) => {
    const mod = urlStr.startsWith('https') ? https : http;
    const urlObj = new URL(urlStr);
    mod.get({ hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search, headers: { 'User-Agent': 'NanoBanana/1.0' } }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

function httpsPost(hostname, path, headers, bodyStr) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...headers,
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, json: { raw: data } }); }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function callGoogleImagenAPI(apiKey, model, prompt, refBuffers, aspectRatio, sampleCount) {
  const isGemini = model.startsWith('gemini-');

  if (isGemini) {
    // Gemini generateContent with inline images
    const parts = [];
    if (prompt) parts.push({ text: prompt });
    for (const buf of refBuffers) {
      parts.push({ inlineData: { mimeType: 'image/jpeg', data: buf.toString('base64') } });
    }
    if (!prompt) {
      parts.push({ text: 'Compose the product images into the scene from the first image. Preserve product details, adjust lighting and shadows naturally.' });
    }

    const bodyStr = JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['image', 'text'] },
    });

    const { status, json } = await httpsPost(
      'generativelanguage.googleapis.com',
      `/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {},
      bodyStr
    );

    if (json.error) throw new Error(`Gemini API ${status}: ${json.error.message}`);

    const images = [];
    for (const cand of json.candidates || []) {
      for (const part of cand.content?.parts || []) {
        if (part.inlineData?.data) images.push(part.inlineData.data);
      }
    }
    if (images.length === 0) throw new Error(`Gemini não retornou imagem. Status ${status}`);
    return images;
  } else {
    // Imagen predict API
    const aspectMap = { '9:16': '9:16', '16:9': '16:9', '1:1': '1:1' };
    const imagenAspect = aspectMap[aspectRatio] || '1:1';

    let instance;
    if (refBuffers.length > 0) {
      instance = {
        prompt: prompt || 'Compose the product images into the scene naturally with realistic lighting.',
        referenceImages: refBuffers.map((buf, idx) => ({
          referenceType: idx === 0 ? 'REFERENCE_TYPE_SCENE' : 'REFERENCE_TYPE_SUBJECT',
          referenceId: idx + 1,
          referenceImage: { bytesBase64Encoded: buf.toString('base64') },
        })),
      };
    } else {
      instance = { prompt: prompt || 'Product composition photo' };
    }

    const bodyStr = JSON.stringify({
      instances: [instance],
      parameters: {
        sampleCount: Math.min(sampleCount, 4),
        aspectRatio: imagenAspect,
        safetyFilterLevel: 'BLOCK_SOME',
        personGeneration: 'ALLOW_ADULT',
      },
    });

    const { status, json } = await httpsPost(
      'generativelanguage.googleapis.com',
      `/v1beta/models/${model}:predict?key=${apiKey}`,
      {},
      bodyStr
    );

    if (json.error) throw new Error(`Imagen API ${status}: ${json.error.message}`);

    const images = (json.predictions || []).map(p => p.bytesBase64Encoded).filter(Boolean);
    if (images.length === 0) throw new Error(`Imagen não retornou imagem. Status ${status}`);
    return images;
  }
}

async function uploadToStorage(bucket, filePath, buffer, mimeType) {
  return new Promise((resolve, reject) => {
    const uploadUrl = new URL(`/storage/v1/object/${bucket}/${filePath}`, SUPABASE_URL);
    const options = {
      hostname: uploadUrl.hostname,
      path: uploadUrl.pathname,
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': mimeType || 'image/jpeg',
        'Content-Length': buffer.length,
        'x-upsert': 'true',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

// ── HTTP Server ─────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, apikey');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Helper to parse POST body
  async function parseBody() {
    if (req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH') return {};
    try {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      return JSON.parse(Buffer.concat(buffers).toString());
    } catch { return {}; }
  }

  // ── /api/health ────────────────────────────────────────────────────────
  if (url.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, server: 'NanoBanana Local Proxy v1.1' }));
    return;
  }

  // ── /api/manage-credentials ───────────────────────────────────────────
  if (url.pathname === '/api/manage-credentials') {
    const body = await parseBody();
    const action = url.searchParams.get('action') || body.action || (req.method === 'GET' ? 'list' : 'create');

    try {
      if (action === 'list') {
        const result = await supabaseRest('/rest/v1/api_credentials?select=id,label,google_project_ref,priority,enabled,status,last_used_at,cooldown_until,last_error_code,created_at,updated_at&order=priority.desc');
        const list = Array.isArray(result.data) ? result.data.map(item => ({ ...item, masked_key: '••••••••••••••••' })) : [];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ credentials: list }));
        return;
      }

      if (action === 'create') {
        const { label, apiKey, googleProjectRef, priority = 1 } = body;
        if (!label || !apiKey) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Rótulo e API Key são obrigatórios.' }));
          return;
        }
        const encryptedKey = encryptSecret(apiKey.trim());
        await supabaseRest('/rest/v1/api_credentials', 'POST', {
          label: label.trim(),
          encrypted_api_key: encryptedKey,
          google_project_ref: googleProjectRef?.trim() || null,
          priority: Number(priority),
          enabled: true,
          status: 'active',
        });
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Credencial criptografada e salva!', masked_key: maskApiKey(apiKey.trim()) }));
        return;
      }

      if (action === 'delete') {
        await supabaseRest(`/rest/v1/api_credentials?id=eq.${body.id}`, 'DELETE');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Credencial removida.' }));
        return;
      }

      if (action === 'test') {
        const fetchRes = await supabaseRest(`/rest/v1/api_credentials?id=eq.${body.id}&select=encrypted_api_key`);
        const item = fetchRes.data?.[0];
        if (!item) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Chave não encontrada.' }));
          return;
        }
        const plainKey = decryptSecret(item.encrypted_api_key);
        const testOk = await new Promise((resolve) => {
          https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${plainKey}`, (gRes) => {
            resolve(gRes.statusCode === 200);
          }).on('error', () => resolve(false));
        });
        await supabaseRest(`/rest/v1/api_credentials?id=eq.${body.id}`, 'PATCH', {
          status: testOk ? 'active' : 'invalid',
          last_error_code: testOk ? null : 'INVALID_OR_UNAUTHORIZED',
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ valid: testOk, status: testOk ? 'active' : 'invalid' }));
        return;
      }

      // Check quota & status for a key
      if (action === 'check-quota') {
        const fetchRes = await supabaseRest(`/rest/v1/api_credentials?id=eq.${body.id}&select=id,label,encrypted_api_key`);
        const item = fetchRes.data?.[0];
        if (!item) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Chave não encontrada.' }));
          return;
        }
        const plainKey = decryptSecret(item.encrypted_api_key);

        // Probe model generation for quota
        const probeBody = JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'quota-probe' }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        });

        const probeRes = await new Promise((resolve) => {
          const reqProbe = https.request({
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-2.5-flash-image:generateContent?key=${plainKey}`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(probeBody),
            },
          }, (pRes) => {
            let pData = '';
            pRes.on('data', c => pData += c);
            pRes.on('end', () => {
              try { resolve({ statusCode: pRes.statusCode, data: JSON.parse(pData) }); }
              catch { resolve({ statusCode: pRes.statusCode, data: {} }); }
            });
          });
          reqProbe.on('error', (e) => resolve({ statusCode: 500, data: { error: { message: e.message } } }));
          reqProbe.write(probeBody);
          reqProbe.end();
        });

        let quotaStatus = 'available';
        let remainingPercentage = 100;
        let details = 'Cota disponível para geração de imagens.';
        let retryAfter = null;

        if (probeRes.statusCode === 429) {
          quotaStatus = 'exhausted';
          remainingPercentage = 0;
          const retryViolation = probeRes.data?.error?.details?.find(d => d['@type']?.includes('RetryInfo'));
          if (retryViolation?.retryDelay) {
            const secs = parseInt(retryViolation.retryDelay, 10);
            const hours = Math.round(secs / 3600);
            retryAfter = `${hours}h`;
            details = `Cota diária/minuto esgotada. Libera em aprox. ${hours} horas.`;
          } else {
            details = 'Cota esgotada no Google AI Studio (Free Tier).';
          }

          // Update status in db
          await supabaseRest(`/rest/v1/api_credentials?id=eq.${body.id}`, 'PATCH', {
            status: 'cooldown',
            last_error_code: 'QUOTA_EXHAUSTED',
          });
        } else if (probeRes.statusCode === 400 || probeRes.statusCode === 200) {
          // 400 with "IMAGE modality" or 200 means auth & quota exist
          quotaStatus = 'available';
          remainingPercentage = 100;
          details = 'Cota disponível e pronta para uso!';
          await supabaseRest(`/rest/v1/api_credentials?id=eq.${body.id}`, 'PATCH', {
            status: 'active',
            last_error_code: null,
          });
        } else if (probeRes.statusCode === 403 || probeRes.statusCode === 401) {
          quotaStatus = 'invalid';
          remainingPercentage = 0;
          details = 'Chave inválida ou não autorizada pela API Google.';
          await supabaseRest(`/rest/v1/api_credentials?id=eq.${body.id}`, 'PATCH', {
            status: 'invalid',
            last_error_code: 'INVALID_OR_UNAUTHORIZED',
          });
        } else {
          details = probeRes.data?.error?.message || `Status Google: ${probeRes.statusCode}`;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          id: body.id,
          quotaStatus,
          remainingPercentage,
          details,
          retryAfter,
          statusCode: probeRes.statusCode,
        }));
        return;
      }

      if (action === 'update') {
        const { id, enabled, status } = body;
        await supabaseRest(`/rest/v1/api_credentials?id=eq.${id}`, 'PATCH', { enabled, status });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Atualizado com sucesso.' }));
        return;
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // ── /api/list-models ───────────────────────────────────────────────────
  if (url.pathname === '/api/list-models') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      models: [
        { id: 'imagen-3.0-generate-002',      name: 'Imagen 3.0',        badge: 'RECOMENDADO',  description: 'Melhor qualidade fotorrealista, composições naturais.',              speed: 'Padrão' },
        { id: 'imagen-3.0-fast-generate-001', name: 'Imagen 3.0 Fast',   badge: 'RÁPIDO',       description: 'Geração acelerada, ótima para rascunhos e testes.',                speed: 'Rápido' },
        { id: 'gemini-2.0-flash-exp',         name: 'Gemini 2.0 Flash',  badge: 'EXPERIMENTAL', description: 'Modelo multimodal nativo, excelente para edição guiada por texto.', speed: 'Rápido' },
        { id: 'gemini-1.5-pro',               name: 'Gemini 1.5 Pro',    badge: 'AVANÇADO',     description: 'Melhor compreensão de prompt complexo, composições detalhadas.',    speed: 'Avançado' },
      ],
      default: DEFAULT_MODEL,
    }));
    return;
  }

  // ── /api/generate-images ───────────────────────────────────────────────
  if (url.pathname === '/api/generate-images' && req.method === 'POST') {
    const body = await parseBody();
    const { workflow_id, model: requestedModel, individual_prompts = [], retry_failed_only = false } = body;

    if (!workflow_id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'workflow_id é obrigatório.' }));
      return;
    }

    const chosenModel = SUPPORTED_MODELS.includes(requestedModel) ? requestedModel : DEFAULT_MODEL;
    console.log(`[generate-images] workflow=${workflow_id} model=${chosenModel}`);

    try {
      // 1. Fetch workflow
      const wfRes = await supabaseRest(`/rest/v1/workflows?id=eq.${workflow_id}&select=*`);
      const wf = Array.isArray(wfRes.data) ? wfRes.data[0] : wfRes.data;
      if (!wf) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Workflow não encontrado.' }));
        return;
      }

      // 2. Resolve provider and API credential
      let apiKey = null;
      let cred = null;

      if (chosenModel !== 'free-flux-synthesis') {
        const credRes = await supabaseRest('/rest/v1/api_credentials?enabled=eq.true&status=eq.active&order=priority.desc&limit=1&select=id,encrypted_api_key,label');
        const credList = Array.isArray(credRes.data) ? credRes.data : [];
        cred = credList[0];
        if (!cred) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Nenhuma chave Google API ativa. Alterne o modelo para "Nano Flux (100% Grátis)" ou adicione uma chave nas Configurações.' }));
          return;
        }
        apiKey = decryptSecret(cred.encrypted_api_key);
        await supabaseRest(`/rest/v1/api_credentials?id=eq.${cred.id}`, 'PATCH', {
          last_used_at: new Date().toISOString(),
        });
      }

      // 3. Fetch reference images
      const imgRes = await supabaseRest(`/rest/v1/workflow_images?workflow_id=eq.${workflow_id}&role=eq.reference&order=position.asc&select=*`);
      const refImages = Array.isArray(imgRes.data) ? imgRes.data : [];
      console.log(`[generate-images] ${refImages.length} reference images found`);

      // Download reference image buffers
      const refBuffers = [];
      for (const img of refImages) {
        try {
          const signedRes = await supabaseRest(
            `/storage/v1/object/sign/image-references/${img.storage_path}`,
            'POST',
            { expiresIn: 300 }
          );
          const signedPath = signedRes.data?.signedURL;
          if (signedPath) {
            const signedFullUrl = signedPath.startsWith('http') ? signedPath : `${SUPABASE_URL}${signedPath}`;
            const buf = await downloadBuffer(signedFullUrl);
            refBuffers.push(buf);
            console.log(`[generate-images] Downloaded ref image: ${img.storage_path} (${buf.length} bytes)`);
          }
        } catch (e) {
          console.warn(`[generate-images] Could not download ref ${img.storage_path}:`, e.message);
        }
      }

      // 4. Mark workflow as processing
      await supabaseRest(`/rest/v1/workflows?id=eq.${workflow_id}`, 'PATCH', {
        status: 'processing',
        updated_at: new Date().toISOString(),
      });

      const outputCount = wf.output_count || 1;
      const mainPrompt = wf.prompt || '';
      const results = [];
      const errors = [];
      const isGemini = chosenModel.startsWith('gemini-');

      // 5. Generate images
      if (chosenModel === 'free-flux-synthesis') {
        // ── 100% Free Flux / Pollinations AI Generator (Image-to-Image Conditioning) ──
        const aspectMap = { '9:16': { w: 768, h: 1344 }, '16:9': { w: 1344, h: 768 }, '1:1': { w: 1024, h: 1024 } };
        const dims = aspectMap[wf.aspect_ratio] || { w: 1024, h: 1024 };

        // Reference URLs to feed into synthesis
        const refPublicUrls = refImages.map(
          img => `${SUPABASE_URL}/storage/v1/object/public/image-references/${img.storage_path}`
        );

        for (let i = 0; i < outputCount; i++) {
          const perPrompt = (individual_prompts[i] || '').trim() || mainPrompt;
          try {
            console.log(`[free-flux] Generating output #${i + 1} with ${refPublicUrls.length} references...`);
            const seed = Math.floor(Math.random() * 9999999);
            const encodedPrompt = encodeURIComponent(perPrompt + ', photorealistic, master composition, 8k resolution');

            // Pass the primary scene/product reference image into the conditioning pipe
            let pollUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${dims.w}&height=${dims.h}&seed=${seed}&nologo=true&model=flux`;
            if (refPublicUrls.length > 0) {
              // Conditioning on uploaded reference
              pollUrl += `&image=${encodeURIComponent(refPublicUrls[0])}`;
            }

            const imgBuffer = await downloadBuffer(pollUrl);
            const storagePath = `results/${workflow_id}/output_${i + 1}_${Date.now()}.jpg`;

            await uploadToStorage('image-results', storagePath, imgBuffer, 'image/jpeg');
            await supabaseRest('/rest/v1/workflow_images', 'POST', {
              workflow_id,
              user_id: wf.user_id,
              role: 'result',
              position: i + 1,
              storage_path: storagePath,
              mime_type: 'image/jpeg',
              file_size: imgBuffer.length,
              prompt: perPrompt,
              status: 'completed',
            });

            results.push({ position: i + 1, storage_path: storagePath });
            console.log(`[free-flux] Saved output ${i + 1} (${imgBuffer.length} bytes): ${storagePath}`);
          } catch (fluxErr) {
            console.error(`[free-flux] Output ${i + 1} failed:`, fluxErr.message);
            errors.push({ position: i + 1, error: fluxErr.message });
          }
        }
      } else if (isGemini) {
        // Gemini: generate one at a time
        for (let i = 0; i < outputCount; i++) {
          const perPrompt = (individual_prompts[i] || '').trim() || mainPrompt;
          try {
            const images = await callGoogleImagenAPI(apiKey, chosenModel, perPrompt, refBuffers, wf.aspect_ratio || '1:1', 1);
            for (const imgB64 of images) {
              const buf = Buffer.from(imgB64, 'base64');
              const storagePath = `results/${workflow_id}/output_${i + 1}_${Date.now()}.jpg`;
              await uploadToStorage('image-results', storagePath, buf, 'image/jpeg');
              await supabaseRest('/rest/v1/workflow_images', 'POST', {
                workflow_id, user_id: wf.user_id, role: 'result',
                position: i + 1, storage_path: storagePath,
                mime_type: 'image/jpeg', file_size: buf.length,
                prompt: perPrompt, status: 'completed',
              });
              results.push({ position: i + 1, storage_path: storagePath });
              console.log(`[generate-images] Saved output ${i + 1}: ${storagePath}`);
            }
          } catch (e) {
            console.error(`[generate-images] Output ${i + 1} failed:`, e.message);
            errors.push({ position: i + 1, error: e.message });
            if (e.message.includes('403') || e.message.includes('UNAUTHENTICATED') || e.message.includes('API_KEY')) {
              await supabaseRest(`/rest/v1/api_credentials?id=eq.${cred.id}`, 'PATCH', { status: 'invalid', last_error_code: 'INVALID_OR_UNAUTHORIZED' });
            }
          }
        }
      } else {
        // Imagen: batch call for all outputs
        try {
          const images = await callGoogleImagenAPI(apiKey, chosenModel, mainPrompt, refBuffers, wf.aspect_ratio || '1:1', outputCount);
          for (let i = 0; i < images.length; i++) {
            const buf = Buffer.from(images[i], 'base64');
            const storagePath = `results/${workflow_id}/output_${i + 1}_${Date.now()}.jpg`;
            await uploadToStorage('image-results', storagePath, buf, 'image/jpeg');
            await supabaseRest('/rest/v1/workflow_images', 'POST', {
              workflow_id, user_id: wf.user_id, role: 'result',
              position: i + 1, storage_path: storagePath,
              mime_type: 'image/jpeg', file_size: buf.length,
              prompt: mainPrompt, status: 'completed',
            });
            results.push({ position: i + 1, storage_path: storagePath });
            console.log(`[generate-images] Saved output ${i + 1}: ${storagePath}`);
          }
        } catch (e) {
          console.error('[generate-images] Imagen batch failed:', e.message);
          for (let i = 0; i < outputCount; i++) errors.push({ position: i + 1, error: e.message });
          if (e.message.includes('403') || e.message.includes('UNAUTHENTICATED') || e.message.includes('API_KEY')) {
            await supabaseRest(`/rest/v1/api_credentials?id=eq.${cred.id}`, 'PATCH', { status: 'invalid', last_error_code: 'INVALID_OR_UNAUTHORIZED' });
          }
        }
      }

      // 6. Final status
      const finalStatus = results.length === 0 ? 'failed' : errors.length > 0 ? 'partial' : 'completed';
      await supabaseRest(`/rest/v1/workflows?id=eq.${workflow_id}`, 'PATCH', {
        status: finalStatus, updated_at: new Date().toISOString(),
      });

      console.log(`[generate-images] Done. status=${finalStatus} results=${results.length} errors=${errors.length}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true, workflow_id, status: finalStatus,
        model: chosenModel, results_count: results.length, errors_count: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      }));
      return;
    } catch (err) {
      console.error('[generate-images] Fatal error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // ── 404 ────────────────────────────────────────────────────────────────
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Rota não encontrada' }));
});

server.listen(PORT, () => {
  console.log(`[NanoBanana Backend] Server running on http://localhost:${PORT}`);
  console.log(`[NanoBanana Backend] Default model: ${DEFAULT_MODEL}`);
});
