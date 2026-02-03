#!/usr/bin/env node
/**
 * TYFYS Morning Sales Team Update (RingCentral Team Messaging)
 *
 * Posts to a RingCentral team chat.
 *
 * Modes:
 *  - morning: today’s meetings lineup (for today only)
 *  - eod: today’s outbound performance + tomorrow’s meetings + lead aging / top follow-ups
 *
 * Usage:
 *   node scripts/tyfys/morning-sales-team-ringcentral-update.mjs --chatId 144856375302 --mode morning
 *   node scripts/tyfys/morning-sales-team-ringcentral-update.mjs --chatId 144856375302 --mode eod
 *
 * Options:
 *   --mode morning|eod   (default: morning)
 */

import { loadEnvLocal } from '../lib/load-env-local.mjs';
import { getZohoAccessToken, zohoCrmCoql, zohoCrmGet, zohoBookingsReportGet } from '../lib/zoho.mjs';
import { ringcentralGetJson, ringcentralPostJson } from '../lib/ringcentral.mjs';

const SALES_CHAT_ID_DEFAULT = '144856375302';

loadEnvLocal();

function getArg(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return def;
  return v;
}

function startOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoNoMs(d) {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function fmtLocal(dt) {
  try {
    return new Date(dt).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return String(dt);
  }
}

function formatTable(rows) {
  // WhatsApp-free / RC-friendly: simple aligned-ish lines.
  const maxName = Math.max(...rows.map(r => r.name.length), 3);
  return rows
    .map(r => `${r.name.padEnd(maxName)}  calls:${String(r.calls).padStart(3)}  sms:${String(r.sms).padStart(3)}`)
    .join('\n');
}

const SALES_ROSTER = ['Adam', 'Amy', 'Jared'];

function hoursBetween(a, b) {
  return Math.abs((a.getTime() - b.getTime()) / 36e5);
}

function daysBetween(a, b) {
  return Math.abs((a.getTime() - b.getTime()) / 864e5);
}

function pickTs(lead) {
  // Best-effort “last touched” timestamp.
  // Zoho sometimes has Last_Activity_Time; fall back to Modified_Time or Created_Time.
  const v = lead?.Last_Activity_Time || lead?.Last_Activity_Time?.value || lead?.Created_Time;
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

async function getZohoUserIdsForRoster({ accessToken }) {
  const out = new Map();
  const res = await zohoCrmGet({ accessToken, apiDomain: ZOHO_API_DOMAIN, pathAndQuery: '/crm/v2/users?type=ActiveUsers&per_page=200' });
  const users = res?.users || res?.data || [];

  for (const rep of SALES_ROSTER) {
    const match = users.find(u => {
      const name = String(u?.full_name || u?.name || '').toLowerCase();
      return name.includes(rep.toLowerCase());
    });
    if (match?.id) out.set(rep, match.id);
  }
  return out;
}

async function getLeadAging({ accessToken, asOf }) {
  const repToZohoUserId = await getZohoUserIdsForRoster({ accessToken });

  // COQL has strict limits. Query each rep separately.
  const byRep = new Map(SALES_ROSTER.map(r => [r, []]));
  for (const rep of SALES_ROSTER) {
    const ownerId = repToZohoUserId.get(rep);
    if (!ownerId) continue;

    const q = `select id, Full_Name, Company, Owner, Lead_Status, Created_Time, Modified_Time from Leads where Owner.id = '${ownerId}' order by Created_Time desc limit 200`;
    const res = await zohoCrmCoql({ accessToken, apiDomain: ZOHO_API_DOMAIN, selectQuery: q });
    for (const l of res?.data || []) byRep.get(rep).push(l);
  }

  const out = {};
  for (const rep of SALES_ROSTER) {
    const items = byRep.get(rep) || [];
    const scored = items
      .map(l => {
        const ts = pickTs(l);
        const hrs = ts ? hoursBetween(asOf, ts) : null;
        return { lead: l, ts, hrs };
      })
      .filter(x => x.hrs != null)
      .sort((a, b) => b.hrs - a.hrs); // oldest first

    const buckets = {
      lt24h: 0,
      d1_3: 0,
      d3_7: 0,
      gt7d: 0,
      gt24h: 0,
    };

    for (const s of scored) {
      if (s.hrs > 24) buckets.gt24h++;
      const d = s.hrs / 24;
      if (d < 1) buckets.lt24h++;
      else if (d < 3) buckets.d1_3++;
      else if (d < 7) buckets.d3_7++;
      else buckets.gt7d++;
    }

    const top = scored
      .filter(s => s.hrs > 24)
      .slice(0, 3)
      .map(s => {
        const name = s.lead?.Full_Name || s.lead?.Company || 'Lead';
        const age = `${Math.round((s.hrs / 24) * 10) / 10}d`;
        return `- ${name} (id ${s.lead?.id}) — untouched ~${age}`;
      });

    out[rep] = { buckets, top };
  }

  return out;
}

// Explicit extension ids (more reliable than name matching)
const RC_EXTENSION_ID_BY_REP = {
  Adam: 1162671035, // Adam Ayotte
  Amy: 1156144035,  // Amy Cagle
  Jared: 454161034, // Jared Maxwell
};
const ZOHO_API_DOMAIN = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

const MOTIVATION = [
  'Let’s make it a clean day: fast follow-ups, tight notes, no dropped balls.',
  'One more touchpoint than yesterday. Momentum compounds.',
  'Control the controllables: speed-to-lead, clear next steps, and good energy.',
  'Win the first hour, win the day. Let’s go.',
];

const ZB_OWNER_NAME = process.env.ZOHO_BOOKINGS_OWNER_NAME || 'clay_thankyouforyourservice';
const ZB_WORKSPACE_ID = process.env.ZOHO_BOOKINGS_WORKSPACE_ID || '4739587000000043008';

function fmtBookingsCriteriaDate(d) {
  // Bookings UI criteria uses: "02-Feb-2026 20:51:00"
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dd = String(d.getDate()).padStart(2, '0');
  const mon = months[d.getMonth()];
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  const ss = String(d.getSeconds()).padStart(2,'0');
  return `${dd}-${mon}-${yyyy} ${hh}:${mm}:${ss}`;
}

async function getTodaysMeetings({ accessToken, todayStart, tomorrowStart }) {
  // Source of truth: Zoho Bookings appointments (Creator-backed WEB_APPOINTMENT report).
  // Requires Zoho Creator scopes (ZohoCreator.report.READ) on the Zoho OAuth token.
  try {
    const criteria = `WORKSPACE_ID==${ZB_WORKSPACE_ID} && FROM_TIME>\"${fmtBookingsCriteriaDate(todayStart)}\" && FROM_TIME<\"${fmtBookingsCriteriaDate(tomorrowStart)}\"`;
    const out = await zohoBookingsReportGet({
      accessToken,
      ownerName: ZB_OWNER_NAME,
      reportLinkName: 'WEB_APPOINTMENT',
      query: {
        max_records: 200,
        sortBy: 'FROM_TIME:true',
        criteria,
      },
    });

    // The Creator report API returns {data:[...]}.
    const rows = out?.data || out;
    if (Array.isArray(rows)) {
      return rows.map(r => ({
        Start_DateTime: r.FROM_TIME || r.From_Time || r.from_time,
        End_DateTime: r.TO_TIME || r.To_Time || r.to_time,
        Event_Title: r.SERVICE_NAME || r.Service_Name || r.service_name || r.APPOINTMENT_FOR || r.Appointment_For || 'Booking',
        _raw: r,
      }));
    }
  } catch (e) {
    // Fall back to Zoho CRM Events if Bookings token isn't set up yet.
    // (We'll surface the error implicitly by still having meetings, but we should migrate fully.)
  }

  // Fallback: Zoho CRM Events happening today
  const q = `select id, Event_Title, Start_DateTime, End_DateTime, Owner from Events where Start_DateTime >= '${isoNoMs(todayStart)}' and Start_DateTime < '${isoNoMs(tomorrowStart)}' order by Start_DateTime asc limit 200`;
  const res = await zohoCrmCoql({ accessToken, apiDomain: ZOHO_API_DOMAIN, selectQuery: q });
  return (res?.data || []);
}

async function getRcExtensionsForRoster() {
  // Map RingCentral extensions to reps by name. Best-effort.
  const extRes = await ringcentralGetJson('/restapi/v1.0/account/~/extension?perPage=200');
  const exts = extRes?.records || [];

  const roster = new Map();
  for (const rep of SALES_ROSTER) {
    // Prefer explicit mapping.
    const explicit = RC_EXTENSION_ID_BY_REP?.[rep];
    if (explicit) {
      roster.set(rep, explicit);
      continue;
    }

    // Fallback: best-effort name matching.
    const match = exts.find(e => {
      const n = `${e?.contact?.firstName || ''} ${e?.contact?.lastName || ''}`.trim();
      const uname = String(e?.name || '');
      return n.toLowerCase().includes(rep.toLowerCase()) || uname.toLowerCase().includes(rep.toLowerCase());
    });
    if (match?.id) roster.set(rep, match.id);
  }

  return roster;
}

async function getOutboundPerf({ from, to }) {
  const rosterIds = await getRcExtensionsForRoster();

  const rows = [];
  for (const rep of SALES_ROSTER) {
    const extId = rosterIds.get(rep);
    if (!extId) {
      rows.push({ name: rep, calls: 0, sms: 0, _missing: true });
      continue;
    }

    const callLog = await ringcentralGetJson(
      `/restapi/v1.0/account/~/extension/${extId}/call-log?dateFrom=${encodeURIComponent(isoNoMs(from))}&dateTo=${encodeURIComponent(isoNoMs(to))}&perPage=1000`,
    );
    const msgStore = await ringcentralGetJson(
      `/restapi/v1.0/account/~/extension/${extId}/message-store?dateFrom=${encodeURIComponent(isoNoMs(from))}&dateTo=${encodeURIComponent(isoNoMs(to))}&perPage=1000`,
    );

    const calls = (callLog?.records || []).filter(r => r.direction === 'Outbound').length;
    const sms = (msgStore?.records || []).filter(r => r.type === 'SMS' && r.direction === 'Outbound').length;

    rows.push({ name: rep, calls, sms });
  }

  // winner: calls primary, sms tiebreak
  const sorted = [...rows].sort((a, b) => (b.calls - a.calls) || (b.sms - a.sms));
  const winner = sorted[0];

  return { rows, winner };
}

async function postToRingCentralChat({ chatId, text }) {
  // RingCentral Team Messaging (legacy Glip) endpoint.
  // ChatId is the numeric id from the URL: https://app.ringcentral.com/messages/<chatId>
  return ringcentralPostJson(`/restapi/v1.0/glip/chats/${chatId}/posts`, { text });
}

(async function main() {
  const chatId = getArg('--chatId', SALES_CHAT_ID_DEFAULT);
  if (!chatId) {
    console.error('Missing --chatId');
    process.exit(1);
  }

  const mode = getArg('--mode', 'morning');
  if (!['morning', 'eod'].includes(mode)) {
    console.error("Invalid --mode. Use 'morning' or 'eod'.");
    process.exit(1);
  }

  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const dayStr = todayStart.toLocaleDateString('en-US');

  const zohoToken = await getZohoAccessToken();

  if (mode === 'morning') {
    const todaysMeetings = await getTodaysMeetings({ accessToken: zohoToken, todayStart, tomorrowStart });

    const meetingLines = todaysMeetings.length
      ? todaysMeetings
          .map(e => {
            const title = e.Event_Title || 'Meeting';
            const repHint = SALES_ROSTER.find(r => title.toLowerCase().includes(r.toLowerCase()));
            return `- ${fmtLocal(e.Start_DateTime)} — ${title}${repHint ? ` (${repHint})` : ''}`;
          })
          .join('\n')
      : '- None on the calendar today.';

    const motivation = MOTIVATION[Math.floor(Math.random() * MOTIVATION.length)];

    const text = [
      `Good morning team — today’s lineup (${dayStr}):`,
      '',
      'Meetings today:',
      meetingLines,
      '',
      motivation,
    ]
      .filter(Boolean)
      .join('\n');

    await postToRingCentralChat({ chatId, text });
    process.stdout.write('Posted MORNING update to RingCentral chat.\n');
    return;
  }

  // mode === 'eod'
  const perf = await getOutboundPerf({ from: todayStart, to: now });
  const perfTable = formatTable(perf.rows);

  const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowMeetings = await getTodaysMeetings({ accessToken: zohoToken, todayStart: tomorrowStart, tomorrowStart: tomorrowEnd });

  const tomorrowLines = tomorrowMeetings.length
    ? tomorrowMeetings
        .map(e => {
          const title = e.Event_Title || 'Meeting';
          const repHint = SALES_ROSTER.find(r => title.toLowerCase().includes(r.toLowerCase()));
          return `- ${fmtLocal(e.Start_DateTime)} — ${title}${repHint ? ` (${repHint})` : ''}`;
        })
        .join('\n')
    : '- None on the calendar tomorrow.';

  const aging = await getLeadAging({ accessToken: zohoToken, asOf: now });
  const agingLines = SALES_ROSTER.map(rep => {
    const b = aging?.[rep]?.buckets;
    if (!b) return `${rep}: (no data)`;
    return `${rep}: <24h ${b.lt24h} | 1–3d ${b.d1_3} | 3–7d ${b.d3_7} | >7d ${b.gt7d} (untouched>24h ${b.gt24h})`;
  }).join('\n');

  const topActions = SALES_ROSTER.map(rep => {
    const top = aging?.[rep]?.top || [];
    return [
      `${rep} — top 3 follow-ups (untouched >24h):`,
      top.length ? top.join('\n') : '- None (or no leads >24h found).',
    ].join('\n');
  }).join('\n\n');

  const text = [
    `End of day — performance (${dayStr}, through ${fmtLocal(now)}):`,
    '',
    'Outbound performance (calls + SMS):',
    perfTable,
    '',
    'Tomorrow’s meetings:',
    tomorrowLines,
    '',
    'Lead aging (by owner):',
    agingLines,
    '',
    topActions,
  ].join('\n');

  await postToRingCentralChat({ chatId, text });
  process.stdout.write('Posted EOD update to RingCentral chat.\n');
})().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
