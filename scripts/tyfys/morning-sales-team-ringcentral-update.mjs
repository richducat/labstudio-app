#!/usr/bin/env node
/**
 * TYFYS Sales Team Update (RingCentral Team Messaging)
 *
 * Posts to a RingCentral team chat.
 *
 * Modes:
 *  - morning: today’s meetings + pipeline momentum + yesterday’s outbound performance + bonus tracker
 *  - eod: end-of-day cap (today’s meetings + today’s outbound performance + bonus tracker)
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

function fmtLocalTime(dt) {
  try {
    return new Date(dt).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return String(dt);
  }
}

function dayOfWeek(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

function dayOfMonth(d) {
  return d.getDate();
}

function daysLeftInMonth(d) {
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return end.getDate() - d.getDate();
}

function isWeekendLocalDay(ymd) {
  // ymd: YYYY-MM-DD, use noon local offset for stability
  const dd = new Date(`${ymd}T12:00:00-05:00`);
  const day = dd.getDay();
  return day === 0 || day === 6;
}

function ymdLocal(d) {
  // Approx local day grouping; good enough for ET (system runs ET)
  // If we ever need true timezone-safe grouping, use luxon.
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function fmtBookingsCriteriaDate(d) {
  // Bookings UI criteria uses: "02-Feb-2026 20:51:00"
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dd = String(d.getDate()).padStart(2, '0');
  const mon = months[d.getMonth()];
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}-${mon}-${yyyy} ${hh}:${mm}:${ss}`;
}

// Sales roster (Ashley removed)
const SALES_ROSTER = ['Amy', 'Jared', 'Adam'];

// Explicit extension ids (more reliable than name matching)
const RC_EXTENSION_ID_BY_REP = {
  Amy: 1156144035, // Amy Cagle
  Jared: 454161034, // Jared Maxwell
  Adam: 1162671035, // Adam Ayotte
};

const ZOHO_API_DOMAIN = process.env.ZOHO_API_DOMAIN || 'https://www.zohoapis.com';

const MOTIVATION = [
  'Consistency beats intensity — stack the reps.',
  'Momentum compounds — keep the pace steady and the notes clean.',
  'Speed-to-lead + clear next steps. That’s the whole game.',
  'Win the first hour, win the day.',
  'One more clean touch than yesterday.',
];

const ZB_OWNER_NAME = process.env.ZOHO_BOOKINGS_OWNER_NAME || 'clay_thankyouforyourservice';
const ZB_WORKSPACE_ID = process.env.ZOHO_BOOKINGS_WORKSPACE_ID || '4739587000000043008';

async function getTodaysMeetings({ accessToken, dayStart, nextDayStart }) {
  // Source of truth: Zoho Bookings appointments (Creator-backed WEB_APPOINTMENT report).
  // Fallback: Zoho CRM Events.
  try {
    const criteria = `WORKSPACE_ID==${ZB_WORKSPACE_ID} && FROM_TIME>\"${fmtBookingsCriteriaDate(dayStart)}\" && FROM_TIME<\"${fmtBookingsCriteriaDate(nextDayStart)}\"`;
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

    const rows = out?.data || out;
    if (Array.isArray(rows)) {
      return rows.map(r => ({
        Start_DateTime: r.FROM_TIME || r.From_Time || r.from_time,
        End_DateTime: r.TO_TIME || r.To_Time || r.to_time,
        Event_Title: r.SERVICE_NAME || r.Service_Name || r.service_name || r.APPOINTMENT_FOR || r.Appointment_For || 'Booking',
      }));
    }
  } catch {
    // ignore and fallback
  }

  const q = `select id, Event_Title, Start_DateTime, End_DateTime, Owner from Events where Start_DateTime >= '${isoNoMs(dayStart)}' and Start_DateTime < '${isoNoMs(nextDayStart)}' order by Start_DateTime asc limit 200`;
  const res = await zohoCrmCoql({ accessToken, apiDomain: ZOHO_API_DOMAIN, selectQuery: q });
  return res?.data || [];
}

function repHintFromTitle(title) {
  const t = String(title || '').toLowerCase();
  if (t.includes('amy')) return 'Amy';
  if (t.includes('jared')) return 'Jared';
  if (t.includes('adam')) return 'Adam';
  return null;
}

function busyLabelByTeamAvg(avg) {
  // Team-average meetings/person
  if (avg <= 1) return 'light day';
  if (avg <= 3) return 'pretty booked';
  return 'packed';
}

function formatMeetingsByRep(meetings) {
  const byRep = new Map(SALES_ROSTER.map(r => [r, []]));
  const other = [];

  for (const e of meetings || []) {
    const title = e.Event_Title || 'Meeting';
    const rep = repHintFromTitle(title);
    const line = `- ${fmtLocalTime(e.Start_DateTime)} — ${title}`;
    if (rep && byRep.has(rep)) byRep.get(rep).push(line);
    else other.push(line);
  }

  const lines = [];
  for (const rep of SALES_ROSTER) {
    const items = byRep.get(rep) || [];
    lines.push(`${rep}:`);
    if (!items.length) lines.push('- no meetings scheduled');
    else lines.push(...items);
  }

  if (other.length) {
    lines.push('Unassigned:');
    lines.push(...other);
  }

  return {
    text: lines.join('\n'),
    counts: Object.fromEntries(SALES_ROSTER.map(r => [r, (byRep.get(r) || []).length])),
  };
}

async function getZohoPipelineMomentum24h({ accessToken, from, to }) {
  // Deals modified in window
  const qDeals = `select id, Stage, Modified_Time, Created_Time from Deals where Modified_Time >= '${isoNoMs(from)}' and Modified_Time <= '${isoNoMs(to)}' limit 200`;
  const resDeals = await zohoCrmCoql({ accessToken, apiDomain: ZOHO_API_DOMAIN, selectQuery: qDeals });
  const deals = resDeals?.data || [];
  const closedWon = deals.filter(d => String(d.Stage || '').toLowerCase().includes('closed won')).length;

  // Meetings booked in window: Events created in window
  const qEventsCreated = `select id, Start_DateTime, Created_Time from Events where Created_Time >= '${isoNoMs(from)}' and Created_Time <= '${isoNoMs(to)}' limit 200`;
  const resEvents = await zohoCrmCoql({ accessToken, apiDomain: ZOHO_API_DOMAIN, selectQuery: qEventsCreated });
  const eventsCreated = (resEvents?.data || []).filter(e => e.Start_DateTime && new Date(e.Start_DateTime) >= to);

  return {
    dealsUpdated: deals.length,
    closedWon,
    meetingsBooked: eventsCreated.length,
  };
}

async function getZohoUserIdsForRoster({ accessToken }) {
  // Use CRM users API (COQL doesn't reliably support users across orgs)
  const res = await zohoCrmGet({
    accessToken,
    apiDomain: ZOHO_API_DOMAIN,
    pathAndQuery: '/crm/v2/users?type=ActiveUsers&per_page=200',
  }).catch(() => null);

  const users = res?.users || res?.data || [];
  const out = new Map();
  for (const rep of SALES_ROSTER) {
    const match = users.find(u => {
      const name = String(u?.full_name || u?.name || '').toLowerCase();
      return name.includes(rep.toLowerCase());
    });
    if (match?.id) out.set(rep, match.id);
  }
  return out;
}

async function getSalesReadyLeadAttemptStats({ accessToken }) {
  // Goal: measure follow-through on existing Sales Ready leads.
  // We define:
  // - attempted = Last_Activity_Time exists
  // - not_attempted = Last_Activity_Time is null
  // NOTE: Status picklist value is "Sales_Ready" (per Richard).

  const repToOwnerId = await getZohoUserIdsForRoster({ accessToken });
  const out = {};

  for (const rep of SALES_ROSTER) {
    const ownerId = repToOwnerId.get(rep);
    if (!ownerId) continue;

    const q = `select id, Lead_Status, Owner, Last_Activity_Time, Created_Time, Modified_Time from Leads where Owner.id = '${ownerId}' and Lead_Status = 'Sales_Ready' limit 200`;
    const res = await zohoCrmCoql({ accessToken, apiDomain: ZOHO_API_DOMAIN, selectQuery: q });
    const leads = res?.data || [];

    const attempted = leads.filter(l => Boolean(l.Last_Activity_Time)).length;
    const notAttempted = leads.length - attempted;

    out[rep] = { total: leads.length, attempted, notAttempted };
  }

  return out;
}

async function getAccountCallLog({ from, to }) {
  return ringcentralGetJson(
    `/restapi/v1.0/account/~/call-log?dateFrom=${encodeURIComponent(isoNoMs(from))}&dateTo=${encodeURIComponent(isoNoMs(to))}&perPage=1000`,
  );
}

async function getOutboundSmsCountsByRep({ from, to }) {
  const out = {};
  for (const rep of SALES_ROSTER) {
    const extId = RC_EXTENSION_ID_BY_REP[rep];
    if (!extId) {
      out[rep] = 0;
      continue;
    }

    const msgStore = await ringcentralGetJson(
      `/restapi/v1.0/account/~/extension/${extId}/message-store?dateFrom=${encodeURIComponent(isoNoMs(from))}&dateTo=${encodeURIComponent(isoNoMs(to))}&perPage=1000`,
    );

    const sms = (msgStore?.records || []).filter(r => r.type === 'SMS' && r.direction === 'Outbound').length;
    out[rep] = sms;
  }
  return out;
}

function computeOutboundCallAggByRep(callLogRecords) {
  const byRep = Object.fromEntries(
    SALES_ROSTER.map(r => [r, { outboundCalls: 0, contacted: 0, talkSec: 0 }]),
  );

  for (const r of callLogRecords || []) {
    const extId = String(r.extension?.id || '');
    const rep = SALES_ROSTER.find(name => String(RC_EXTENSION_ID_BY_REP[name]) === extId);
    if (!rep) continue;

    if (r.direction !== 'Outbound') continue;

    byRep[rep].outboundCalls += 1;
    const dur = Number(r.duration) || 0;
    byRep[rep].talkSec += dur;
    if (dur >= 30) byRep[rep].contacted += 1;
  }

  return byRep;
}

function fmtPct(p) {
  if (!Number.isFinite(p)) return '0%';
  return `${Math.round(p * 100)}%`;
}

function fmtMinutes(sec) {
  return `${Math.round((sec || 0) / 60)} min`;
}

function formatYesterdayPerfLines({ repAgg, outboundSmsByRep }) {
  const lines = [];
  for (const rep of SALES_ROSTER) {
    const a = repAgg[rep] || { outboundCalls: 0, contacted: 0, talkSec: 0 };
    const smsOut = outboundSmsByRep?.[rep] ?? 0;
    const rate = a.outboundCalls ? a.contacted / a.outboundCalls : 0;
    lines.push(
      `- ${rep}: outbound calls ${a.outboundCalls} | Contact rate: ${a.contacted}/${a.outboundCalls} (${fmtPct(rate)}) | outbound SMS ${smsOut} | time on phone ${fmtMinutes(a.talkSec)}`,
    );
  }
  return lines.join('\n');
}

function digits10(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (!d) return null;
  return d.length >= 10 ? d.slice(-10) : d;
}

async function getSalesReadyLeadBucketDetails({ accessToken, maxLeadsPerRep = 200 }) {
  // For each rep, pull Sales_Ready leads with phone numbers + Last_Activity_Time.
  // Then compute:
  // - neverAttempted: Last_Activity_Time is null
  // - attempted: Last_Activity_Time exists
  // - spokenTo: has at least one connected call (>=30s) to the lead phone within our RingCentral call-log window

  const repToOwnerId = await getZohoUserIdsForRoster({ accessToken });
  const byRep = {};

  for (const rep of SALES_ROSTER) {
    const ownerId = repToOwnerId.get(rep);
    if (!ownerId) continue;

    const q = `select id, Full_Name, Phone, Mobile, Lead_Status, Owner, Last_Activity_Time, Created_Time, Modified_Time from Leads where Owner.id = '${ownerId}' and Lead_Status = 'Sales_Ready' limit ${maxLeadsPerRep}`;
    const res = await zohoCrmCoql({ accessToken, apiDomain: ZOHO_API_DOMAIN, selectQuery: q });
    const leads = res?.data || [];

    const normalized = leads.map(l => {
      const phones = [digits10(l.Phone), digits10(l.Mobile)].filter(Boolean);
      return { id: l.id, phones, attempted: Boolean(l.Last_Activity_Time) };
    });

    byRep[rep] = normalized;
  }

  return byRep;
}

async function computeSalesReadyBucketStats({ accessToken, rcFrom, rcTo }) {
  // Pull RC call logs per rep extension for the window; compute spokenTo phone set (connected >=30s)
  const leadsByRep = await getSalesReadyLeadBucketDetails({ accessToken });

  const out = {};
  for (const rep of SALES_ROSTER) {
    const extId = RC_EXTENSION_ID_BY_REP[rep];
    const leads = leadsByRep[rep] || [];

    if (!extId) continue;

    // Note: RC call-log retention limits apply; this gives a "spoken to" view within that window.
    const callLog = await ringcentralGetJson(
      `/restapi/v1.0/account/~/extension/${extId}/call-log?dateFrom=${encodeURIComponent(isoNoMs(rcFrom))}&dateTo=${encodeURIComponent(isoNoMs(rcTo))}&perPage=1000`,
    );

    const spokenPhones = new Set();
    for (const r of callLog.records || []) {
      if ((Number(r.duration) || 0) < 30) continue;
      // consider both directions
      const from = digits10(r.from?.phoneNumber || r.from?.name);
      const to = digits10(r.to?.phoneNumber || r.to?.name);
      if (from) spokenPhones.add(from);
      if (to) spokenPhones.add(to);
    }

    let total = leads.length;
    let attempted = 0;
    let neverAttempted = 0;
    let spokenTo = 0;

    for (const l of leads) {
      if (l.attempted) attempted += 1;
      else neverAttempted += 1;

      const hasSpoken = (l.phones || []).some(p => spokenPhones.has(p));
      if (hasSpoken) spokenTo += 1;
    }

    out[rep] = { total, attempted, spokenTo, neverAttempted };
  }

  return out;
}

async function getCallBonusTracker({ throughDayEndLocal /* Date */ }) {
  // 25 outbound calls/day, 5 days in a row, business days only.
  // Efficient: one account-level call-log pull for a lookback window and group by day.
  const lookbackDays = 21;
  const from = new Date(throughDayEndLocal.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  const log = await getAccountCallLog({ from, to: throughDayEndLocal });
  const recs = log.records || [];

  // build day -> rep -> outboundCalls
  const dayRepOutbound = new Map();
  for (const r of recs) {
    const extId = String(r.extension?.id || '');
    const rep = SALES_ROSTER.find(name => String(RC_EXTENSION_ID_BY_REP[name]) === extId);
    if (!rep) continue;
    if (r.direction !== 'Outbound') continue;

    const day = ymdLocal(new Date(r.startTime));
    if (isWeekendLocalDay(day)) continue;

    if (!dayRepOutbound.has(day)) dayRepOutbound.set(day, {});
    const obj = dayRepOutbound.get(day);
    obj[rep] = (obj[rep] || 0) + 1;
  }

  // streak through most recent business day (yesterday for morning; today for eod)
  // We iterate backwards from throughDayEndLocal's local day.
  const streaks = {};
  for (const rep of SALES_ROSTER) {
    let streak = 0;

    // create backward day list (local-ish)
    let cursor = new Date(throughDayEndLocal);
    for (let i = 0; i < 14; i++) {
      const day = ymdLocal(cursor);
      if (!isWeekendLocalDay(day)) {
        const c = dayRepOutbound.get(day)?.[rep] || 0;
        if (c >= 25) streak += 1;
        else break;
      }
      cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
    }

    streaks[rep] = streak;
  }

  return streaks;
}

async function postToRingCentralChat({ chatId, text }) {
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

  const zohoToken = await getZohoAccessToken();

  if (mode === 'morning') {
    // Header
    const dow = dayOfWeek(todayStart);
    const dom = dayOfMonth(todayStart);
    const left = daysLeftInMonth(todayStart);

    // Meetings today
    const todaysMeetings = await getTodaysMeetings({ accessToken: zohoToken, dayStart: todayStart, nextDayStart: tomorrowStart });
    const meetingsByRep = formatMeetingsByRep(todaysMeetings);

    const totalMeetings = todaysMeetings.length;
    const avg = SALES_ROSTER.length ? totalMeetings / SALES_ROSTER.length : 0;
    const busy = busyLabelByTeamAvg(avg);

    // Pipeline status (last 24h)
    const windowFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const pipeline = await getZohoPipelineMomentum24h({ accessToken: zohoToken, from: windowFrom, to: now });

    // Yesterday perf
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(todayStart.getTime() - 1);

    const yCallLog = await getAccountCallLog({ from: yesterdayStart, to: yesterdayEnd });
    const yAgg = computeOutboundCallAggByRep(yCallLog.records);
    const ySms = await getOutboundSmsCountsByRep({ from: yesterdayStart, to: yesterdayEnd });

    // Bonus tracker through yesterday
    const bonusStreaks = await getCallBonusTracker({ throughDayEndLocal: yesterdayEnd });

    const motivation = MOTIVATION[Math.floor(Math.random() * MOTIVATION.length)];

    const noMeetingReps = Object.entries(meetingsByRep.counts || {}).filter(([, c]) => !c).map(([r]) => r);
    const noMeetingLine = noMeetingReps.length
      ? `If you don’t have meetings today (${noMeetingReps.join(', ')}), take advantage of your buckets and work your Sales_Ready leads hard.`
      : null;

    // Sales_Ready bucket stats: attempted vs spoken to vs never attempted
    // Spoken-to is computed from RingCentral connected calls (>=30s) within a rolling window.
    const rcSpokenWindowDays = 90;
    const rcFrom = new Date(now.getTime() - rcSpokenWindowDays * 24 * 60 * 60 * 1000);

    let salesReadyBucketStats = null;
    try {
      salesReadyBucketStats = await computeSalesReadyBucketStats({ accessToken: zohoToken, rcFrom, rcTo: now });
    } catch {
      salesReadyBucketStats = null;
    }

    const bucketLines = salesReadyBucketStats
      ? [
          'TOTAL LEADS IN YOUR BUCKET CONTACTED (ATTEMPTED vs SPOKEN TO vs NEVER ATTEMPTED)',
          ...SALES_ROSTER.filter(r => salesReadyBucketStats?.[r]).map(r => {
            const s = salesReadyBucketStats[r];
            return `${r} (Sales_Ready): total ${s.total} | attempted ${s.attempted} | spoken to ${s.spokenTo} | never attempted ${s.neverAttempted}`;
          }),
        ].join('\n')
      : null;

    // Use section blocks joined by blank lines to avoid RC "wall-of-text"
    const sections = [
      [`Good morning team,`, `It’s ${dow}, Feb ${dom} (${left} days left in the month) and it’s going to be a ${busy} (team avg: ${avg.toFixed(2)} meetings/person).`, `“${motivation}”`].join('\n'),
      [
        'CUSTOMER / PIPELINE STATUS',
        `- Strong movement in the last 24h: ${pipeline.dealsUpdated} deals updated`,
        `- Closings happening: ${pipeline.closedWon} Closed-Won`,
        `- Calendar filling: ${pipeline.meetingsBooked} new meetings booked`,
        'Keep the pace steady and the notes clean — momentum is there.',
      ].join('\n'),
      ['MEETINGS TODAY (BY REP)', meetingsByRep.text || '- None', noMeetingLine].filter(Boolean).join('\n'),
      bucketLines,
      [`YESTERDAY’S OUTBOUND PERFORMANCE (CALLS + SMS + TALK TIME) (${yesterdayStart.toLocaleDateString('en-US')})`, formatYesterdayPerfLines({ repAgg: yAgg, outboundSmsByRep: ySms })].join('\n'),
      ['CALL BONUS TRACKER (25 OUTBOUND CALLS/DAY, 5 DAYS IN A ROW = $50):', ...SALES_ROSTER.map(rep => `- ${rep}: ${bonusStreaks[rep] || 0}/5 days`)].join('\n'),
    ].filter(Boolean);

    const text = sections.join('\n\n') + '\n';

    await postToRingCentralChat({ chatId, text });
    process.stdout.write('Posted MORNING update to RingCentral chat.\n');
    return;
  }

  // mode === 'eod'
  // "Cap" of how the day went (no pipeline section)

  const todaysMeetings = await getTodaysMeetings({ accessToken: zohoToken, dayStart: todayStart, nextDayStart: tomorrowStart });
  const meetingsByRep = formatMeetingsByRep(todaysMeetings);

  const callLog = await getAccountCallLog({ from: todayStart, to: now });
  const agg = computeOutboundCallAggByRep(callLog.records);
  const sms = await getOutboundSmsCountsByRep({ from: todayStart, to: now });

  const bonusStreaks = await getCallBonusTracker({ throughDayEndLocal: now });

  const perfLines = SALES_ROSTER.map(rep => {
    const a = agg[rep] || { outboundCalls: 0, contacted: 0, talkSec: 0 };
    const smsOut = sms?.[rep] ?? 0;
    const rate = a.outboundCalls ? a.contacted / a.outboundCalls : 0;
    return `- ${rep}: outbound calls ${a.outboundCalls} | Contact rate: ${a.contacted}/${a.outboundCalls} (${fmtPct(rate)}) | outbound SMS ${smsOut} | time on phone ${fmtMinutes(a.talkSec)}`;
  }).join('\n');

  const text = [
    `Team — Day Cap (${todayStart.toLocaleDateString('en-US')}, through ${fmtLocalTime(now)})`,
    '',
    'Today’s meetings',
    meetingsByRep.text || '- None',
    '',
    'Today’s outbound performance',
    perfLines,
    '',
    'Bonus Tracker Update (25 outbound calls/day streak)',
    ...SALES_ROSTER.map(rep => `- ${rep}: ${bonusStreaks[rep] || 0}/5`),
  ].filter(Boolean).join('\n');

  await postToRingCentralChat({ chatId, text });
  process.stdout.write('Posted EOD update to RingCentral chat.\n');
})().catch(err => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
