import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const outputDir = path.join(projectRoot, 'output', 'namecheap-deploy');
const standaloneDir = path.join(projectRoot, '.next', 'standalone');
const staticDir = path.join(projectRoot, '.next', 'static');
const publicDir = path.join(projectRoot, 'public');
const dataDir = path.join(projectRoot, 'data');

const envSource =
  process.env.NAMECHEAP_ENV_FILE ||
  process.env.LABSTUDIO_ENV_FILE ||
  '/tmp/labstudio-prod.env';

const allowedEnvKeys = new Set([
  'APP_BASE_URL',
  'DATABASE_URL',
  'LABSTUDIO_ACCESS_CODE',
  'LABSTUDIO_BOOKINGS_ICAL_URL',
  'LABSTUDIO_SESSION_SECRET',
  'NEXT_PUBLIC_SITE_URL',
  'OPENAI_API_KEY',
  'SITE_URL',
  'STRIPE_SECRET_KEY',
  'TOBY_AI_PROVIDER',
  'TOBY_CHAT_WRAPPER_URL',
  'TOBY_MODEL',
  'USDA_FDC_API_KEY',
]);

async function exists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function parseEnvLine(line) {
  const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) return null;

  const key = match[1];
  let value = match[2].trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value.replace(/\\n/g, '\n')];
}

function serializeEnvValue(value) {
  return JSON.stringify(String(value).replace(/\n/g, '\\n'));
}

async function readDeployEnv() {
  const entries = new Map();

  if (envSource && await exists(envSource)) {
    const source = await fs.readFile(envSource, 'utf8');
    for (const rawLine of source.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;

      const parsed = parseEnvLine(line);
      if (!parsed) continue;

      const [key, value] = parsed;
      if (allowedEnvKeys.has(key) && value) {
        entries.set(key, value);
      }
    }
  }

  entries.set('NEXT_PUBLIC_SITE_URL', 'https://app.labstudio.fit');
  entries.set('SITE_URL', 'https://app.labstudio.fit');
  entries.set('APP_BASE_URL', 'https://app.labstudio.fit');

  return entries;
}

async function copyTree(source, destination, filter) {
  await fs.cp(source, destination, {
    recursive: true,
    dereference: true,
    verbatimSymlinks: false,
    filter,
  });
}

async function removeSymlinks(targetDir) {
  if (!(await exists(targetDir))) return;

  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(targetDir, entry.name);
    if (entry.isSymbolicLink()) {
      await fs.rm(entryPath, { force: true });
      continue;
    }

    if (entry.isDirectory()) {
      await removeSymlinks(entryPath);
    }
  }
}

async function materializeHoistedDependencies() {
  const hoistedDir = path.join(outputDir, 'node_modules', '.pnpm', 'node_modules');
  const nodeModulesDir = path.join(outputDir, 'node_modules');
  if (!(await exists(hoistedDir))) return;

  const entries = await fs.readdir(hoistedDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(hoistedDir, entry.name);
    const destinationPath = path.join(nodeModulesDir, entry.name);
    await fs.rm(destinationPath, { recursive: true, force: true });
    await copyTree(sourcePath, destinationPath);
  }

  await removeSymlinks(nodeModulesDir);
}

function appEntrypoint() {
  return `const fs = require("node:fs");
const path = require("node:path");

function loadEnvFile(filename) {
  const targetPath = path.join(__dirname, filename);
  if (!fs.existsSync(targetPath)) return;

  const content = fs.readFileSync(targetPath, "utf8");
  for (const rawLine of content.split(/\\r?\\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^(?:export\\s+)?([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*(.*)$/);
    if (!match) continue;

    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith("\\"") && value.endsWith("\\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value.replace(/\\\\n/g, "\\n");
    }
  }
}

loadEnvFile(".env.production.local");
loadEnvFile(".env.production");
loadEnvFile(".env");

process.env.NODE_ENV ||= "production";
process.env.HOSTNAME ||= "127.0.0.1";

function appendBootLog(payload) {
  try {
    const tmpDir = path.join(__dirname, "tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    fs.appendFileSync(path.join(tmpDir, "boot.log"), JSON.stringify(payload) + "\\n");
  } catch {}
}

appendBootLog({
  event: "boot",
  at: new Date().toISOString(),
  node: process.version,
  hostname: process.env.HOSTNAME,
  port: process.env.PORT,
});

process.on("uncaughtException", (error) => {
  appendBootLog({
    event: "uncaughtException",
    at: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : null,
  });
  throw error;
});

require("./server.js");
`;
}

async function main() {
  if (!(await exists(standaloneDir))) {
    throw new Error('Missing .next/standalone. Run `npm run build` first.');
  }

  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  await copyTree(standaloneDir, outputDir);
  await materializeHoistedDependencies();

  if (await exists(staticDir)) {
    await fs.mkdir(path.join(outputDir, '.next'), { recursive: true });
    await copyTree(staticDir, path.join(outputDir, '.next', 'static'));
  }

  if (await exists(publicDir)) {
    await copyTree(publicDir, path.join(outputDir, 'public'));
  }

  if (await exists(dataDir)) {
    await copyTree(dataDir, path.join(outputDir, 'data'));
  }

  await fs.writeFile(path.join(outputDir, 'app.js'), appEntrypoint(), 'utf8');

  const deployEnv = await readDeployEnv();
  if (deployEnv.size) {
    const envText = [...deployEnv.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${serializeEnvValue(value)}`)
      .join('\n') + '\n';
    await fs.writeFile(path.join(outputDir, '.env.production.local'), envText, 'utf8');
  }

  await fs.mkdir(path.join(outputDir, 'tmp'), { recursive: true });
  await fs.writeFile(
    path.join(outputDir, 'tmp', 'restart.txt'),
    `packagedAt=${new Date().toISOString()}\n`,
    'utf8'
  );
  await fs.writeFile(
    path.join(outputDir, 'DEPLOY_INFO.json'),
    JSON.stringify(
      {
        app: 'labstudio-app',
        hostTarget: 'app.labstudio.fit',
        packagedAt: new Date().toISOString(),
        envSourceUsed: envSource && await exists(envSource) ? path.basename(envSource) : null,
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  console.log(`Packaged Namecheap deploy bundle at ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
