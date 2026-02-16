import { readCronStore } from '@/lib/control-room/cronStore';
import { buildAlertsFromCronStore, buildAlertsFromRunHistory } from '@/lib/control-room/alerts';
import { buildWorkOrders } from '@/lib/control-room/workOrders';
import { readSafeButtons } from '@/lib/control-room/safeButtons';
import { getGitActivity, getGitWipStatus } from '@/lib/control-room/git';
import { SafeButtonsPanel } from './_components/SafeButtonsPanel';

function badgeClass(sev: 'info' | 'warn' | 'critical') {
  if (sev === 'critical') return 'badge bad';
  if (sev === 'warn') return 'badge warn';
  return 'badge';
}

function fmt(tsMs: number) {
  try {
    return new Date(tsMs).toLocaleString();
  } catch {
    return String(tsMs);
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {
  const cron = await readCronStore();
  const now = Date.now();

  const [safeButtons, storeAlerts, runAlerts, workOrders, gitLog, gitWip] = await Promise.all([
    readSafeButtons(),
    buildAlertsFromCronStore(cron.jobs),
    buildAlertsFromRunHistory({ jobs: cron.jobs, lookbackHours: 24, maxItems: 50 }),
    Promise.resolve(buildWorkOrders(cron.jobs, now)),
    getGitActivity({ repoPath: '/Users/richardducat/clawd', max: 10, since: '48 hours ago' }).catch(() => [] as string[]),
    getGitWipStatus('/Users/richardducat/clawd').catch(() => ({ repoPath: '/Users/richardducat/clawd', dirty: false, branch: '', lines: [] })),
  ]);

  const alerts = [...storeAlerts, ...runAlerts]
    .sort((a, b) => b.tsMs - a.tsMs)
    .filter((a, idx, arr) => idx === arr.findIndex((x) => x.kind === a.kind && x.jobId === a.jobId && x.tsMs === a.tsMs))
    .slice(0, 50);

  const enabledJobs = cron.jobs.filter((j) => j.enabled);
  const errorJobs = enabledJobs.filter((j) => (j.state?.lastStatus === 'error') || (j.state?.consecutiveErrors ?? 0) > 0);
  const stuckJobs = enabledJobs.filter((j) => j.state?.runningAtMs && now - (j.state.runningAtMs ?? 0) > 10 * 60 * 1000);

  return (
    <div className="grid cols2">
      <div className="grid" style={{ gap: 16 }}>
        <div className="panel">
          <h2>Overview</h2>
          <div className="kpiRow">
            <div className="kpi">
              <div className="label">Enabled jobs</div>
              <div className="value">{enabledJobs.length}</div>
            </div>
            <div className="kpi">
              <div className="label">Jobs w/ errors</div>
              <div className="value" style={{ color: errorJobs.length ? 'var(--bad)' : 'var(--ok)' }}>
                {errorJobs.length}
              </div>
            </div>
            <div className="kpi">
              <div className="label">Stuck jobs</div>
              <div className="value" style={{ color: stuckJobs.length ? 'var(--bad)' : 'var(--ok)' }}>
                {stuckJobs.length}
              </div>
            </div>
            <div className="kpi">
              <div className="label">Work orders (24h)</div>
              <div className="value">{workOrders.filter((w) => (w.dueAtMs ?? now + 1) < now + 24 * 60 * 60 * 1000).length}</div>
            </div>
          </div>
          <div style={{ height: 10 }} />
          <div className="small">Git WIP: {gitWip.branch || '(unknown)'} {gitWip.dirty ? '(dirty)' : '(clean)'}</div>
        </div>

        <div className="panel">
          <h2>Work Orders</h2>
          <div className="small">Heuristic view of human-facing reminders / approval-needed items derived from the cron store.</div>
          <div style={{ height: 10 }} />
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Due</th>
                <th>Work</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.length === 0 ? (
                <tr><td colSpan={3} className="small">No work orders detected.</td></tr>
              ) : null}
              {workOrders.map((wo) => (
                <tr key={wo.id}>
                  <td>
                    <span className={wo.status === 'due' ? 'badge bad' : wo.status === 'upcoming' ? 'badge warn' : 'badge'}>
                      {wo.status}
                    </span>
                  </td>
                  <td className="small">{typeof wo.dueAtMs === 'number' ? fmt(wo.dueAtMs) : '—'}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{wo.title}</div>
                    <div className="small">{wo.notes}</div>
                    <div className="small">jobId: {wo.jobId}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <h2>Git Activity (last 48h)</h2>
          {gitLog.length === 0 ? (
            <div className="small">No recent commits detected (or git unavailable).</div>
          ) : (
            <pre>{gitLog.join('\n')}</pre>
          )}
        </div>
      </div>

      <div className="grid" style={{ gap: 16 }}>
        <div className="panel">
          <h2>Alerts (v2)</h2>
          <div className="small">Merged feed from cron store status + run history (last 24h). DriftGuard + token failures are elevated.</div>
          <div style={{ height: 10 }} />
          {alerts.length === 0 ? (
            <div className="badge ok">No alerts</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Sev</th>
                  <th>When</th>
                  <th>What</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a, idx) => (
                  <tr key={idx}>
                    <td><span className={badgeClass(a.severity)}>{a.severity}</span></td>
                    <td className="small">{fmt(a.tsMs)}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{a.title}</div>
                      <div className="small">{a.detail}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <SafeButtonsPanel buttons={safeButtons} />

        <div className="panel">
          <h2>Stuck / WIP enforcement</h2>
          <div className="small">Fast checks: (1) cron stuck (&gt;10m) and (2) repo dirty working tree.</div>
          <div style={{ height: 10 }} />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className={stuckJobs.length ? 'badge bad' : 'badge ok'}>stuck jobs: {stuckJobs.length}</span>
            <span className={gitWip.dirty ? 'badge warn' : 'badge ok'}>git dirty: {gitWip.dirty ? 'yes' : 'no'}</span>
          </div>

          {stuckJobs.length ? (
            <>
              <div style={{ height: 10 }} />
              <div className="small">Stuck jobs:</div>
              <ul className="small">
                {stuckJobs.map((j) => (
                  <li key={j.id}>{j.name} ({j.id}) — running since {j.state?.runningAtMs ? fmt(j.state.runningAtMs) : 'unknown'}</li>
                ))}
              </ul>
            </>
          ) : null}

          {gitWip.dirty ? (
            <>
              <div style={{ height: 10 }} />
              <div className="small">Dirty files (porcelain):</div>
              <pre>{gitWip.lines.slice(0, 80).join('\n')}{gitWip.lines.length > 80 ? `\n… (${gitWip.lines.length - 80} more)` : ''}</pre>
            </>
          ) : null}
        </div>

        <div className="panel">
          <h2>Cron (enabled)</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Next</th>
                <th>Last</th>
              </tr>
            </thead>
            <tbody>
              {enabledJobs
                .slice()
                .sort((a, b) => (a.state?.nextRunAtMs ?? 9e15) - (b.state?.nextRunAtMs ?? 9e15))
                .slice(0, 25)
                .map((j) => (
                  <tr key={j.id}>
                    <td>
                      <div style={{ fontWeight: 650 }}>{j.name}</div>
                      <div className="small">{j.id}</div>
                      {(j.state?.lastStatus === 'error' || (j.state?.consecutiveErrors ?? 0) > 0) ? (
                        <div className="small" style={{ color: 'rgba(254,202,202,1)' }}>{j.state?.lastError}</div>
                      ) : null}
                    </td>
                    <td className="small">{j.state?.nextRunAtMs ? fmt(j.state.nextRunAtMs) : '—'}</td>
                    <td className="small">{j.state?.lastRunAtMs ? `${fmt(j.state.lastRunAtMs)} (${j.state.lastStatus ?? '—'})` : '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="small">Showing first 25 enabled jobs sorted by nextRunAt.</div>
        </div>
      </div>
    </div>
  );
}
