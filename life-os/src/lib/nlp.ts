import * as chrono from "chrono-node";
import { addDays, setHours, setMinutes, startOfDay } from "date-fns";
import type { Category, Priority, Recurrence, Task } from "../db/types";

export type TaskDraft = Pick<
  Task,
  "title" | "category" | "priority" | "due" | "hasTime" | "durationMin" | "reminderMin" | "recurrence" | "tags"
> & { notes: string; matched: string[] };

const DAY_IDX: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, weds: 3, thu: 4, thur: 4, thurs: 4, fri: 5, sat: 6,
};
const dayIndex = (s: string) => DAY_IDX[s.toLowerCase().replace(/day$/, "").slice(0, 4)] ?? DAY_IDX[s.toLowerCase().slice(0, 3)];

const CATEGORY_RULES: [Category, RegExp][] = [
  ["content", /\b(video|youtube|script|thumbnail|shorts?|moneyvark|zilvorex|channel|edit(?:ing)? video|upload|podcast|blog)\b/i],
  ["project", /\b(arduino|simulink|matlab|circuit|solar|microgrid|mppt|sensor|iot|prototype|firmware|pcb|wiring|project)\b/i],
  ["college", /\b(assignment|lab|exam|viva|lecture|semester|professor|class|college|submission|record|practical|syllabus|dbms|dsa)\b/i],
  ["career", /\b(resume|cv|internship|interview|job|apply|application|linkedin|portfolio|certification|course|learn(?:ing)?|study(?:ing)?|skill|upsc|scholarship)\b/i],
  ["finance", /\b(pay|bill|rent|budget|sip|invest|mutual fund|stock|tax|emi|loan|insurance|expense|savings?|recharge|fees?)\b/i],
];
export function detectCategory(text: string): Category {
  for (const [c, re] of CATEGORY_RULES) if (re.test(text)) return c;
  return "personal";
}

function stripPhrase(text: string, phrase: string): string {
  const i = text.toLowerCase().indexOf(phrase.toLowerCase());
  if (i < 0) return text;
  return text.slice(0, i) + " " + text.slice(i + phrase.length);
}

function parseRecurrence(text: string): { rule: Recurrence | null; text: string; phrase?: string } {
  let m: RegExpMatchArray | null;
  const dayRe = "(?:mon|tues?|wed(?:nes)?|thu(?:rs?)?|fri|sat(?:ur)?|sun)(?:day)?";
  if ((m = text.match(/\bevery\s+weekday\b|\bweekdays\b/i))) {
    return { rule: { freq: "weekly", interval: 1, byDay: [1, 2, 3, 4, 5] }, text: stripPhrase(text, m[0]), phrase: m[0] };
  }
  if ((m = text.match(new RegExp(`\\bevery\\s+((?:${dayRe})(?:\\s*(?:,|and|&)\\s*(?:${dayRe}))*)`, "i")))) {
    const days = [...m[1].matchAll(new RegExp(dayRe, "gi"))].map((x) => dayIndex(x[0]));
    return { rule: { freq: "weekly", interval: 1, byDay: [...new Set(days)].sort() }, text: stripPhrase(text, m[0]), phrase: m[0] };
  }
  if ((m = text.match(/\bevery\s+(\d+)\s*(day|week|month)s?\b/i))) {
    const freq = ({ day: "daily", week: "weekly", month: "monthly" } as const)[m[2].toLowerCase() as "day"];
    return { rule: { freq, interval: Number(m[1]) }, text: stripPhrase(text, m[0]), phrase: m[0] };
  }
  if ((m = text.match(/\b(every\s*day|daily|each\s+day)\b/i)))
    return { rule: { freq: "daily", interval: 1 }, text: stripPhrase(text, m[0]), phrase: m[0] };
  if ((m = text.match(/\b(every\s+week|weekly)\b/i)))
    return { rule: { freq: "weekly", interval: 1 }, text: stripPhrase(text, m[0]), phrase: m[0] };
  if ((m = text.match(/\b(every\s+month|monthly)\b/i)))
    return { rule: { freq: "monthly", interval: 1 }, text: stripPhrase(text, m[0]), phrase: m[0] };
  return { rule: null, text };
}

function parsePriority(text: string): { p: Priority | null; text: string; phrase?: string } {
  const rules: [Priority, RegExp][] = [
    ["critical", /\b(critical|urgent|asap|emergency|p1)\b/i],
    ["high", /\b(high[- ]priority|priority high|important|p2)\b/i],
    ["medium", /\b(medium[- ]priority|normal priority|p3)\b/i],
    ["low", /\b(low[- ]priority|when(?:ever)? free|someday|p4)\b/i],
  ];
  for (const [p, re] of rules) {
    const m = text.match(re);
    if (m) return { p, text: stripPhrase(text, m[0]), phrase: m[0] };
  }
  return { p: null, text };
}

