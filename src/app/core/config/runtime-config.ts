import { APP_CONFIG, type AppConfig } from './app.constants';

export interface PublicEnvConfig {
  SYNKUP_API_BASE_URL?: string;
  SYNKUP_STUDENT_API_BASE_URL?: string;
  SYNKUP_CAMPUS_API_BASE_URL?: string;
  SYNKUP_COMPANY_API_BASE_URL?: string;
  SYNKUP_SWAGGER_DOCS_URL?: string;

  // Aliases supported for backend/multi-service env naming
  AUTH_SERVICE_URL?: string;
  STUDENT_SERVICE_URL?: string;
  CAMPUS_SERVICE_URL?: string;
  COMPANY_SERVICE_URL?: string;
  CAMPANY_SERVICE_URL?: string;
}

function readWindowEnv(): PublicEnvConfig | null {
  const g = globalThis as unknown as { __env?: unknown };
  if (!g.__env || typeof g.__env !== 'object') {
    return null;
  }
  return g.__env as PublicEnvConfig;
}

function readProcessEnv(key: keyof PublicEnvConfig): string | undefined {
  const g = globalThis as unknown as { process?: { env?: Record<string, string | undefined> } };
  return g.process?.env?.[key];
}

function normalizeBaseUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * In the browser we should avoid absolute service URLs (cross-origin) because it triggers CORS.
 * Allow only relative base URLs like "/api/v1" from `globalThis.__env`.
 */
function normalizeBrowserBaseUrl(value: string | undefined): string | undefined {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) {
    return undefined;
  }
  return normalized.startsWith('/') ? normalized : undefined;
}

/**
 * Resolve final config:
 * - Browser: `globalThis.__env` (served from `/assets/env.js`)
 * - Server: `process.env`
 * - Fallback: `APP_CONFIG` defaults
 */
export function resolveAppConfig(): AppConfig {
  const fromWindow = readWindowEnv();
  const isBrowser = isBrowserRuntime();

  const apiBase =
    (isBrowser ? normalizeBrowserBaseUrl(fromWindow?.SYNKUP_API_BASE_URL) : normalizeBaseUrl(fromWindow?.SYNKUP_API_BASE_URL)) ??
    (isBrowser ? normalizeBrowserBaseUrl(fromWindow?.AUTH_SERVICE_URL) : normalizeBaseUrl(fromWindow?.AUTH_SERVICE_URL)) ??
    normalizeBaseUrl(readProcessEnv('SYNKUP_API_BASE_URL')) ??
    normalizeBaseUrl(readProcessEnv('AUTH_SERVICE_URL')) ??
    APP_CONFIG.API_BASE_URL;

  const studentBase =
    (isBrowser
      ? normalizeBrowserBaseUrl(fromWindow?.SYNKUP_STUDENT_API_BASE_URL)
      : normalizeBaseUrl(fromWindow?.SYNKUP_STUDENT_API_BASE_URL)) ??
    (isBrowser ? normalizeBrowserBaseUrl(fromWindow?.STUDENT_SERVICE_URL) : normalizeBaseUrl(fromWindow?.STUDENT_SERVICE_URL)) ??
    normalizeBaseUrl(readProcessEnv('SYNKUP_STUDENT_API_BASE_URL')) ??
    normalizeBaseUrl(readProcessEnv('STUDENT_SERVICE_URL')) ??
    APP_CONFIG.STUDENT_API_BASE_URL;

  const campusBase =
    (isBrowser
      ? normalizeBrowserBaseUrl(fromWindow?.SYNKUP_CAMPUS_API_BASE_URL)
      : normalizeBaseUrl(fromWindow?.SYNKUP_CAMPUS_API_BASE_URL)) ??
    (isBrowser ? normalizeBrowserBaseUrl(fromWindow?.CAMPUS_SERVICE_URL) : normalizeBaseUrl(fromWindow?.CAMPUS_SERVICE_URL)) ??
    normalizeBaseUrl(readProcessEnv('SYNKUP_CAMPUS_API_BASE_URL')) ??
    normalizeBaseUrl(readProcessEnv('CAMPUS_SERVICE_URL')) ??
    APP_CONFIG.CAMPUS_API_BASE_URL;

  const companyBase =
    (isBrowser
      ? normalizeBrowserBaseUrl(fromWindow?.SYNKUP_COMPANY_API_BASE_URL)
      : normalizeBaseUrl(fromWindow?.SYNKUP_COMPANY_API_BASE_URL)) ??
    (isBrowser ? normalizeBrowserBaseUrl(fromWindow?.COMPANY_SERVICE_URL) : normalizeBaseUrl(fromWindow?.COMPANY_SERVICE_URL)) ??
    (isBrowser ? normalizeBrowserBaseUrl(fromWindow?.CAMPANY_SERVICE_URL) : normalizeBaseUrl(fromWindow?.CAMPANY_SERVICE_URL)) ??
    normalizeBaseUrl(readProcessEnv('SYNKUP_COMPANY_API_BASE_URL')) ??
    normalizeBaseUrl(readProcessEnv('COMPANY_SERVICE_URL')) ??
    normalizeBaseUrl(readProcessEnv('CAMPANY_SERVICE_URL')) ??
    APP_CONFIG.COMPANY_API_BASE_URL;

  const swagger =
    fromWindow?.SYNKUP_SWAGGER_DOCS_URL ??
    readProcessEnv('SYNKUP_SWAGGER_DOCS_URL') ??
    APP_CONFIG.SWAGGER_DOCS_URL;

  return {
    ...APP_CONFIG,
    API_BASE_URL: apiBase,
    STUDENT_API_BASE_URL: studentBase,
    CAMPUS_API_BASE_URL: campusBase,
    COMPANY_API_BASE_URL: companyBase,
    SWAGGER_DOCS_URL: swagger,
  };
}


