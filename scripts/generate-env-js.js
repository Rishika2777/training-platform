#!/usr/bin/env node
/**
 * Generates assets/env.js for static builds (e.g. when using http-server).
 * The SSR server serves env.js dynamically; this script creates a static file
 * for builds that don't use the SSR server.
 */
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
const outDir = path.join(process.cwd(), 'dist', 'synkup', 'browser', 'assets');
const outFile = path.join(outDir, 'env.js');

function parseDotEnv(content) {
  const result = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value.replace(/\$\{([^}]+)\}/g, (_, name) => process.env[name] || '');
  }
  return result;
}

/** Keys that are safe to expose to browser (no secrets). */
const PUBLIC_KEYS = [
  'SYNKUP_API_BASE_URL',
  'SYNKUP_STUDENT_API_BASE_URL',
  'SYNKUP_CAMPUS_API_BASE_URL',
  'SYNKUP_COMPANY_API_BASE_URL',
  'AUTH_SERVICE_URL',
  'STUDENT_SERVICE_URL',
  'CAMPUS_SERVICE_URL',
  'COMPANY_SERVICE_URL',
  'CAMPANY_SERVICE_URL',
  'ADMIN_SERVICE_URL',
];

let env = {};
if (fs.existsSync(envPath)) {
  env = parseDotEnv(fs.readFileSync(envPath, 'utf8'));
}

const publicEnv = {};
for (const k of PUBLIC_KEYS) {
  if (env[k] !== undefined) publicEnv[k] = env[k];
}

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const content = `globalThis.__env = ${JSON.stringify(publicEnv)};`;
fs.writeFileSync(outFile, content, 'utf8');
console.log('Generated', outFile);