function parseDuration(text: string): { min: number | null; text: string; phrase?: string } {
  const re =
    /(?:\b(?:for|spend(?:ing)?|takes?|taking|about|around|~)\s*|\()\s*(\d+(?:\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?)\b\)?/i;
  const m = text.match(re);
  if (!m) return { min: null, text };
  const n = Number(m[1]);
  const min = /^h/i.test(m[2]) ? Math.round(n * 60) : Math.round(n);
  return { min, text: stripPhrase(text, m[0]), phrase: m[0] };
}

function parseReminder(text: string): { min: number | null; text: string; phrase?: string } {
  const m = text.match(/\bremind(?:er)?(?:\s+me)?\s+(\d+)\s*(minutes?|mins?|hours?|hrs?|h)\s+before\b/i);
  if (!m) return { min: null, text };
  const n = Number(m[1]);
  return { min: /^h/i.test(m[2]) ? n * 60 : n, text: stripPhrase(text, m[0]), phrase: m[0] };
}

function titleCase(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Turn free text into a structured task draft. Pure: depends only on `text` and `now`. */
export function parseTaskText(input: string, now: Date = new Date(), defaultReminderMin = 15): TaskDraft {
  const matched: string[] = [];
  let text = input.trim();

  const rem = parseReminder(text);
  text = rem.text;
  if (rem.phrase) matched.push(`reminder: ${rem.phrase.trim()}`);

  const dur = parseDuration(text);
  text = dur.text;
  if (dur.phrase) matched.push(`duration: ${dur.min} min`);

  const pri = parsePriority(text);
  text = pri.text;
  if (pri.phrase) matched.push(`priority: ${pri.p}`);

  const rec = parseRecurrence(text);
  text = rec.text;
  if (rec.phrase) matched.push(`repeats: ${rec.phrase.trim()}`);

  let due: Date | null = null;
  let hasTime = false;
  const results = chrono.parse(text, now, { forwardDate: true });
  const hit = results[0];
  if (hit) {
    due = hit.start.date();
    hasTime = hit.start.isCertain("hour");
    if (!hasTime) due = startOfDay(due);
    let before = text.slice(0, hit.index);
    const after = text.slice(hit.index + hit.text.length);
    before = before.replace(/\b(by|on|at|before|due|until|from|this)\s*$/i, "");
    text = `${before} ${after}`;
    matched.push(`when: ${hit.text}`);
  }

  // Weekly rules with explicit weekdays: first occurrence is the next listed weekday.
  if (rec.rule && rec.rule.freq === "weekly" && rec.rule.byDay?.length) {
    const hh = due && hasTime ? due.getHours() : null;
    const mm = due && hasTime ? due.getMinutes() : 0;
    const timeOnly = !hit || (hit && !/\b(mon|tue|wed|thu|fri|sat|sun|tomorrow|today|next|\d{1,2}(st|nd|rd|th))/i.test(hit.text));
    if (timeOnly) {
      for (let i = 0; i < 8; i++) {
        let c = addDays(startOfDay(now), i);
        if (hh !== null) c = setMinutes(setHours(c, hh), mm);
        if (rec.rule.byDay.includes(c.getDay()) && c > now) { due = c; break; }
      }
      if (!hit) hasTime = false;
    }
  } else if (rec.rule && !due) {
    due = hasTime ? due : startOfDay(now);
    due = rec.rule.freq === "daily" ? addDays(startOfDay(now), 0) : due;
  }

  // Cleanup the title.
  let title = text
    .replace(/\s+/g, " ")
    .replace(/^(?:[\s,.;:\-–]*)(?:please\s+)?(?:remind me(?:\s+to)?|i (?:need|have|want) to|need to|don't forget to|todo:?|task:?)\s+/i, "")
    .replace(/^[\s,.;:\-–]+|[\s,.;:\-–]+$/g, "")
    .replace(/\s+,/g, ",")
    .replace(/^to\s+/i, "")
    .trim();
  if (!title) title = input.trim();
  title = titleCase(title);

  const category = detectCategory(input);
  const reminderMin = rem.min ?? (due && hasTime ? defaultReminderMin : null);

  return {
    title,
    notes: "",
    category,
    priority: pri.p ?? "medium",
    due: due ? due.toISOString() : null,
    hasTime,
    durationMin: dur.min,
    reminderMin,
    recurrence: rec.rule,
    tags: [],
    matched,
  };
}
