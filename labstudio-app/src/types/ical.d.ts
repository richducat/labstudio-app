declare module 'ical' {
  export function parseICS(ics: string): Record<string, unknown>;
}
