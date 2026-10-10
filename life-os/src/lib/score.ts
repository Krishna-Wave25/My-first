import type { Habit, HabitLog, Task } from "../db/types";
import { priorityWeight } from "../db/types";
import { bucketOf } from "./tasks";
import { dayKey } from "./dates";

export interface Score {
  total: number; // 0..100
  tasks: number; // 0..100
  habits: number; // 0..100
  overdueMalus: number; // points removed
  explain: string;
}

/**
 * Productivity score for one day (transparent, no hidden weights):
 *   60% weighted completion of tasks due today (critical=4 … low=1)
 *   30% share of active habits done today
 *   up to −15 for open overdue tasks (3 points each)
 * If there are no tasks / no habits, that component's weight moves to the other.
 */
export function productivityScore(tasks: Task[], habits: Habit[], logs: HabitLog[], now: Date = new Date()): Score {
  const today = dayKey(now);
  const dueToday = tasks.filter((t) => t.due && dayKey(new Date(t.due)) === today);
  const doneToday = tasks.filter((t) => t.completedAt && dayKey(new Date(t.completedAt)) === today && !dueToday.includes(t));
  const pool = [...dueToday, ...doneToday];
  const totalW = pool.reduce((a, t) => a + priorityWeight(t.priority), 0);
  const doneW = pool.filter((t) => t.status === "done").reduce((a, t) => a + priorityWeight(t.priority), 0);
  const taskPct = totalW ? (doneW / totalW) * 100 : null;

  const active = habits.filter((h) => !h.archived);
  const doneH = active.filter((h) => logs.some((l) => l.habitId === h.id && l.date === today)).length;
  const habitPct = active.length ? (doneH / active.length) * 100 : null;

  const overdue = tasks.filter((t) => bucketOf(t, now) === "overdue").length;
  const malus = Math.min(15, overdue * 3);

  let wt = 0.6, wh = 0.3;
  if (taskPct === null && habitPct === null) return { total: 0, tasks: 0, habits: 0, overdueMalus: malus, explain: "Add tasks or habits to start scoring." };
  if (taskPct === null) { wh = 0.9; wt = 0; }
  if (habitPct === null) { wt = 0.9; wh = 0; }
  const base = (taskPct ?? 0) * wt + (habitPct ?? 0) * wh;
  const total = Math.max(0, Math.min(100, Math.round(base / 0.9 - malus)));
  return {
    total, tasks: Math.round(taskPct ?? 0), habits: Math.round(habitPct ?? 0), overdueMalus: malus,
    explain: `Tasks ${Math.round(taskPct ?? 0)}% · Habits ${Math.round(habitPct ?? 0)}%${malus ? ` · −${malus} for ${overdue} overdue` : ""}`,
  };
}

export function habitStreak(habitId: string, logs: HabitLog[], now: Date = new Date()): number {
  const set = new Set(logs.filter((l) => l.habitId === habitId).map((l) => l.date));
  let streak = 0;
  const d = new Date(now);
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not done yet doesn't break the streak
  while (set.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}
