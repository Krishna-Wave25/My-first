import { addMinutes, startOfDay } from "date-fns";
import type { Task } from "../db/types";
import { priorityWeight } from "../db/types";
import { dayKey } from "./dates";

export interface PlanBlock {
  taskId: string;
  title: string;
  start: Date;
  end: Date;
  kind: "fixed" | "flex";
  deadline?: Date;
}
export interface PlanResult {
  blocks: PlanBlock[];
  unscheduled: Task[];
  conflicts: { a: PlanBlock; b: PlanBlock }[];
  atRisk: PlanBlock[]; // flexible blocks that end after their deadline
  freeMinutes: number;
  plannedMinutes: number;
  notes: string[];
}

const DEFAULT_MIN: Record<Task["priority"], number> = { critical: 60, high: 45, medium: 30, low: 20 };
const BUFFER = 5;

const at = (day: Date, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d;
};
const ceil15 = (d: Date) => {
  const x = new Date(d);
  x.setSeconds(0, 0);
  const m = x.getMinutes();
  x.setMinutes(Math.ceil(m / 15) * 15);
  return x;
};

/**
 * Build a realistic plan for `day`: timed tasks with an explicit duration are fixed events;
 * everything else is placed greedily by importance/urgency into the free gaps of the work window.
 */
export function suggestPlan(tasks: Task[], day: Date, workStart: string, workEnd: string, now: Date = new Date()): PlanResult {
  const todayKey = dayKey(now);
  const dKey = dayKey(day);
  const isToday = todayKey === dKey;
  const open = tasks.filter((t) => t.status === "todo");

  const dueOnDay = (t: Task) => !!t.due && dayKey(new Date(t.due)) === dKey;
  const overdue = (t: Task) => !!t.due && (t.hasTime ? new Date(t.due) < now : startOfDay(new Date(t.due)) < startOfDay(now));
  const candidates = open.filter((t) => dueOnDay(t) || (isToday && overdue(t)) || (!t.due && priorityWeight(t.priority) >= 3));

  const notes: string[] = [];
  const fixed: PlanBlock[] = [];
  const flex: Task[] = [];
  for (const t of candidates) {
    if (t.hasTime && t.durationMin && dueOnDay(t)) {
      const s = new Date(t.due!);
      fixed.push({ taskId: t.id, title: t.title, start: s, end: addMinutes(s, t.durationMin), kind: "fixed" });
    } else flex.push(t);
  }
  fixed.sort((a, b) => a.start.getTime() - b.start.getTime());

  const conflicts: PlanResult["conflicts"] = [];
  for (let i = 0; i < fixed.length; i++)
    for (let j = i + 1; j < fixed.length; j++)
      if (fixed[j].start < fixed[i].end && fixed[i].start < fixed[j].end) conflicts.push({ a: fixed[i], b: fixed[j] });

  const wsDay = new Date(day);
  const winStart0 = at(wsDay, workStart);
  const winEnd = at(wsDay, workEnd);
  const winStart = isToday && now > winStart0 ? ceil15(now) : winStart0;

  // free gaps = window minus fixed blocks
  let gaps: { s: Date; e: Date }[] = [];
  if (winStart < winEnd) {
    let cursor = winStart;
    for (const f of fixed) {
      if (f.end <= cursor) continue;
      if (f.start > cursor) gaps.push({ s: cursor, e: f.start < winEnd ? f.start : winEnd });
      if (f.end > cursor) cursor = f.end;
    }
    if (cursor < winEnd) gaps.push({ s: cursor, e: winEnd });
  }
  gaps = gaps.filter((g) => g.e > g.s);
  const freeMinutes = Math.round(gaps.reduce((a, g) => a + (g.e.getTime() - g.s.getTime()) / 60000, 0));

  const urgency = (t: Task) => {
    let u = priorityWeight(t.priority) * 10;
    if (overdue(t)) u += 15;
    else if (t.due && dueOnDay(t)) u += 8;
    if (t.due && t.hasTime) u += 3; // has a real deadline time
    return u;
  };
  flex.sort((a, b) => urgency(b) - urgency(a) || (a.due && b.due ? +new Date(a.due) - +new Date(b.due) : 0));
  // among tasks with a same-day deadline time, earlier deadlines first inside equal urgency bands
  flex.sort((a, b) => {
    const ua = Math.floor(urgency(a) / 10), ub = Math.floor(urgency(b) / 10);
    if (ua !== ub) return ub - ua;
    const da = a.due && a.hasTime ? +new Date(a.due) : Infinity;
    const db_ = b.due && b.hasTime ? +new Date(b.due) : Infinity;
    return da - db_;
  });

  const flexBlocks: PlanBlock[] = [];
  const unscheduled: Task[] = [];
  for (const t of flex) {
    const dur = t.durationMin ?? DEFAULT_MIN[t.priority];
    const idx = gaps.findIndex((g) => (g.e.getTime() - g.s.getTime()) / 60000 >= dur);
    if (idx < 0) { unscheduled.push(t); continue; }
    const g = gaps[idx];
    const start = g.s;
    const end = addMinutes(start, dur);
    const deadline = t.due && t.hasTime && dueOnDay(t) ? new Date(t.due) : undefined;
    flexBlocks.push({ taskId: t.id, title: t.title, start, end, kind: "flex", deadline });
    const rest = addMinutes(end, BUFFER);
    if (rest < g.e) gaps[idx] = { s: rest, e: g.e }; else gaps.splice(idx, 1);
  }

  const atRisk = flexBlocks.filter((b) => b.deadline && b.end > b.deadline);
  const blocks = [...fixed, ...flexBlocks].sort((a, b) => a.start.getTime() - b.start.getTime());
  const plannedMinutes = Math.round(blocks.reduce((a, b) => a + (b.end.getTime() - b.start.getTime()) / 60000, 0));

  if (conflicts.length) notes.push(`${conflicts.length} scheduling conflict${conflicts.length > 1 ? "s" : ""}: overlapping fixed events.`);
  if (unscheduled.length) notes.push(`${unscheduled.length} task${unscheduled.length > 1 ? "s don't" : " doesn't"} fit in your working hours — postpone or shorten something.`);
  if (atRisk.length) notes.push(`${atRisk.length} task${atRisk.length > 1 ? "s are" : " is"} scheduled to finish after ${atRisk.length > 1 ? "their" : "its"} deadline.`);
  if (isToday && winStart >= winEnd) notes.push("Working hours for today are over — plan tomorrow instead.");
  if (!candidates.length) notes.push("Nothing is due. Add a task or pull one forward.");

  return { blocks, unscheduled, conflicts, atRisk, freeMinutes, plannedMinutes, notes };
}

/** Detect overlapping timed tasks across all days (for a "conflicts" badge). */
export function findConflicts(tasks: Task[]): { a: Task; b: Task }[] {
  const ev = tasks
    .filter((t) => t.status === "todo" && t.due && t.hasTime && t.durationMin)
    .map((t) => ({ t, s: +new Date(t.due!), e: +new Date(t.due!) + t.durationMin! * 60000 }))
    .sort((x, y) => x.s - y.s);
  const out: { a: Task; b: Task }[] = [];
  for (let i = 0; i < ev.length; i++)
    for (let j = i + 1; j < ev.length && ev[j].s < ev[i].e; j++) out.push({ a: ev[i].t, b: ev[j].t });
  return out;
}
