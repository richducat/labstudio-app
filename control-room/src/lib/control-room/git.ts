import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function getGitActivity({
  repoPath,
  max = 10,
  since = '24 hours ago',
}: {
  repoPath: string;
  max?: number;
  since?: string;
}) {
  const { stdout } = await execFileAsync('git', ['-C', repoPath, 'log', `--since=${since}`, `-n`, String(max), '--oneline', '--no-decorate']);
  return stdout.trim().split('\n').filter(Boolean);
}

export async function getGitWipStatus(repoPath: string) {
  const status = await execFileAsync('git', ['-C', repoPath, 'status', '--porcelain=v1']);
  const dirty = status.stdout.trim().length > 0;

  let branch = '';
  try {
    const b = await execFileAsync('git', ['-C', repoPath, 'rev-parse', '--abbrev-ref', 'HEAD']);
    branch = b.stdout.trim();
  } catch {
    branch = '';
  }

  return { repoPath, dirty, branch, lines: status.stdout.trim().split('\n').filter(Boolean) };
}
