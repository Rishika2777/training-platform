import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';

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

type UpstreamKind = 'STUDENT' | 'CAMPUS' | 'COMPANY' | 'AUTH' | 'ADMIN' | 'COMMON' | 'DEFAULT';

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
  const common = normalizeServiceBaseUrl(
    process.env['COMMON_SERVICE_URL'] ?? process.env['SYNKUP_COMMON_API_BASE_URL'],
  );
  const fallback = normalizeServiceBaseUrl(process.env['SYNKUP_API_BASE_URL']);

  const STUDENT_PREFIXES = [
    '/api/v1/student',
    '/api/v1/students',
    '/api/v1/batchmates',
    '/api/v1/admin/students',
    '/api/v1/placed-students',
    '/api/v1/public-landing',
    '/api/v1/files',
    '/api/v1/follower',
  ];
  const CAMPUS_PREFIXES = [
    '/api/v1/campus',
    '/api/v1/faculty',
    '/api/v1/prospectus',
    '/api/v1/dashboard',
    '/api/v1/courses',
    '/api/v1/public/landing',
      '/api/v1/departments', 
    '/api/v1/guest/landing',
     '/api/v1/notice-board',
  ];
  const COMPANY_PREFIXES = [
    '/api/v1/company',
    '/api/v1/preferred-campus',
    '/api/v1/clients',
    '/api/v1/specializations',
    '/api/v1/company-landing',
    '/api/v1/apply/vacancy',
     '/api/v1/vacancy',
    '/api/v1/vision',
    '/api/v1/benefits-offer',
  ];
  const AUTH_PREFIXES = ['/api/v1/auth', '/api/v1/users', '/api/v1/contact-support'];
  const COMMON_PREFIXES = ['/api/v1/common', '/api/v1/feed', '/api/v1/notifications'];

  // /api/v1/recommendation is used by BOTH company (port 8083) and student (port 8082)
  // Route by query param: target=company -> COMPANY, else -> STUDENT
  if (reqPath.startsWith('/api/v1/recommendation')) {
    const queryIndex = reqPath.indexOf('?');
    const query = queryIndex >= 0 ? reqPath.slice(queryIndex) : '';
    return query.includes('target=company') ? (company ?? fallback) : (student ?? fallback);
  }

  // Route /api/v1/public-landing/<id>/... by id prefix: com_ -> COMPANY, stu_ -> STUDENT
  if (reqPath.startsWith('/api/v1/public-landing/')) {
    const afterPrefix = reqPath.slice('/api/v1/public-landing/'.length);
    const firstSegment = afterPrefix.split('/')[0] ?? '';
    if (firstSegment.startsWith('com_')) {
      return company ?? fallback;
    }
    if (firstSegment.startsWith('stu_')) {
      return student ?? fallback;
    }
  }

  const matchesPrefix = (prefixes: readonly string[]): boolean =>
    prefixes.some((prefix: string) => reqPath.startsWith(prefix));

  const kind: UpstreamKind = matchesPrefix(STUDENT_PREFIXES)
    ? 'STUDENT'
    : matchesPrefix(CAMPUS_PREFIXES)
      ? 'CAMPUS'
      : matchesPrefix(COMPANY_PREFIXES)
        ? 'COMPANY'
        : reqPath.startsWith('/api/v1/admin')
          ? 'ADMIN'
          : matchesPrefix(AUTH_PREFIXES)
            ? 'AUTH'
            : matchesPrefix(COMMON_PREFIXES)
              ? 'COMMON'
              : 'DEFAULT';

  if (kind === 'STUDENT') return student ?? fallback;
  if (kind === 'CAMPUS') return campus ?? fallback;
  if (kind === 'COMPANY') return company ?? fallback;
  if (kind === 'ADMIN') return admin ?? auth ?? fallback;
  if (kind === 'AUTH') return auth ?? fallback;
  if (kind === 'COMMON') return common ?? fallback;
  return fallback;
}

