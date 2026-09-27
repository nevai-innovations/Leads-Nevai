/**
 * Follow-up dates are calendar dates (Postgres DATE, stored as UTC midnight).
 * "Today" is resolved in the business timezone so it matches what field staff see.
 */
const TZ = process.env.APP_TIMEZONE || 'Asia/Kolkata';

export function todayISO(): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(),
  );
}

export function dateOnly(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}

export function today(): Date {
  return dateOnly(todayISO());
}

/** Monday of the current week (business timezone), as a UTC-midnight date. */
export function startOfWeek(): Date {
  const t = today();
  const dow = (t.getUTCDay() + 6) % 7; // Mon=0
  return addDays(t, -dow);
}

/** Start of "today" in the business timezone as an absolute instant, for createdAt comparisons. */
export function tzMidnightInstant(d: Date): Date {
  // Offset of TZ at that date, derived from Intl, so createdAt (timestamp) comparisons line up with local days.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
  const offsetMs = asUTC - d.getTime();
  return new Date(d.getTime() - offsetMs);
}

export function toISODate(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

/** Local (business timezone) calendar date of an instant. */
export function localISODate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
