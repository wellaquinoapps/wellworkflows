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

// Helper to make request to Supabase REST with service role
function supabaseRest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, SUPABASE_URL);
    const options = {
      method,
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

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

  // Endpoint: /api/manage-credentials
  if (url.pathname === '/api/manage-credentials') {
    let body = {};
    if (req.method === 'POST') {
      try {
        const buffers = [];
        for await (const chunk of req) buffers.push(chunk);
        body = JSON.parse(Buffer.concat(buffers).toString());
      } catch (e) {
        body = {};
      }
    }

    const action = url.searchParams.get('action') || body.action || (req.method === 'GET' ? 'list' : 'create');

    try {
      // 1. LIST
      if (action === 'list') {
        const result = await supabaseRest('/rest/v1/api_credentials?select=id,label,google_project_ref,priority,enabled,status,last_used_at,cooldown_until,last_error_code,created_at,updated_at&order=priority.desc');
        const list = Array.isArray(result.data) ? result.data.map(item => ({
          ...item,
          masked_key: '••••••••••••••••',
        })) : [];

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ credentials: list }));
        return;
      }

      // 2. CREATE
      if (action === 'create') {
        const { label, apiKey, googleProjectRef, priority = 1 } = body;
        if (!label || !apiKey) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Rótulo e API Key são obrigatórios.' }));
          return;
        }

        const encryptedKey = encryptSecret(apiKey.trim());

        const insertRes = await supabaseRest('/rest/v1/api_credentials', 'POST', {
          label: label.trim(),
          encrypted_api_key: encryptedKey,
          google_project_ref: googleProjectRef?.trim() || null,
          priority: Number(priority),
          enabled: true,
          status: 'active',
        });

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          message: 'Credencial criptografada e salva com sucesso!',
          masked_key: maskApiKey(apiKey.trim()),
        }));
        return;
      }

      // 3. DELETE
      if (action === 'delete') {
        const { id } = body;
        await supabaseRest(`/rest/v1/api_credentials?id=eq.${id}`, 'DELETE');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Credencial removida com sucesso.' }));
        return;
      }

      // 4. TEST KEY
      if (action === 'test') {
        const { id } = body;
        const fetchRes = await supabaseRest(`/rest/v1/api_credentials?id=eq.${id}&select=encrypted_api_key`);
        const item = fetchRes.data?.[0];
        if (!item) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Chave não encontrada.' }));
          return;
        }

        const plainKey = decryptSecret(item.encrypted_api_key);
        // Test key with Google endpoint
        const testRes = await new Promise((resolve) => {
          https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${plainKey}`, (gRes) => {
            resolve(gRes.statusCode === 200);
          }).on('error', () => resolve(false));
        });

        await supabaseRest(`/rest/v1/api_credentials?id=eq.${id}`, 'PATCH', {
          status: testRes ? 'active' : 'invalid',
          last_error_code: testRes ? null : 'INVALID_OR_UNAUTHORIZED',
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ valid: testRes, status: testRes ? 'active' : 'invalid' }));
        return;
      }

      // 5. TOGGLE / UPDATE
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

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Rota não encontrada' }));
});

server.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});
