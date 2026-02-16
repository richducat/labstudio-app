import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] || '/Users/richardducat/clawd';

function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

function isGitRepo(dir) {
  try {
    return fs.existsSync(path.join(dir, '.git'));
  } catch {
    return false;
  }
}

function listDirs(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => !name.startsWith('.') && name !== 'node_modules');
}

function auditRepo(repoPath) {
  const findings = [];

  // 1) Embedded git repos (should not exist inside a repo)
  try {
    const out = sh(`find . -mindepth 2 -maxdepth 5 -type d -name .git -print`, { cwd: repoPath });
    const lines = out.trim().split('\n').filter(Boolean);
    if (lines.length) {
      findings.push({
        kind: 'embedded_git',
        severity: 'high',
        message: `Embedded .git directories found (likely nested repos/submodules): ${lines.join(', ')}`,
      });
    }
  } catch {
    // ignore
  }

  // 2) Branch-path drift heuristic: a nested folder that mirrors repo name and contains src/app structure
  const repoName = path.basename(repoPath);
  const suspicious = [
    path.join(repoPath, repoName),
    path.join(repoPath, 'labstudio-app'),
  ].filter((p) => fs.existsSync(p) && fs.statSync(p).isDirectory());

  for (const p of suspicious) {
    const hasSrc = fs.existsSync(path.join(p, 'src'));
    const hasAppApi = fs.existsSync(path.join(p, 'src', 'app', 'api'));
    if (hasSrc || hasAppApi) {
      findings.push({
        kind: 'branch_path_drift',
        severity: 'high',
        message: `Suspicious nested project directory detected: ${path.relative(repoPath, p)} (contains src/*). This can hide working code off the real build path.`,
      });
    }
  }

  // 3) Lockfile conflict
  const lockfiles = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lockb'].filter((f) =>
    fs.existsSync(path.join(repoPath, f)),
  );
  if (lockfiles.length > 1) {
    findings.push({
      kind: 'lockfiles',
      severity: 'medium',
      message: `Multiple lockfiles present: ${lockfiles.join(', ')}`,
    });
  }

  // 4) Default branch sanity (if origin exists)
  try {
    const remotes = sh('git remote', { cwd: repoPath }).trim().split('\n').filter(Boolean);
    if (remotes.includes('origin')) {
      const head = sh('git symbolic-ref refs/remotes/origin/HEAD', { cwd: repoPath }).trim();
      if (head && !head.endsWith('/main')) {
        findings.push({
          kind: 'default_branch',
          severity: 'high',
          message: `origin/HEAD is not main: ${head}`,
        });
      }
    }
  } catch {
    // ignore
  }

  return findings;
}

function main() {
  const repos = listDirs(ROOT)
    .map((name) => path.join(ROOT, name))
    .filter((p) => isGitRepo(p));

  const report = [];
  for (const repo of repos) {
    const findings = auditRepo(repo);
    if (findings.length) report.push({ repo, findings });
  }

  console.log(JSON.stringify({
    root: ROOT,
    checkedAt: new Date().toISOString(),
    reposChecked: repos.length,
    reposWithFindings: report.length,
    report,
  }, null, 2));
}

main();