const STUDENT_PREFIXES = [
  '/api/v1/student',
  '/api/v1/students',
  '/api/v1/batchmates',
  '/api/v1/admin/students',
  '/api/v1/placed-students',
  '/api/v1/public-landing',
  '/api/v1/recommendation',
  '/api/v1/files',
] as const;
const CAMPUS_PREFIXES = [
  '/api/v1/campus',
  '/api/v1/faculty',
  '/api/v1/prospectus',
  '/api/v1/dashboard',
  '/api/v1/courses',
    '/api/v1/departments',
  '/api/v1/public/landing',
] as const;
const COMPANY_PREFIXES = [
  '/api/v1/company',
  '/api/v1/preferred-campus',
  '/api/v1/clients',
  '/api/v1/specializations',
  '/api/v1/company-landing',
  '/api/v1/apply/vacancy',
       '/api/v1/vacancy',
  '/api/v1/vision',
  '/api/v1/benefits-offer',
] as const;
const AUTH_PREFIXES = ['/api/v1/auth', '/api/v1/users', '/api/v1/contact-support', '/api/v1/admin'] as const;
const COMMON_PREFIXES = ['/api/v1/common', '/api/v1/feed'] as const;

function getUpstreamKindForPath(reqPath: string): UpstreamKind {
  if (reqPath.startsWith('/api/v1/recommendation')) {
    return reqPath.includes('target=company') ? 'COMPANY' : 'STUDENT';
  }
  if (reqPath.startsWith('/api/v1/public-landing/')) {
    const afterPrefix = reqPath.slice('/api/v1/public-landing/'.length);
    const firstSegment = afterPrefix.split('/')[0] ?? '';
    if (firstSegment.startsWith('com_')) return 'COMPANY';
    if (firstSegment.startsWith('stu_')) return 'STUDENT';
  }
  const matchesPrefix = (prefixes: readonly string[]) =>
    prefixes.some((prefix: string) => reqPath.startsWith(prefix));
  if (matchesPrefix(STUDENT_PREFIXES)) return 'STUDENT';
  if (matchesPrefix(CAMPUS_PREFIXES)) return 'CAMPUS';
  if (matchesPrefix(COMPANY_PREFIXES)) return 'COMPANY';
  if (reqPath.startsWith('/api/v1/admin')) return 'ADMIN';
  if (matchesPrefix(AUTH_PREFIXES)) return 'AUTH';
  if (matchesPrefix(COMMON_PREFIXES)) return 'COMMON';
  return 'DEFAULT';
}

const UPSTREAM_ENV_VARS: Record<UpstreamKind, readonly string[]> = {
  STUDENT: ['STUDENT_SERVICE_URL', 'SYNKUP_STUDENT_API_BASE_URL', 'SYNKUP_API_BASE_URL'],
  CAMPUS: ['CAMPUS_SERVICE_URL', 'SYNKUP_CAMPUS_API_BASE_URL', 'SYNKUP_API_BASE_URL'],
  COMPANY: ['COMPANY_SERVICE_URL', 'SYNKUP_COMPANY_API_BASE_URL', 'SYNKUP_API_BASE_URL'],
  AUTH: ['AUTH_SERVICE_URL', 'SYNKUP_API_BASE_URL'],
  ADMIN: ['ADMIN_SERVICE_URL', 'SYNKUP_API_BASE_URL'],
  COMMON: ['COMMON_SERVICE_URL', 'SYNKUP_COMMON_API_BASE_URL', 'SYNKUP_API_BASE_URL'],
  DEFAULT: ['SYNKUP_API_BASE_URL'],
};

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

/** Replace ${VAR} in value using process.env (for already-loaded and current batch). */
function expandEnvValue(value: string, applied: Record<string, string>): string {
  return value.replace(/\$\{([A-Za-z0-9_]+)\}/g, (_, name) => {
    if (process.env[name] !== undefined) return process.env[name] ?? '';
    if (applied[name] !== undefined) return applied[name] ?? '';
    return '';
  });
}

