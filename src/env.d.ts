export {};

type PublicRuntimeEnv = Partial<{
  // New preferred keys (project-specific)
  SYNKUP_API_BASE_URL: string;
  SYNKUP_STUDENT_API_BASE_URL: string;
  SYNKUP_CAMPUS_API_BASE_URL: string;
  SYNKUP_COMPANY_API_BASE_URL: string;
  SYNKUP_SWAGGER_DOCS_URL: string;

  // Legacy / backend-aligned keys (aliases)
  AUTH_SERVICE_URL: string;
  STUDENT_SERVICE_URL: string;
  CAMPUS_SERVICE_URL: string;
  COMPANY_SERVICE_URL: string;
  CAMPANY_SERVICE_URL: string;
  ADMIN_SERVICE_URL: string;

  // S3 client-side upload (set in .env, injected by server via /assets/env.js)
  AWS_S3_ACCESS_KEY_ID: string;
  AWS_S3_SECRET_ACCESS_KEY: string;
}>;

declare global {
  // Served by `/assets/env.js` (see `src/server.ts`)
  // We intentionally keep it permissive but typed (no `any`).
  var __env: PublicRuntimeEnv | undefined;

  namespace NodeJS {
    interface ProcessEnv extends Record<string, string | undefined>, PublicRuntimeEnv {}
  }
}