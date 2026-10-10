import { startOfDay } from "date-fns";
import { db, uid } from "../db/db";
import type { Task } from "../db/types";
import { nextOccurrence } from "./recurrence";
import { dayKey } from "./dates";

export function newTask(partial: Partial<Task> & { title: string }): Task {
  const now = new Date().toISOString();
  return {
    id: uid(), notes: "", category: "personal", priority: "medium", status: "todo",
    due: null, hasTime: false, durationMin: null, reminderMin: null, recurrence: null,
    seriesId: null, subtasks: [], tags: [], projectId: null, postponedCount: 0,
    createdAt: now, completedAt: null, source: "manual", ...partial,
  };
}

export async function addTask(partial: Partial<Task> & { title: string }): Promise<Task> {
  const t = newTask(partial);
  if (t.recurrence && !t.seriesId) t.seriesId = t.id;
  await db.tasks.add(t);
  return t;
}

export type TaskBucket = "overdue" | "today" | "upcoming" | "nodate" | "done";

export function bucketOf(t: Task, now: Date = new Date()): TaskBucket {
  if (t.status === "done") return "done";
  if (!t.due) return "nodate";
  const d = new Date(t.due);
  if (t.hasTime ? d < now : startOfDay(d) < startOfDay(now)) return "overdue";
  return dayKey(d) === dayKey(now) ? "today" : "upcoming";
}

/** Complete a task; if it recurs, create the next occurrence. Returns the new task, if any. */
export async function completeTask(id: string): Promise<Task | null> {
  const t = await db.tasks.get(id);
  if (!t || t.status === "done") return null;
  await db.tasks.update(id, { status: "done", completedAt: new Date().toISOString() });
  if (!t.recurrence || !t.due) return null;
  const next = nextOccurrence(new Date(t.due), t.recurrence);
  if (!next) return null;
  // Skip occurrences already in the past (e.g. completed late) so the series never starts overdue.
  let n: Date | null = next;
  const floor = t.hasTime ? new Date() : startOfDay(new Date());
  while (n && n < floor) n = nextOccurrence(n, t.recurrence);
  if (!n) return null;
  const copy = newTask({
    ...t, id: uid(), status: "todo", completedAt: null, due: n.toISOString(), postponedCount: 0,
    subtasks: t.subtasks.map((s) => ({ ...s, id: uid(), done: false })), seriesId: t.seriesId ?? t.id,
    createdAt: new Date().toISOString(),
  });
  await db.tasks.add(copy);
  return copy;
}

export async function reopenTask(id: string) {
  await db.tasks.update(id, { status: "todo", completedAt: null });
}

export async function postponeTask(id: string, days = 1) {
  const t = await db.tasks.get(id);
  if (!t) return;
  const base = t.due ? new Date(t.due) : new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  // if it was overdue by more than the postpone window, land on the future
  const floor = t.hasTime ? new Date() : startOfDay(new Date());
  while (next < floor) next.setDate(next.getDate() + 1);
  await db.tasks.update(id, { due: next.toISOString(), postponedCount: t.postponedCount + 1 });
}

export const deleteTask = (id: string) => db.tasks.delete(id);

export async function toggleSubtask(taskId: string, subId: string) {
  const t = await db.tasks.get(taskId);
  if (!t) return;
  await db.tasks.update(taskId, { subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)) });
}

export function compareTasks(a: Task, b: Task): number {
  const pw = (x: Task) => ({ critical: 4, high: 3, medium: 2, low: 1 })[x.priority];
  const ad = a.due ? new Date(a.due).getTime() : Infinity;
  const bd = b.due ? new Date(b.due).getTime() : Infinity;
  if (ad !== bd) return ad - bd;
  return pw(b) - pw(a);
}
