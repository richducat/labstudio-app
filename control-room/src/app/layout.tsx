import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Control Room',
  description: 'Local ops dashboard',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>Control Room</div>
              <div className="small">OpenClaw cron + reminders + git activity</div>
            </div>
            <div className="small">{new Date().toLocaleString()}</div>
          </div>
          <div style={{ height: 16 }} />
          {children}
          <div style={{ height: 24 }} />
          <div className="small">Data sources: ~/.openclaw/cron/jobs.json + ~/.openclaw/cron/runs/*.jsonl + git CLI</div>
        </div>
      </body>
    </html>
  );
}
