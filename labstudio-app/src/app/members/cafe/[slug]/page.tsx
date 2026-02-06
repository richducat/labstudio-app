'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { addToCart } from '@/lib/cart';

type CafeItem = {
  slug: string;
  name: string;
  category: string;
  price_cents: number;
  product_url: string | null;
  image_url?: string | null;
};

export default function CafeItemPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const [it, setIt] = useState<CafeItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async (attempt = 0) => {
      try {
        const r = await fetch('/api/lab/cafe');
        // Edge case: older sessions can be missing labstudio_uid; middleware sets it on the response.
        // The first API call can still see no uid and return 401; retry once.
        if (r.status === 401 && attempt === 0) {
          await new Promise((res) => setTimeout(res, 300));
          return run(1);
        }
        const j = await r.json().catch(() => null);
        if (!mounted) return;
        if (j?.ok && Array.isArray(j.items)) {
          const found = (j.items as CafeItem[]).find((x) => x.slug === slug) || null;
          setIt(found);
        } else {
          setIt(null);
        }
      } catch {
        if (!mounted) return;
        setIt(null);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [slug]);

  const price = useMemo(() => {
    if (!it) return '';
    return `$${(it.price_cents / 100).toFixed(2)}`;
  }, [it]);

  return (
    <main style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: '#a1a1aa', textTransform: 'uppercase' }}>Studio Cafe</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5, marginTop: 6 }}>{it?.name || 'Cafe item'}</h1>
        </div>
        <Link href="/members" style={{ fontSize: 13, fontWeight: 800 }}>
          Back
        </Link>
      </div>

      {loading ? <p style={{ color: '#a1a1aa', marginTop: 12 }}>Loading…</p> : null}
      {!loading && !it ? <p style={{ color: '#a1a1aa', marginTop: 12 }}>Item not found.</p> : null}

      {it?.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={it.image_url}
          alt={it.name}
          style={{ width: '100%', height: 320, objectFit: 'cover', borderRadius: 18, marginTop: 16, border: '1px solid rgba(255,255,255,0.08)' }}
        />
      ) : null}

      {it ? (
        <>
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>{price}</div>
            <div style={{ fontSize: 12, color: '#a1a1aa' }}>{it.category.toUpperCase()}</div>
          </div>

          <button
            type="button"
            style={{
              marginTop: 16,
              width: '100%',
              padding: 14,
              borderRadius: 14,
              fontWeight: 900,
              background: '#facc15',
              color: '#09090b',
              cursor: 'pointer',
            }}
            onClick={() => {
              addToCart(
                {
                  price_id: `cafe:${it.slug}`,
                  slug: it.slug,
                  name: it.name,
                  unit_amount_cents: it.price_cents,
                  image_url: it.image_url ?? null,
                  mode: 'one_time',
                },
                1
              );
              // user can open cart from Shop tab
              window.location.href = '/members?tab=market';
            }}
          >
            Add to cart
          </button>

          {it.product_url ? (
            <a
              href={it.product_url}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'block', marginTop: 12, color: '#a1a1aa', fontSize: 12, textDecoration: 'underline' }}
            >
              View on website
            </a>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
