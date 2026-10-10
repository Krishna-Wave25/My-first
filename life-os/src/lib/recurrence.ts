import { addDays, addMonths } from "date-fns";
import type { Recurrence } from "../db/types";

/** Next occurrence strictly after `from`, or null if the series has ended. */
export function nextOccurrence(from: Date, rule: Recurrence): Date | null {
  let next: Date;
  const n = Math.max(1, rule.interval || 1);
  if (rule.freq === "daily") {
    next = addDays(from, n);
  } else if (rule.freq === "monthly") {
    next = addMonths(from, n);
  } else {
    const days = (rule.byDay && rule.byDay.length ? [...rule.byDay] : [from.getDay()]).sort((a, b) => a - b);
    // Look for the next listed weekday later in the same week-block, else jump `n` weeks.
    const later = days.find((d) => d > from.getDay());
    if (later !== undefined) {
      next = addDays(from, later - from.getDay());
    } else {
      next = addDays(from, n * 7 - from.getDay() + days[0]);
    }
  }
  if (rule.until && next > new Date(rule.until + "T23:59:59")) return null;
  return next;
}

export function describeRecurrence(r: Recurrence | null): string {
  if (!r) return "Does not repeat";
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (r.freq === "daily") return r.interval === 1 ? "Every day" : `Every ${r.interval} days`;
  if (r.freq === "monthly") return r.interval === 1 ? "Every month" : `Every ${r.interval} months`;
  const d = r.byDay && r.byDay.length ? r.byDay.map((x) => names[x]).join(", ") : "same weekday";
  const wk = [1, 2, 3, 4, 5].every((x) => r.byDay?.includes(x)) && r.byDay?.length === 5;
  if (wk) return "Every weekday";
  return r.interval === 1 ? `Every week on ${d}` : `Every ${r.interval} weeks on ${d}`;
}
