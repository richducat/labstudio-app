import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function parseEnvFile(filePath) {
  const fullPath = path.join(root, filePath);
  if (!fs.existsSync(fullPath)) return {};

  const values = {};
  for (const rawLine of fs.readFileSync(fullPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    values[key] = value;
  }
  return values;
}

const env = {
  ...parseEnvFile('.env'),
  ...parseEnvFile('.env.local'),
  ...process.env,
};

const required = ['DATABASE_URL', 'LABSTUDIO_ACCESS_CODE', 'LABSTUDIO_SESSION_SECRET', 'NEXT_PUBLIC_SITE_URL'];
const errors = [];
const warnings = [];

for (const key of required) {
  if (!String(env[key] || '').trim()) {
    errors.push(`Missing required launch variable: ${key}`);
  }
}

const siteUrl = String(env.NEXT_PUBLIC_SITE_URL || '').trim();
if (siteUrl && /localhost|127\.0\.0\.1/i.test(siteUrl)) {
  errors.push('NEXT_PUBLIC_SITE_URL still points to localhost. Set the production app URL.');
}

const sessionSecret = String(env.LABSTUDIO_SESSION_SECRET || '').trim();
if (sessionSecret && sessionSecret.length < 32) {
  warnings.push('LABSTUDIO_SESSION_SECRET is short. Use a long random secret (32+ chars).');
}

const tobyProvider = String(env.TOBY_AI_PROVIDER || 'auto').trim().toLowerCase();
const wrapperUrl = String(env.TOBY_CHAT_WRAPPER_URL || '').trim();
if (tobyProvider === 'wrapper') {
  if (!wrapperUrl) {
    errors.push('TOBY_AI_PROVIDER=wrapper requires TOBY_CHAT_WRAPPER_URL.');
  } else if (/localhost|127\.0\.0\.1/i.test(wrapperUrl)) {
    warnings.push('TOBY_CHAT_WRAPPER_URL points to localhost. Production needs a public wrapper URL.');
  }
}

if (!String(env.STRIPE_SECRET_KEY || '').trim()) {
  warnings.push('STRIPE_SECRET_KEY is missing. Shop checkout will fail until it is configured.');
}

if (!String(env.OPENAI_API_KEY || '').trim() && tobyProvider === 'openai') {
  warnings.push('OPENAI_API_KEY is missing while TOBY_AI_PROVIDER=openai.');
}

if (errors.length > 0) {
  console.error('Launch readiness failed:\n');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  if (warnings.length > 0) {
    console.error('\nWarnings:');
    for (const warning of warnings) {
      console.error(`- ${warning}`);
    }
  }
  process.exit(1);
}

console.log('Launch environment check passed.');
if (warnings.length > 0) {
  console.log('\nWarnings:');
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}
