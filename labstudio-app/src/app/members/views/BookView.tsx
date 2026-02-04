'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import Card from '../components/Card';

type NextBooking = {
  summary: string;
  start: string;
  end: string;
  location: string | null;
  description: string | null;
};

type Waiver = {
  slug: string;
  title: string;
  description: string | null;
  url: string;
  applies_to: string | null;
};

export default function BookView() {
  const [nextBooking, setNextBooking] = useState<NextBooking | null>(null);
  const [waivers, setWaivers] = useState<Waiver[] | null>(null);

  useEffect(() => {
    fetch('/api/lab/home')
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) setNextBooking(data.home?.nextBooking ?? null);
      })
      .catch(() => {});

    fetch('/api/lab/waivers')
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok) setWaivers(j.waivers ?? []);
        else setWaivers([]);
      })
      .catch(() => setWaivers([]));
  }, []);

  return (
    <div className="space-y-4 pb-20">
      <div className="px-1">
        <h1 className="text-2xl font-black italic uppercase">Book + Waivers</h1>
        <div className="text-xs text-zinc-500 mt-1">
          Bookings are backed by a real Google Calendar feed (richducat@gmail.com). Waivers are real links (DB-backed).
        </div>
      </div>

      {nextBooking ? (
        <Card className="p-4">
          <div className="flex items-center gap-2 text-violet-400 font-bold text-xs uppercase tracking-widest">
            <Calendar size={14} /> Next session
          </div>
          <div className="font-black text-xl italic mt-2">{nextBooking.summary || 'Session'}</div>
          <div className="flex items-center gap-2 text-sm text-zinc-300 mt-1">
            <Clock size={14} className="text-zinc-500" />
            {new Date(nextBooking.start).toLocaleString()}
          </div>
          {nextBooking.location ? <div className="text-xs text-zinc-500 mt-2">{nextBooking.location}</div> : null}
          {nextBooking.description ? <div className="text-xs text-zinc-500 mt-2">{nextBooking.description}</div> : null}
        </Card>
      ) : (
        <Card className="p-4">
          <div className="text-sm text-zinc-300">No upcoming session found.</div>
          <div className="text-xs text-zinc-500 mt-2">
            Create an event in the “LabStudio - Bookings” Google Calendar and it will appear here.
          </div>
        </Card>
      )}

      {waivers === null ? (
        <Card className="p-4">
          <div className="text-sm text-zinc-300">Loading waivers…</div>
        </Card>
      ) : waivers.length === 0 ? (
        <Card className="p-4">
          <div className="text-sm text-zinc-300">No waivers configured yet.</div>
          <div className="text-xs text-zinc-500 mt-2">(DB-backed — once waivers exist, they’ll show here.)</div>
        </Card>
      ) : (
        <Card className="p-4 space-y-3">
          <div className="text-sm font-bold text-zinc-300">Waivers</div>
          <div className="grid grid-cols-1 gap-3">
            {waivers.map((w) => (
              <div key={w.slug} className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold">{w.title}</div>
                  {w.description ? <div className="text-xs text-zinc-500 mt-1">{w.description}</div> : null}
                </div>
                <a
                  href={w.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs font-black text-zinc-950 bg-yellow-400 hover:bg-yellow-300 px-3 py-2 rounded-xl"
                >
                  Open
                </a>
              </div>
            ))}
          </div>
          <div className="text-xs text-zinc-500">
            Memberships/passes live in the Shop tab (deep links to Stripe checkout).
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="text-sm text-zinc-300">Create a booking (manual for now)</div>
        <div className="text-xs text-zinc-500 mt-2">
          We’ll wire true self-serve booking (slot selection + event creation) once we add Google API OAuth.
        </div>
      </Card>
    </div>
  );
}
