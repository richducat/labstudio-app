#!/usr/bin/env node
/**
 * TYFYS Cashflow + Payroll Runway
 *
 * Backdate to Jan 1 and compute:
 * - Stripe cash collected (net + gross in/out + fees) by month + overall
 * - Payroll obligations (fixed + sales) by pay period (Wed→Wed, 14 days)
 * - Fixed overhead accrual by month
 * - Simple runway snapshot
 *
 * Output:
 * - memory/tyfys/cashflow-runway.json
 * - memory/tyfys/cashflow-runway.md
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import Stripe from 'stripe';

import { loadEnvLocal } from '../lib/load-env-local.mjs';
import { getZohoAccessToken } from '../lib/zoho.mjs';

loadEnvLocal();

function getArg(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (!v || v.startsWith('--')) return def;
  return v;
}

const stripeKey = process.env.STRIPE_API_KEY;
if (!stripeKey) throw new Error('Missing STRIPE_API_KEY');

const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });

const tz = 'America/New_York'; // display only; host is ET

const FIXED_OVERHEAD_MONTHLY = [
  { name: 'Spectrum business (incl RingCentral)', amount: 350 },
  { name: 'Zoho CRM', amount: 600 },
  { name: 'Zapier', amount: 150 },
  { name: 'ChatGPT', amount: 200 },
  { name: 'Office rent', amount: 1100 },
];

const PAYROLL_FIXED_BIWEEKLY = [
  { name: 'Richard salary', amount: 4000 },
  { name: 'Devin salary', amount: 1000 },
];

const currency = (getArg('--currency', 'usd') || 'usd').toLowerCase();

function cents(n) {
  return Math.round(Number(n) * 100);
}

function fmtCents(amount) {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

function monthKey(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function addMonths(d, n) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function computePayPeriods({ from, to }) {
  // Wed→Wed, 14 days. Find the first Wednesday at/after from.
  const start = startOfDay(from);
  const firstEnd = (() => {
    const d = new Date(start);
    while (d.getDay() !== 3) d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  // Start period is 14 days before that end.
  let periodStart = new Date(firstEnd.getTime() - 14 * 24 * 3600 * 1000);
  // Ensure we cover from.
  while (periodStart > start) {
    periodStart = new Date(periodStart.getTime() - 14 * 24 * 3600 * 1000);
  }

  const periods = [];
  let s = periodStart;
  while (s < to) {
    const e = new Date(s.getTime() + 14 * 24 * 3600 * 1000);
    periods.push({ start: new Date(s), end: e });
    s = e;
  }
  return periods;
}

async function listAll(listFn, params) {
  const out = [];
  let starting_after;
  while (true) {
    const res = await listFn({ ...params, limit: 100, ...(starting_after ? { starting_after } : {}) });
    out.push(...res.data);
    if (!res.has_more) break;
    starting_after = res.data[res.data.length - 1].id;
  }
  return out;
}

async function stripeCashByMonth({ fromSec, toSec }) {
  const balanceTx = await listAll(stripe.balanceTransactions.list.bind(stripe.balanceTransactions), {
    created: { gte: fromSec, lte: toSec },
  });

  const byMonth = new Map();
  const totals = { grossIn: 0, grossOut: 0, fee: 0, net: 0, count: 0 };

  for (const bt of balanceTx) {
    const k = monthKey(new Date(bt.created * 1000));
    const m = byMonth.get(k) || { grossIn: 0, grossOut: 0, fee: 0, net: 0, count: 0, types: {} };
    m.count += 1;
    totals.count += 1;

    if (bt.amount > 0) {
      m.grossIn += bt.amount;
      totals.grossIn += bt.amount;
    }
    if (bt.amount < 0) {
      m.grossOut += -bt.amount;
      totals.grossOut += -bt.amount;
    }

    m.fee += bt.fee;
    m.net += bt.net;

    totals.fee += bt.fee;
    totals.net += bt.net;

    m.types[bt.type] ||= { count: 0, net: 0 };
    m.types[bt.type].count += 1;
    m.types[bt.type].net += bt.net;

    byMonth.set(k, m);
  }

  return { byMonth: Object.fromEntries([...byMonth.entries()].sort()), totals };
}

async function mrrSnapshot() {
  // Best-effort: sum active subscriptions' items.
  // This is approximate because quantity/discounts/taxes can apply.
  const subs = await listAll(stripe.subscriptions.list.bind(stripe.subscriptions), {
    status: 'active',
  });

  let mrr = 0;
  for (const s of subs) {
    for (const item of s.items?.data || []) {
      const price = item.price;
      const unit = price?.unit_amount || 0;
      const interval = price?.recurring?.interval;
      const count = price?.recurring?.interval_count || 1;
      const qty = item.quantity || 1;

      if (interval === 'month') mrr += unit * qty;
      else if (interval === 'year') mrr += (unit * qty) / (12 * count);
      else if (interval === 'week') mrr += (unit * qty) * (52 / 12);
      else if (interval === 'day') mrr += (unit * qty) * (365 / 12);
    }
  }

  return { activeSubscriptions: subs.length, mrrCents: Math.round(mrr) };
}

async function main() {
  // Backdate to Jan 1 of current year unless overridden.
  const year = Number(getArg('--year', String(new Date().getFullYear())));
  const from = new Date(`${year}-01-01T00:00:00-05:00`);
  const to = new Date();

  const fromSec = Math.floor(from.getTime() / 1000);
  const toSec = Math.floor(to.getTime() / 1000);

  // Ensure Zoho token exists (even if we don’t call Zoho yet, keeps env honest).
  await getZohoAccessToken();

  const [cash, mrr] = await Promise.all([
    stripeCashByMonth({ fromSec, toSec }),
    mrrSnapshot(),
  ]);

  const overheadMonthlyCents = FIXED_OVERHEAD_MONTHLY.reduce((s, x) => s + cents(x.amount), 0);
  const payrollFixedBiweeklyCents = PAYROLL_FIXED_BIWEEKLY.reduce((s, x) => s + cents(x.amount), 0);

  // Accrue overhead for each month present.
  const overheadByMonth = {};
  for (const k of Object.keys(cash.byMonth)) {
    overheadByMonth[k] = { fixedOverheadCents: overheadMonthlyCents };
  }

  // Pay periods (we’ll plug sales payouts in later by reading payroll reports)
  const payPeriods = computePayPeriods({ from, to }).map(p => ({
    start: p.start.toISOString(),
    end: p.end.toISOString(),
    fixedPayrollCents: payrollFixedBiweeklyCents,
    salesPayrollCents: 0,
    totalPayrollCents: payrollFixedBiweeklyCents,
  }));

  const out = {
    generatedAt: new Date().toISOString(),
    range: { from: from.toISOString(), to: to.toISOString() },
    stripe: {
      currency,
      totals: cash.totals,
      totalsFormatted: {
        grossIn: fmtCents(cash.totals.grossIn),
        grossOut: fmtCents(cash.totals.grossOut),
        fee: fmtCents(cash.totals.fee),
        net: fmtCents(cash.totals.net),
      },
      byMonth: Object.fromEntries(Object.entries(cash.byMonth).map(([k, v]) => [k, {
        ...v,
        formatted: {
          grossIn: fmtCents(v.grossIn),
          grossOut: fmtCents(v.grossOut),
          fee: fmtCents(v.fee),
          net: fmtCents(v.net),
        },
      }])),
      mrr,
      mrrFormatted: { mrr: fmtCents(mrr.mrrCents) },
    },
    assumptions: {
      fixedOverheadMonthly: FIXED_OVERHEAD_MONTHLY,
      fixedOverheadMonthlyTotal: overheadMonthlyCents / 100,
      fixedPayrollBiweekly: PAYROLL_FIXED_BIWEEKLY,
      fixedPayrollBiweeklyTotal: payrollFixedBiweeklyCents / 100,
      note: 'Sales payroll is computed separately from Zoho deals + RingCentral call quota; this report currently includes fixed payroll only until sales payroll is wired in.',
    },
    overheadByMonth,
    payPeriods,
  };

  const md = [];
  md.push(`# TYFYS cashflow + runway (backdated)`);
  md.push('');
  md.push(`Range: ${out.range.from.slice(0,10)} → ${out.range.to.slice(0,10)}`);
  md.push('');
  md.push(`Stripe net cash (range): **${out.stripe.totalsFormatted.net}** (gross in ${out.stripe.totalsFormatted.grossIn}, fees ${out.stripe.totalsFormatted.fee})`);
  md.push(`MRR snapshot: **${out.stripe.mrrFormatted.mrr}** across ${out.stripe.mrr.activeSubscriptions} active subscriptions (approx)`);
  md.push('');
  md.push(`Fixed overhead: **$${(overheadMonthlyCents/100).toFixed(0)}/mo**`);
  md.push(`Fixed payroll: **$${(payrollFixedBiweeklyCents/100).toFixed(0)}/biweekly** (Richard $4000 + Devin $1000)`);
  md.push('');
  md.push('## Monthly cash-in vs fixed overhead (net)');
  for (const [k, v] of Object.entries(out.stripe.byMonth)) {
    md.push(`- ${k}: net ${v.formatted.net} | overhead -$${(overheadMonthlyCents/100).toFixed(0)} => approx surplus ${fmtCents((v.net) - overheadMonthlyCents)}`);
  }

  await fs.mkdir(path.resolve('memory/tyfys'), { recursive: true });
  const outJson = path.resolve('memory/tyfys/cashflow-runway.json');
  const outMd = path.resolve('memory/tyfys/cashflow-runway.md');
  await fs.writeFile(outJson, JSON.stringify(out, null, 2) + '\n', 'utf8');
  await fs.writeFile(outMd, md.join('\n') + '\n', 'utf8');

  process.stdout.write(`Wrote ${outMd}\n`);
}

await main();
