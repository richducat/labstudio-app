'use client';

import { useState } from 'react';
import type { SafeButton } from '@/lib/control-room/types';
import { runSafeJob } from '../actions';

export function SafeButtonsPanel({ buttons }: { buttons: SafeButton[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ stdout?: string; stderr?: string; error?: string } | null>(null);

  async function onRun(b: SafeButton) {
    const ok = window.confirm(b.confirmText || `Run ${b.label}?`);
    if (!ok) return;

    setBusy(b.jobId);
    setResult(null);
    try {
      const res = await runSafeJob(b.jobId);
      setResult({ stdout: res.stdout, stderr: res.stderr });
    } catch (e: any) {
      setResult({ error: String(e?.message || e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="panel">
      <h2>Safe Buttons</h2>
      <div className="small">Allowlisted job triggers (no arbitrary commands).</div>
      <div style={{ height: 10 }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {buttons.map((b) => (
          <button key={b.id} className="btn primary" disabled={!!busy} onClick={() => onRun(b)}>
            {busy === b.jobId ? 'Running…' : b.label}
          </button>
        ))}
        {buttons.length === 0 ? <div className="small">No safe buttons configured.</div> : null}
      </div>
      {result ? (
        <>
          <hr />
          {result.error ? <div className="badge bad">Error: {result.error}</div> : null}
          {result.stdout ? (
            <>
              <div className="small" style={{ marginTop: 10 }}>stdout</div>
              <pre>{result.stdout}</pre>
            </>
          ) : null}
          {result.stderr ? (
            <>
              <div className="small" style={{ marginTop: 10 }}>stderr</div>
              <pre>{result.stderr}</pre>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
