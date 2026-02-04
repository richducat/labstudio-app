'use client';

import { useEffect, useState } from 'react';
import Card from '../components/Card';

export default function AmenitiesView() {
  const [page, setPage] = useState<{ title: string; body_md: string; source_url: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/lab/content?slug=amenities-perks')
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok) setPage(j.page);
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const lines = (page?.body_md || '').split('\n');

  return (
    <div className="space-y-4 pb-20">
      <div className="px-1">
        <h1 className="text-2xl font-black italic uppercase">{page?.title || 'Amenities & Perks'}</h1>
        {page?.source_url ? <div className="text-xs text-zinc-500 mt-1">Source: {page.source_url}</div> : null}
      </div>

      {!page ? (
        <Card className="p-4">
          <div className="text-sm text-zinc-300">Loading…</div>
        </Card>
      ) : (
        <Card className="p-4 space-y-2">
          {lines.map((ln, idx) => {
            const t = ln.trim();
            if (!t) return <div key={idx} className="h-2" />;
            if (t.startsWith('## ')) return <div key={idx} className="text-sm font-black">{t.replace(/^##\s+/, '')}</div>;
            if (t.startsWith('- ')) return <div key={idx} className="text-sm text-zinc-300">• {t.slice(2)}</div>;
            return <div key={idx} className="text-xs text-zinc-500">{t}</div>;
          })}
        </Card>
      )}
    </div>
  );
}
