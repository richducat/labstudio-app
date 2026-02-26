'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Loader2, Sparkles, Brain } from 'lucide-react';

type Msg = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isTool?: boolean;
};

export default function TobyCoachView() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content: "I’m Toby. I’ve just been upgraded with full access to your Lab profile and workout history. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    setBusy(true);
    setInput('');
    const newMessages: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);

    try {
      // Send the history formatted for the new API
      const history = newMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/toby/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Request failed');

      setMessages((m) => [...m, { role: 'assistant', content: String(json.reply || '') }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: 'system',
          content: `Error: ${e instanceof Error ? e.message : 'unknown error'}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] max-w-2xl mx-auto">
      {/* Toby Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.5)]">
              <Bot size={24} className="text-white" />
            </div>
            {busy && (
              <div className="absolute -bottom-1 -right-1 bg-zinc-950 rounded-full p-1 border border-violet-500/50">
                <Loader2 size={12} className="animate-spin text-violet-400" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black italic uppercase tracking-tight">TOBY AI</h2>
              <span className="px-1.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[9px] font-bold text-violet-400 uppercase tracking-widest">
                Agent v2.0
              </span>
            </div>
            <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              CONNECTED TO LAB SYSTEMS
            </div>
          </div>
        </div>
        <div className="p-2 bg-zinc-900 rounded-xl border border-white/5 opacity-50">
          <Brain size={18} className="text-zinc-400" />
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4 scrollbar-hide pb-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            {m.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center mr-2 shrink-0 border border-white/5 self-end mb-1">
                <Bot size={16} className="text-violet-400" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed relative ${m.role === 'user'
                ? 'bg-violet-600 text-white rounded-br-none shadow-lg shadow-violet-900/10'
                : m.role === 'system'
                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 w-full text-center'
                  : 'bg-zinc-900 border border-white/10 text-zinc-200 rounded-bl-none backdrop-blur-md'
                }`}
            >
              {m.content}

              {/* Message tail for user */}
              {m.role === 'user' && (
                <div className="absolute bottom-0 right-[-6px] w-4 h-4 bg-violet-600 clip-path-tail-right" style={{ clipPath: 'polygon(0 0, 0% 100%, 100% 100%)' }} />
              )}
              {/* Message tail for assistant */}
              {m.role === 'assistant' && (
                <div className="absolute bottom-0 left-[-6px] w-4 h-4 bg-zinc-900 border-l border-white/10 clip-path-tail-left" style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} />
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center mr-2 shrink-0 border border-white/5 self-end mb-1">
              <Bot size={16} className="text-violet-400" />
            </div>
            <div className="bg-zinc-900 border border-white/10 text-zinc-500 rounded-2xl rounded-bl-none px-4 py-3 backdrop-blur-md flex items-center gap-1">
              <span className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce" />
              <span className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1 h-1 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className="mt-4 pb-6">
        <div className="relative">
          <input
            className="w-full bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 pr-14 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 transition-all"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Toby about your training, vitals, or the lab..."
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <button
            className="absolute right-2 top-2 bottom-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-3 disabled:opacity-50 disabled:hover:bg-violet-600 transition-colors"
            onClick={() => void send()}
            disabled={!input.trim() || busy}
          >
            <Send size={18} />
          </button>
        </div>
        <div className="flex items-center justify-between px-2 mt-3">
          <div className="flex gap-3 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1"><Sparkles size={10} className="text-yellow-500" /> GPT-4o Agent</span>
            <span className="flex items-center gap-1"><Brain size={10} className="text-violet-400" /> System Aware</span>
          </div>
          <div className="text-[9px] text-zinc-600 font-mono">
            V2.4.0-STABLE
          </div>
        </div>
      </div>
    </div>
  );
}
