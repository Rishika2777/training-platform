import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

function normalizeServiceBaseUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
  }
  // Support host:port/path without protocol
  const withProto = `http://${trimmed}`;
  return withProto.endsWith('/') ? withProto.slice(0, -1) : withProto;
}

type UpstreamKind = 'STUDENT' | 'CAMPUS' | 'COMPANY' | 'AUTH' | 'ADMIN' | 'DEFAULT';

function resolveUpstreamBase(reqPath: string): string | null {
  // Prefer service-specific URLs; fall back to generic API base if provided.
  const student = normalizeServiceBaseUrl(
    process.env['STUDENT_SERVICE_URL'] ?? process.env['SYNKUP_STUDENT_API_BASE_URL'],
  );
  const campus = normalizeServiceBaseUrl(
    process.env['CAMPUS_SERVICE_URL'] ?? process.env['SYNKUP_CAMPUS_API_BASE_URL'],
  );
  const company = normalizeServiceBaseUrl(
    process.env['COMPANY_SERVICE_URL'] ?? process.env['CAMPANY_SERVICE_URL'] ?? process.env['SYNKUP_COMPANY_API_BASE_URL'],
  );
  const auth = normalizeServiceBaseUrl(process.env['AUTH_SERVICE_URL'] ?? process.env['SYNKUP_API_BASE_URL']);
  const admin = normalizeServiceBaseUrl(process.env['ADMIN_SERVICE_URL'] ?? process.env['SYNKUP_API_BASE_URL']);
  const fallback = normalizeServiceBaseUrl(process.env['SYNKUP_API_BASE_URL']);

  const kind: UpstreamKind =
    reqPath.startsWith('/api/v1/student') ||
    reqPath.startsWith('/api/v1/students') ||
    reqPath.startsWith('/api/v1/batchmates') ||
    reqPath.startsWith('/api/v1/placed-students')
      ? 'STUDENT'
      : reqPath.startsWith('/api/v1/campus') ||
        reqPath.startsWith('/api/v1/faculty') ||
        reqPath.startsWith('/api/v1/prospectus') ||
        reqPath.startsWith('/api/v1/dashboard')
        ? 'CAMPUS'
        : reqPath.startsWith('/api/v1/company')
          ? 'COMPANY'
          : reqPath.startsWith('/api/v1/admin')
            ? 'ADMIN'
            : reqPath.startsWith('/api/v1/auth') || reqPath.startsWith('/api/v1/users')
              ? 'AUTH'
              : 'DEFAULT';

  if (kind === 'STUDENT') return student ?? fallback;
  if (kind === 'CAMPUS') return campus ?? fallback;
  if (kind === 'COMPANY') return company ?? fallback;
  if (kind === 'ADMIN') return admin ?? fallback;
  if (kind === 'AUTH') return auth ?? fallback;
  return fallback;
}

function shouldHaveBody(method: string): boolean {
  const m = method.toUpperCase();
  return m !== 'GET' && m !== 'HEAD';
}

type NodeFetchRequestInit = RequestInit & { duplex?: 'half' };

async function readIncomingBody(req: express.Request): Promise<ArrayBuffer | null> {
  if (!shouldHaveBody(req.method)) {
    return null;
  }

  return await new Promise<ArrayBuffer>((resolve, reject) => {
    const chunks: Uint8Array[] = [];

    req.on('data', (chunk: unknown) => {
      if (chunk instanceof Uint8Array) {
        chunks.push(chunk);
        return;
      }
      // Express/Node should give us Buffer/Uint8Array; anything else is unexpected.
      reject(new Error('Unsupported request body chunk type'));
    });

    req.on('end', () => {
      const total = chunks.reduce((sum, c) => sum + c.byteLength, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.byteLength;
      }
      resolve(merged.buffer);
    });

    req.on('error', (err: unknown) => {
      reject(err instanceof Error ? err : new Error('Failed to read request body'));
    });
  });
}

function parseDotEnv(contents: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const idx = line.indexOf('=');
    if (idx <= 0) {
      continue;
    }
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) {
      result[key] = value;
    }
  }
  return result;
}

function loadDotEnvIfPresent(): void {
  try {
    const envPath = join(process.cwd(), '.env');
    const raw = readFileSync(envPath, 'utf8');
    const parsed = parseDotEnv(raw);
    console.log('Loading .env file from:', envPath);
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined) {
        process.env[k] = v;
        console.log(`Loaded env: ${k} = ${v}`);
      }
    }
    console.log('CAMPUS_SERVICE_URL:', process.env['CAMPUS_SERVICE_URL']);
  } catch (err) {
    console.error('Failed to load .env file:', err);
  }
}

// Load `.env` for local dev / deployments (no external deps).
loadDotEnvIfPresent();

/**
 * Helper function to set CORS headers on the response.
 */
function setCorsHeaders(req: express.Request, res: express.Response): void {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    // Avoid caching one origin's response and serving it to a different origin.
    res.setHeader('Vary', 'Origin');
  } else {
    // If no origin header (same-origin request), allow all (or set specific origin)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  // Echo requested headers for preflight to avoid missing a custom header and failing OPTIONS.
  const requestHeaders = req.headers['access-control-request-headers'];
  const allowHeaders =
    typeof requestHeaders === 'string' && requestHeaders.trim()
      ? requestHeaders
      : 'Content-Type, Authorization, X-Requested-With, X-User-Id, X-Skip-Auth';
  res.setHeader('Access-Control-Allow-Headers', allowHeaders);
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
}

