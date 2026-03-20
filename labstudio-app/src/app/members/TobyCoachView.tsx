'use client';

import { useEffect } from 'react';
import { Bot } from 'lucide-react';
import Script from 'next/script';

const ZAPIER_FRAME_STYLE = [
  'display: block',
  'width: 100%',
  'height: 100%',
  'min-height: 100%',
  'max-width: 100%',
  'border: none',
  'border-radius: 0',
  'background: #09090b',
  'box-shadow: none',
  'overflow: hidden',
].join('; ');

export default function TobyCoachView() {
  useEffect(() => {
    const setViewportHeight = () => {
      document.documentElement.style.setProperty('--lab-vh', `${window.innerHeight}px`);
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  return (
    <div
      className="w-full mx-auto flex flex-col min-h-0"
      style={{ height: 'clamp(340px, calc(var(--lab-vh, 100dvh) - 236px), 900px)' }}
    >
      <Script
        async
        type="module"
        strategy="afterInteractive"
        src="https://interfaces.zapier.com/assets/web-components/zapier-interfaces/zapier-interfaces.esm.js"
        crossOrigin="anonymous"
      />

      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.5)]">
            <Bot size={24} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black italic uppercase tracking-tight">Toby</h2>
              <span className="px-1.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[9px] font-bold text-violet-400 uppercase tracking-widest">
                Coach
              </span>
            </div>
            <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ready to chat
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-0 sm:px-2 pb-4 sm:pb-6 overflow-hidden">
        <div className="relative h-full w-full min-h-0 overflow-hidden rounded-[20px] border border-white/10 bg-zinc-950 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
          <div className="h-full w-full max-w-[960px] mx-auto bg-zinc-950 overflow-hidden">
            <zapier-interfaces-chatbot-embed
              className="block h-full w-full"
              is-popup="false"
              chatbot-id="cm8vrs6dr0039nau2hfeyvvhn"
              height="100%"
              width="100%"
              style-override={ZAPIER_FRAME_STYLE}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
