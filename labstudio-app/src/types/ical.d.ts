declare module 'ical' {
  // Library returns a nested object of parsed iCal entries.
  // We keep this intentionally loose, but avoid `any` to satisfy lint.
  export function parseICS(ics: string): unknown;
}
