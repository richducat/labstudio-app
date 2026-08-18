'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, SendHorizonal } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; text: string };

const OPENER: Msg = {
  role: 'assistant',
  text: "I'm Toby, your coach. Tell me what you're trying to improve right now — sleep, strength, body comp, stress, consistency — and what's getting in the way.",
};

export default function TobyCoachView() {
  const [messages, setMessages] = useState<Msg[]>([OPENER]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const canSend = useMemo(() => input.trim().length > 0 && !busy, [input, busy]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    setBusy(true);
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);

    try {
      const history = [...messages, { role: 'user' as const, text }]
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.text }));
      const res = await fetch('/api/toby/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Request failed');
      setMessages((m) => [...m, { role: 'assistant', text: String(json.reply || '') }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: `Sorry — that didn't go through (${e instanceof Error ? e.message : 'unknown error'}). Try again.`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col pb-24 lg:pb-6">
      <div className="mb-4 flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600">
            <Bot size={22} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">Toby</h2>
              <span className="rounded-md border border-violet-500/20 bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-violet-400">
                Coach
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Ready to chat
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
        <div
          ref={scrollRef}
          className="min-h-[320px] flex-1 space-y-4 overflow-y-auto px-4 py-5"
          style={{ maxHeight: 'calc(100dvh - 380px)' }}
        >
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[85%] rounded-xl rounded-br-sm bg-violet-600 px-4 py-2.5 text-[15px] leading-relaxed text-white'
                    : 'max-w-[85%] rounded-xl rounded-bl-sm border border-white/5 bg-zinc-900 px-4 py-2.5 text-[15px] leading-relaxed text-zinc-100'
                }
              >
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>
            </div>
          ))}
          {busy ? (
            <div className="flex justify-start">
              <div className="rounded-xl rounded-bl-sm border border-white/5 bg-zinc-900 px-4 py-3">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:240ms]" />
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="Message Toby…"
              className="max-h-32 w-full resize-none rounded-lg border border-white/10 bg-zinc-900 px-3.5 py-3 text-[15px] text-white outline-none placeholder:text-zinc-500 focus:border-violet-500/50"
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={!canSend}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition hover:bg-violet-500 disabled:opacity-40"
            >
              <SendHorizonal size={18} />
            </button>
          </div>
          <div className="mt-2 px-1 text-[11px] text-zinc-600">
            Training, recovery, nutrition, and consistency. Toby checks in at the end of each session.
          </div>
        </div>
      </div>
    </div>
  );
}
