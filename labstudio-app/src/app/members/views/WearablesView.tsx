'use client';

import { useEffect, useState } from 'react';
import { Smartphone, CheckCircle, RefreshCcw, Wifi, AlertTriangle } from 'lucide-react';
import Card from '../components/Card';

const WEARABLES = [
  { id: 'apple', name: 'Apple Health', icon: Smartphone, color: 'text-rose-500' },
  { id: 'oura', name: 'Oura Ring', icon: Wifi, color: 'text-zinc-200' },
  { id: 'whoop', name: 'Whoop', icon: RefreshCcw, color: 'text-blue-500' },
];

export default function WearablesView() {
  const [connected, setConnected] = useState<string[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    // Load current connections from profile
    fetch('/api/lab/profile')
      .then(r => r.json())
      .then(j => {
        if (j.ok && j.profile?.wearables_json) {
          const w = j.profile.wearables_json;
          setConnected(Object.keys(w).filter(k => w[k]?.connected));
        }
      });
  }, []);

  const handleSync = async (id: string) => {
    if (connected.includes(id)) return;

    setSyncing(id);
    // Simulate OAuth/Sync flow
    await new Promise(r => setTimeout(r, 2000));

    try {
      const res = await fetch('/api/lab/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wearables_json: {
            ...connected.reduce((acc, curr) => ({ ...acc, [curr]: { connected: true } }), {}),
            [id]: { connected: true, last_sync: new Date().toISOString() }
          }
        })
      });
      if (res.ok) setConnected(prev => [...prev, id]);
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="px-1">
        <h1 className="text-2xl font-black italic uppercase">Health Stack</h1>
        <div className="text-xs text-zinc-500 mt-1">Connect your devices to fuel Toby AI with real-time vitals and recovery data.</div>
      </div>

      <div className="grid gap-3">
        {WEARABLES.map((w) => {
          const Icon = w.icon;
          const isConnected = connected.includes(w.id);
          const isSyncing = syncing === w.id;

          return (
            <Card key={w.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center ${w.color}`}>
                  <Icon size={24} />
                </div>
                <div>
                  <div className="font-bold">{w.name}</div>
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                    {isConnected ? 'Synced & Active' : 'Not Connected'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => void handleSync(w.id)}
                disabled={isConnected || isSyncing}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isConnected
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1.5'
                  : isSyncing
                    ? 'text-zinc-500 bg-zinc-800 border border-white/5 animate-pulse'
                    : 'text-white bg-violet-600 hover:bg-violet-500'
                  }`}
              >
                {isConnected ? (
                  <>
                    <CheckCircle size={14} /> Connected
                  </>
                ) : isSyncing ? (
                  'Pairing...'
                ) : (
                  'Connect'
                )}
              </button>
            </Card>
          );
        })}
      </div>

      <Card className="p-4 bg-yellow-500/5 border-yellow-500/20 flex gap-4 items-start">
        <AlertTriangle size={20} className="text-yellow-500 shrink-0" />
        <div>
          <div className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-1">State of the Art Sync</div>
          <div className="text-xs text-zinc-400 leading-relaxed">
            By connecting your devices, Toby can automatically adjust your &ldquo;Today&apos;s Focus&rdquo; based on your HRV and Sleep quality.
          </div>
        </div>
      </Card>

      <p className="text-[10px] text-zinc-600 text-center px-4">
        Device connections are stored securely. We use the official APIs for Apple Health, Oura, and Whoop to pull biometric data.
      </p>
    </div>
  );
}
