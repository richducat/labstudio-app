'use client';

import { useState, type FormEvent } from 'react';

export default function VerifiedLoginForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/lab/auth/${challengeId ? 'login' : 'request-code'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, challengeId, code }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Unable to sign in.');
      if (challengeId) window.location.assign(nextPath);
      else setChallengeId(result.challengeId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to sign in.'); }
    finally { setBusy(false); }
  }
  const inputClass = 'rounded-2xl border border-white/20 bg-white/5 p-4 text-white focus:outline-2 focus:outline-violet-400';
  return <form onSubmit={submit} className="mt-8 grid gap-4">
    <label className="grid gap-2">Email
      <input type="email" autoComplete="email" required maxLength={254} value={email} readOnly={!!challengeId || busy} onChange={e => setEmail(e.target.value)} className={inputClass} />
    </label>
    {challengeId && <>
      <p role="status">Check your email. Your code expires in 10 minutes.</p>
      <label className="grid gap-2">Six-digit code
        <input autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value)} className={inputClass} />
      </label>
    </>}
    {error && <p role="alert" className="text-rose-200">{error}</p>}
    <button disabled={busy} className="rounded-2xl bg-violet-600 p-4 font-semibold disabled:opacity-60">{busy ? 'Please wait…' : challengeId ? 'Verify and sign in' : 'Email me a code'}</button>
    {challengeId && <button type="button" disabled={busy} onClick={() => { setChallengeId(''); setCode(''); setError(''); }} className="p-3 text-violet-200">Use another email or request a new code</button>}
  </form>;
}
