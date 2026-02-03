/**
 * Deal File Health (shared lib)
 *
 * Extracted from scripts/tyfys/deal-file-health.mjs so other scripts can reuse it
 * (ex: daily-sales-ops-brief).
 */

function isoZoho(d) {
  return d.toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

function safeDateMs(v) {
  if (!v) return null;
  const ms = new Date(v).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function daysSince(ms, nowMs = Date.now()) {
  if (!ms) return null;
  return (nowMs - ms) / (24 * 3600 * 1000);
}

export function redactDealName({ dealId, dealName, redact }) {
  if (!redact) return dealName || dealId;
  const suffix = String(dealId || '').slice(-6) || '??????';
  return `Deal#${suffix}`;
}

export function redactProvider(v, { redact }) {
  if (!redact) {
    if (Array.isArray(v)) return v.join(', ');
    return v || '';
  }
  return Array.isArray(v) && v.length ? 'REDACTED' : (v ? 'REDACTED' : '');
}

async function fetchAllRelated({ zohoCrmGet, token, apiDomain, dealId, rel, perPage = 200, maxPages = 10 }) {
  let page = 1;
  let out = [];
  for (;;) {
    const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    const j = await zohoCrmGet({ accessToken: token, apiDomain, pathAndQuery: `/crm/v2/Deals/${dealId}/${rel}?${qs.toString()}` });
    const data = j.data || [];
    out = out.concat(data);
    if (!j.info?.more_records) break;
    page += 1;
    if (page > maxPages) break;
  }
  return out;
}

function healthSummary({ tasks, notes, attachments }) {
  const openTasks = (tasks || []).filter(t => !['Completed', 'Closed'].includes(String(t.Status || '')));
  const overdue = openTasks.filter(t => t.Due_Date && new Date(t.Due_Date).getTime() < Date.now());

  const lastNote = (notes || [])
    .map(n => n.Modified_Time || n.Created_Time)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || '';

  const lastAttach = (attachments || [])
    .map(a => a.Modified_Time || a.Created_Time)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || '';

  return {
    openTasksCount: openTasks.length,
    overdueTasksCount: overdue.length,
    notesCount: (notes || []).length,
    attachmentsCount: (attachments || []).length,
    lastNote,
    lastAttach,
  };
}

function riskFlags({ dealStage, h, staleDays }) {
  const flags = [];

  if (h.overdueTasksCount > 0) flags.push('OVERDUE_TASKS');
  if (h.openTasksCount >= 6) flags.push('MANY_OPEN_TASKS');

  // In these stages, attachments are often required for provider handoff.
  const stage = String(dealStage || '');
  const stageNeedsFiles = ['Ready for Provider', 'Sent to Provider'].some(s => stage.includes(s));
  if (stageNeedsFiles && h.attachmentsCount === 0) flags.push('NO_ATTACHMENTS');

  const noteAge = daysSince(safeDateMs(h.lastNote));
  if (noteAge != null && noteAge >= staleDays) flags.push(`STALE_NOTE_${staleDays}D`);

  const attachAge = daysSince(safeDateMs(h.lastAttach));
  if (attachAge != null && attachAge >= staleDays) flags.push(`STALE_ATTACH_${staleDays}D`);

  return flags;
}

function mapLimit(items, limit, fn) {
  const arr = [...(items || [])];
  const out = new Array(arr.length);
  let idx = 0;
  let active = 0;

  return new Promise((resolve, reject) => {
    const next = () => {
      if (idx >= arr.length && active === 0) return resolve(out);
      while (active < limit && idx < arr.length) {
        const i = idx++;
        active += 1;
        Promise.resolve(fn(arr[i], i))
          .then((v) => {
            out[i] = v;
            active -= 1;
            next();
          })
          .catch(reject);
      }
    };
    next();
  });
}

export async function scanDealFileHealth({
  zohoCrmCoql,
  zohoCrmGet,
  token,
  apiDomain = 'https://www.zohoapis.com',
  hours = 168,
  limit = 120,
  staleDays = 7,
  maxConcurrent = 5,
}) {
  const sinceIso = isoZoho(new Date(Date.now() - hours * 3600 * 1000));
  const q = `select id, Deal_Name, Stage, Modified_Time, Last_Activity_Time, Appointment_Status, Provider from Deals where Modified_Time >= '${sinceIso}' and Stage in ('Intake (Document Collection)','Ready for Provider','Sent to Provider') limit ${Math.min(limit, 200)}`;
  const res = await zohoCrmCoql({ accessToken: token, apiDomain, selectQuery: q });
  const deals = res?.data || [];

  const rows = await mapLimit(deals, Math.max(1, Number(maxConcurrent) || 1), async (d) => {
    const dealId = String(d.id);
    const [tasks, notes, attachments] = await Promise.all([
      fetchAllRelated({ zohoCrmGet, token, apiDomain, dealId, rel: 'Tasks' }),
      fetchAllRelated({ zohoCrmGet, token, apiDomain, dealId, rel: 'Notes' }),
      fetchAllRelated({ zohoCrmGet, token, apiDomain, dealId, rel: 'Attachments' }),
    ]);

    const h = healthSummary({ tasks, notes, attachments });
    const flags = riskFlags({ dealStage: d.Stage, h, staleDays });

    return {
      dealId,
      dealName: d.Deal_Name,
      stage: d.Stage,
      provider: d.Provider,
      apptStatus: d.Appointment_Status,
      h,
      flags,
      modifiedTime: d.Modified_Time,
    };
  });

  // Prioritize highest-signal issues first.
  const flagRank = new Map([
    ['OVERDUE_TASKS', 100],
    ['NO_ATTACHMENTS', 80],
    ['MANY_OPEN_TASKS', 60],
  ]);

  const score = (r) => {
    let s = 0;
    for (const f of r.flags) {
      if (flagRank.has(f)) s += flagRank.get(f);
      else if (String(f).startsWith('STALE_NOTE_')) s += 30;
      else if (String(f).startsWith('STALE_ATTACH_')) s += 25;
      else s += 10;
    }
    return s;
  };

  rows.sort((a, b) => {
    const ds = score(b) - score(a);
    if (ds !== 0) return ds;
    const ta = safeDateMs(a.modifiedTime) || 0;
    const tb = safeDateMs(b.modifiedTime) || 0;
    return tb - ta;
  });

  return {
    rows,
    atRisk: rows.filter(r => r.flags.length),
  };
}

export function formatHealthLine({ r, redact = false }) {
  const name = redactDealName({ dealId: r.dealId, dealName: r.dealName, redact });
  const provider = redactProvider(r.provider, { redact });
  const flagsStr = r.flags.length ? r.flags.join(',') : 'OK';
  return `- ${name} | ${r.stage} | Provider=${provider} | Appt=${r.apptStatus || ''} | open_tasks=${r.h.openTasksCount} (overdue=${r.h.overdueTasksCount}) | notes=${r.h.notesCount} last_note=${r.h.lastNote || 'n/a'} | attachments=${r.h.attachmentsCount} last_attach=${r.h.lastAttach || 'n/a'} | flags=${flagsStr}`;
}

export async function selftestDealFileHealthLib() {
  const { strict: assert } = await import('node:assert');

  // redaction helpers
  assert.equal(redactDealName({ dealId: '1234567890', dealName: 'John Smith', redact: true }), 'Deal#567890');
  assert.equal(redactProvider(['a', 'b'], { redact: true }), 'REDACTED');
  assert.equal(redactProvider(null, { redact: true }), '');

  process.stdout.write('Selftest OK\n');
}
