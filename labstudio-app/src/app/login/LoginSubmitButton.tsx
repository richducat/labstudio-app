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
      className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-70"
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
