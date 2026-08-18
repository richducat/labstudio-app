'use client';

import Card from '../components/Card';

export default function PlaceholderView({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-4 pb-20">
      <div className="px-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle ? <div className="text-xs text-zinc-500 mt-1">{subtitle}</div> : null}
      </div>

      <Card className="p-4">
        <div className="text-sm text-zinc-300">Nothing to show yet.</div>
        <div className="text-xs text-zinc-500 mt-2">
          This section will populate as you start using it.
        </div>
      </Card>
    </div>
  );
}
