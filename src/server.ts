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
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] === undefined) {
        process.env[k] = v;
      }
    }
  } catch {
    // no .env present (or unreadable) - ignore
  }
}

// Load `.env` for local dev / deployments (no external deps).
loadDotEnvIfPresent();

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
