'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, RefreshCcw, Smartphone, Wifi } from 'lucide-react';
import Card from '../components/Card';

const WEARABLES = [
  { id: 'apple', name: 'Apple Health', icon: Smartphone, color: 'text-rose-500' },
  { id: 'oura', name: 'Oura Ring', icon: Wifi, color: 'text-zinc-200' },
  { id: 'whoop', name: 'Whoop', icon: RefreshCcw, color: 'text-blue-500' },
] as const;

type WearableRecord = {
  connected?: boolean;
  last_sync?: string;
};

type ProfileResponse = {
  ok?: boolean;
  error?: string;
  profile?: {
    wearables_json?: Record<string, WearableRecord>;
  } | null;
};

function formatLastSync(value?: string) {
  if (!value) return 'No recent sync recorded';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No recent sync recorded';

  return `Last sync ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

export default function WearablesView() {
  const [profile, setProfile] = useState<ProfileResponse['profile']>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/lab/profile')
      .then((response) => response.json().catch(() => ({})).then((data) => ({ response, data })))
      .then(({ response, data }) => {
        const payload = data as ProfileResponse;
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || `Failed to load integrations (${response.status})`);
        }
        setProfile(payload.profile ?? null);
        setError(null);
      })
      .catch((fetchError) => {
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to load integrations';
        setError(message);
      });
  }, []);

  const connected = useMemo(() => {
    const wearables = profile?.wearables_json ?? {};
    return new Set(Object.keys(wearables).filter((key) => wearables[key]?.connected));
  }, [profile?.wearables_json]);

  return (
    <div className="space-y-6 pb-20">
      <div className="px-1">
        <h1 className="text-2xl font-black italic uppercase">Wearables</h1>
        <div className="text-xs text-zinc-500 mt-1">
          Review the devices currently linked to your account.
        </div>
      </div>

      {error ? (
        <Card className="p-4 bg-rose-500/10 border-rose-500/20 text-sm text-rose-200">
          {error}
        </Card>
      ) : null}

      <div className="grid gap-3">
        {WEARABLES.map((wearable) => {
          const Icon = wearable.icon;
          const record = profile?.wearables_json?.[wearable.id];
          const isConnected = connected.has(wearable.id);

          return (
            <Card key={wearable.id} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center ${wearable.color}`}>
                  <Icon size={24} />
                </div>
                <div>
                  <div className="font-bold">{wearable.name}</div>
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                    {isConnected ? 'Connected' : 'Not connected'}
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">
                    {isConnected ? formatLastSync(record?.last_sync) : 'This device is not connected to your account.'}
                  </div>
                </div>
              </div>

              <div
                className={`px-3 py-2 rounded-xl text-xs font-bold border shrink-0 ${isConnected
                  ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  : 'text-zinc-400 bg-zinc-900 border-white/5'
                  }`}
              >
                {isConnected ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle size={14} /> Connected
                  </span>
                ) : (
                  'Not connected'
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
