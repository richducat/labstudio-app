'use client';

import { useFormStatus } from 'react-dom';
import { ArrowRight, LoaderCircle } from 'lucide-react';

export default function LoginSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="mt-2 inline-flex items-center justify-center gap-2 rounded-[1.4rem] bg-[linear-gradient(135deg,_#7c3aed_0%,_#a21caf_100%)] px-4 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-[0_18px_34px_rgba(124,58,237,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_42px_rgba(124,58,237,0.42)] disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0"
    >
      {pending ? (
        <>
          Entering
          <LoaderCircle className="h-4 w-4 animate-spin" />
        </>
      ) : (
        <>
          Enter Lab Studio
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}