function loadDotEnvFromPath(envPath: string): boolean {
  try {
    const raw = readFileSync(envPath, 'utf8');
    const parsed = parseDotEnv(raw);
    console.log('Loading .env from:', envPath);
    const applied: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined) {
        const value = expandEnvValue(v, applied);
        process.env[k] = value;
        applied[k] = value;
        console.log('Loaded env:', k, '= ***');
      }
    }
    return true;
  } catch {
    return false;
  }
}

function loadDotEnvIfPresent(): boolean {
  const candidates = [
    join(process.cwd(), '.env'),
    join(import.meta.dirname, '.env'),
    join(import.meta.dirname, '..', '.env'),
    join(import.meta.dirname, '..', '..', '.env'),
  ];
  for (const envPath of candidates) {
    if (loadDotEnvFromPath(envPath)) {
      return true;
    }
  }
  return false;
}

// Load `.env` for local dev / deployments (no external deps).
// Note: .bashrc / .profile are NOT read by Node when started by npm/pm2/systemd. Use .env on the server.
const envLoaded = loadDotEnvIfPresent();

const UPSTREAM_ENV_KEYS = [
  'SYNKUP_API_BASE_URL',
  'COMMON_SERVICE_URL',
  'SYNKUP_COMMON_API_BASE_URL',
  'STUDENT_SERVICE_URL',
  'CAMPUS_SERVICE_URL',
  'COMPANY_SERVICE_URL',
  'AUTH_SERVICE_URL',
  'ADMIN_SERVICE_URL',
] as const;

function logUpstreamEnvAtStartup(): void {
  const set = UPSTREAM_ENV_KEYS.filter((k) => process.env[k]);
  const missing = UPSTREAM_ENV_KEYS.filter((k) => !process.env[k]);
  if (set.length > 0) {
    console.log('Upstream env set:', set.join(', '));
  }
  if (missing.length > 0) {
    console.warn('Upstream env not set (API proxy may return 502):', missing.join(', '));
    if (!envLoaded) {
      console.warn(
        'No .env file was loaded. On the server, put a .env file in the app directory (same folder as server or project root). .bashrc is not used by Node.',
      );
    }
  }
}

logUpstreamEnvAtStartup();

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
    const kind = getUpstreamKindForPath(req.originalUrl);
    const envVars = UPSTREAM_ENV_VARS[kind];
    const message =
      envVars.length > 0
        ? `Upstream service URL not configured for this request. Set ${envVars.join(' or ')} on the server environment.`
        : 'Upstream service URL not configured. Set SYNKUP_API_BASE_URL on the server environment.';
    console.error('❌ Upstream service URL not configured for:', req.originalUrl, '| kind:', kind);
    console.error('Set one of:', envVars);
    res.status(502).json({
      success: false,
      message,
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
    let contentType = '';
    response.headers.forEach((v, k) => {
      const lowerKey = k.toLowerCase();
      if (lowerKey === 'content-type') {
        contentType = (v ?? '').toLowerCase();
      }
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
        lowerKey === 'content-length' // skip for streaming; buffer path may change length
      ) {
        return;
      }
      res.setHeader(k, v);
    });

    // SSE: stream the body instead of buffering to avoid hanging on long-lived streams
    if (contentType.includes('text/event-stream') && response.body != null) {
      const nodeStream = Readable.fromWeb(response.body as Parameters<typeof Readable.fromWeb>[0]);
      nodeStream.pipe(res);
      return;
    }

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

    // S3 upload from browser (read from .env; do not commit .env)
    AWS_S3_ACCESS_KEY_ID: process.env['AWS_S3_ACCESS_KEY_ID'],
    AWS_S3_SECRET_ACCESS_KEY: process.env['AWS_S3_SECRET_ACCESS_KEY'],
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
  const host = process.env['HOST'] || '0.0.0.0';
  app.listen(Number(port), host, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://${host}:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
