import { subDays } from "date-fns";
import { db } from "../db/db";
import { dayKey, format, inr } from "./dates";
import { monthSummary } from "./finance";
import { bucketOf } from "./tasks";

export interface WeekStats {
  from: string; to: string;
  completed: number; created: number; overdue: number; postponed: number;
  completedByCategory: Record<string, number>;
  daily: { date: string; done: number }[];
  habitRate: number | null; // % of (habit × day) slots done
  learningMinutes: number;
  income: number; spent: number;
  videos: { published: number; inPipeline: number };
  notes: number;
  oppEarned: number;
}

export async function weekStats(end: Date = new Date(), days = 7): Promise<WeekStats> {
  const keys: string[] = [];
  for (let i = 0; i < days; i++) keys.push(dayKey(subDays(end, days - 1 - i)));
  const inRange = (iso: string | null) => !!iso && keys.includes(dayKey(new Date(iso)));
  const tasks = await db.tasks.toArray();
  const done = tasks.filter((t) => inRange(t.completedAt));
  const byCat: Record<string, number> = {};
  done.forEach((t) => (byCat[t.category] = (byCat[t.category] ?? 0) + 1));
  const habits = (await db.habits.toArray()).filter((h) => !h.archived);
  const logs = (await db.habitLogs.toArray()).filter((l) => keys.includes(l.date));
  const learning = (await db.learningLogs.toArray()).filter((l) => keys.includes(l.date));
  const txs = (await db.transactions.toArray()).filter((t) => keys.includes(t.date));
  const ideas = await db.videoIdeas.toArray();
  const notes = (await db.notes.toArray()).filter((n) => inRange(n.createdAt));
  const opps = await db.opportunities.toArray();
  const m = monthSummary(txs);
  return {
    from: keys[0], to: keys[keys.length - 1],
    completed: done.length,
    created: tasks.filter((t) => inRange(t.createdAt)).length,
    overdue: tasks.filter((t) => bucketOf(t, end) === "overdue").length,
    postponed: tasks.reduce((a, t) => a + (t.postponedCount > 0 && t.status === "todo" ? 1 : 0), 0),
    completedByCategory: byCat,
    daily: keys.map((k) => ({ date: k, done: done.filter((t) => dayKey(new Date(t.completedAt!)) === k).length })),
    habitRate: habits.length ? Math.round((logs.length / (habits.length * days)) * 100) : null,
    learningMinutes: learning.reduce((a, l) => a + l.minutes, 0),
    income: m.income, spent: m.spent,
    videos: {
      published: ideas.filter((i) => i.stage === "published" && i.publishDate && keys.includes(i.publishDate)).length,
      inPipeline: ideas.filter((i) => i.stage !== "published" && i.stage !== "idea").length,
    },
    notes: notes.length,
    oppEarned: opps.filter((o) => o.status === "earned").reduce((a, o) => a + (o.amount ?? 0), 0),
  };
}

export function weekMarkdown(w: WeekStats): string {
  const cats = Object.entries(w.completedByCategory).map(([k, v]) => `${k} ${v}`).join(", ") || "none";
  return [
    `# Weekly review — ${format(new Date(w.from), "d MMM")} to ${format(new Date(w.to), "d MMM yyyy")}`,
    "",
    `- Tasks completed: **${w.completed}** (${cats}); created: ${w.created}`,
    `- Open overdue now: **${w.overdue}**; open tasks that were postponed: ${w.postponed}`,
    `- Habit completion: ${w.habitRate === null ? "no habits tracked" : w.habitRate + "%"}`,
    `- Learning time logged: ${w.learningMinutes} min`,
    `- Money (logged): income ${inr(w.income)}, spent ${inr(w.spent)}`,
    `- Videos: ${w.videos.published} published, ${w.videos.inPipeline} in production`,
    `- Notes added: ${w.notes}`,
    `- Recorded earnings from tracked opportunities: ${inr(w.oppEarned)} (revenue, entered by you)`,
  ].join("\n");
}