/**
 * Same-origin reverse proxy to avoid browser CORS.
 *
 * The browser calls `/api/v1/...` on this server (localhost:5500).
 * This server forwards the request to the appropriate upstream service URL
 * (e.g. STUDENT_SERVICE_URL), and streams back the response.
 */
app.use('/api/v1', async (req, res) => {
  // Handle CORS preflight (OPTIONS) requests immediately
  if (req.method === 'OPTIONS') {
    setCorsHeaders(req, res);
    res.status(204).end();
    return;
  }

  const upstreamBase = resolveUpstreamBase(req.originalUrl);
  if (!upstreamBase) {
    setCorsHeaders(req, res);
    console.error('❌ Upstream service URL not configured for:', req.originalUrl);
    console.error('Available env vars:', {
      CAMPUS_SERVICE_URL: process.env['CAMPUS_SERVICE_URL'],
      SYNKUP_CAMPUS_API_BASE_URL: process.env['SYNKUP_CAMPUS_API_BASE_URL'],
    });
    res.status(502).json({
      success: false,
      message:
        'Upstream service URL not configured. Set CAMPUS_SERVICE_URL (and others) on the server environment.',
    });
    return;
  }

  // Construct target URL: req.originalUrl (e.g., "/api/v1/student/...") is resolved against upstreamBase
  const targetUrl = new URL(req.originalUrl, upstreamBase);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    // Skip CORS-related headers that shouldn't be forwarded to upstream
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'host' || lowerKey === 'origin' || lowerKey === 'referer') {
      continue;
    }
    if (Array.isArray(value)) {
      headers.set(key, value.join(', '));
      continue;
    }
    headers.set(key, value);
  }
  // Let fetch set Host based on the target URL
  headers.delete('host');

  try {
    const body = await readIncomingBody(req);
    const init: NodeFetchRequestInit = {
      method: req.method,
      headers,
      body: body ?? undefined,
      duplex: body ? 'half' : undefined,
    };

    const response = await fetch(targetUrl, init);

    // Set CORS headers before setting other response headers
    setCorsHeaders(req, res);

    res.status(response.status);

    // Forward response headers from upstream, but skip hop-by-hop headers and CORS headers
    response.headers.forEach((v, k) => {
      const lowerKey = k.toLowerCase();
      // Skip hop-by-hop headers that shouldn't be forwarded
      if (
        lowerKey === 'transfer-encoding' ||
        lowerKey === 'connection' ||
        lowerKey === 'keep-alive' ||
        lowerKey === 'proxy-authenticate' ||
        lowerKey === 'proxy-authorization' ||
        lowerKey === 'te' ||
        lowerKey === 'trailer' ||
        lowerKey === 'upgrade'
      ) {
        return;
      }
      // Don't forward CORS headers from upstream (we set our own)
      if (
        lowerKey.startsWith('access-control-') ||
        lowerKey === 'content-encoding' || // fetch may transparently decode; we serve raw bytes below
        lowerKey === 'content-length' // we buffer and re-send; content-length may no longer match
      ) {
        return;
      }
      res.setHeader(k, v);
    });

    const responseBody = new Uint8Array(await response.arrayBuffer());
    res.end(responseBody);
  } catch (err) {
    setCorsHeaders(req, res);
    res.status(502).json({
      success: false,
      message: 'Proxy request failed',
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Expose public env config to the browser runtime (NO secrets).
 * The browser reads this via `globalThis.__env`.
 */
app.get('/assets/env.js', (_req, res) => {
  const publicEnv = {
    SYNKUP_API_BASE_URL: process.env['SYNKUP_API_BASE_URL'],
    SYNKUP_STUDENT_API_BASE_URL: process.env['SYNKUP_STUDENT_API_BASE_URL'],
    SYNKUP_CAMPUS_API_BASE_URL: process.env['SYNKUP_CAMPUS_API_BASE_URL'],
    SYNKUP_COMPANY_API_BASE_URL: process.env['SYNKUP_COMPANY_API_BASE_URL'],
    SYNKUP_SWAGGER_DOCS_URL: process.env['SYNKUP_SWAGGER_DOCS_URL'],

    // Aliases (if you prefer service-specific naming)
    AUTH_SERVICE_URL: process.env['AUTH_SERVICE_URL'],
    STUDENT_SERVICE_URL: process.env['STUDENT_SERVICE_URL'],
    CAMPUS_SERVICE_URL: process.env['CAMPUS_SERVICE_URL'],
    COMPANY_SERVICE_URL: process.env['COMPANY_SERVICE_URL'],
    CAMPANY_SERVICE_URL: process.env['CAMPANY_SERVICE_URL'],
    ADMIN_SERVICE_URL: process.env['ADMIN_SERVICE_URL'],
  };

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.send(`globalThis.__env = ${JSON.stringify(publicEnv)};`);
});

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 5500;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
