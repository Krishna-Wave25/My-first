import { addDays, endOfDay, format, startOfDay } from "date-fns";

/** Local calendar-day key, YYYY-MM-DD. */
export const dayKey = (d: Date = new Date()) => format(d, "yyyy-MM-dd");
export const monthKey = (d: Date = new Date()) => format(d, "yyyy-MM");
export const parseDayKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export { addDays, startOfDay, endOfDay, format };

export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Offset (ms) of `tz` from UTC at the given instant. */
function tzOffsetMs(utcMs: number, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
  });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(new Date(utcMs))) {
    if (part.type !== "literal") p[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** The instant at which the wall clock in `tz` reads y-m-d h:mi. */
export function instantInZone(y: number, m: number, d: number, h: number, mi: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, h, mi);
  let utc = guess - tzOffsetMs(guess, tz);
  utc = guess - tzOffsetMs(utc, tz); // second pass handles DST edges
  return new Date(utc);
}

/** Calendar parts of an instant as seen in `tz`. */
export function partsInZone(date: Date, tz: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric",
  });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(date)) if (part.type !== "literal") p[part.type] = Number(part.value);
  return { year: p.year, month: p.month, day: p.day, hour: p.hour, minute: p.minute };
}

/** Next `count` instants (starting from `from`) at which the wall clock in `tz` reads HH:mm. */
export function nextDailyInstants(hhmm: string, tz: string, count: number, from: Date = new Date()): Date[] {
  const [h, mi] = hhmm.split(":").map(Number);
  const base = partsInZone(from, tz);
  const out: Date[] = [];
  for (let i = 0; out.length < count && i < count + 2; i++) {
    const day = new Date(Date.UTC(base.year, base.month - 1, base.day + i));
    const inst = instantInZone(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), h, mi, tz);
    if (inst.getTime() > from.getTime()) out.push(inst);
  }
  return out;
}

/** Next `count` instants on weekday `dow` (0=Sun) at HH:mm in `tz`. */
export function nextWeeklyInstants(dow: number, hhmm: string, tz: string, count: number, from: Date = new Date()): Date[] {
  const [h, mi] = hhmm.split(":").map(Number);
  const base = partsInZone(from, tz);
  const out: Date[] = [];
  for (let i = 0; out.length < count && i < count * 7 + 7; i++) {
    const day = new Date(Date.UTC(base.year, base.month - 1, base.day + i));
    if (day.getUTCDay() !== dow) continue;
    const inst = instantInZone(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), h, mi, tz);
    if (inst.getTime() > from.getTime()) out.push(inst);
  }
  return out;
}

export function fmtDue(iso: string | null, hasTime: boolean, now: Date = new Date()): string {
  if (!iso) return "No date";
  const d = new Date(iso);
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / 86400000);
  const day = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff === -1 ? "Yesterday" : format(d, "EEE d MMM");
  return hasTime ? `${day}, ${format(d, "h:mm a")}` : day;
}

export function relativeTime(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "date unknown";
  const ms = now.getTime() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d} d ago` : format(new Date(iso), "d MMM yyyy");
}

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
export const inrCompact = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return inr(n);
};
