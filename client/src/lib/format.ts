const dateFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const weekdayFmt = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric' });

/** Parse a YYYY-MM-DD as a local calendar date (avoids UTC shift). */
export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const fmtDate = (iso: string | null | undefined) => (iso ? dateFmt.format(iso.length === 10 ? parseDay(iso) : new Date(iso)) : '—');
export const fmtShort = (iso: string) => shortFmt.format(parseDay(iso));
export const fmtWeekday = (iso: string) => weekdayFmt.format(parseDay(iso));
export const fmtDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseDay(iso);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Days from today (negative = overdue). */
export function daysFromToday(iso: string): number {
  return Math.round((parseDay(iso).getTime() - parseDay(todayISO()).getTime()) / 86400000);
}

export function relativeDue(iso: string): string {
  const d = daysFromToday(iso);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d === -1) return '1 day overdue';
  if (d < 0) return `${-d} days overdue`;
  return `In ${d} days`;
}

export const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

export function fmtMobile(m: string) {
  return m.length === 10 ? `${m.slice(0, 5)} ${m.slice(5)}` : m;
}

export function mapsHref(link: string): string {
  return /^https?:\/\//i.test(link) ? link : `https://www.google.com/maps?q=${encodeURIComponent(link)}`;
}
