import { describe, expect, it } from "vitest";
import { parseTaskText } from "../src/lib/nlp";
import { nextOccurrence } from "../src/lib/recurrence";
import { suggestPlan, findConflicts } from "../src/lib/scheduler";
import { newTask } from "../src/lib/tasks";
import { instantInZone, nextDailyInstants, partsInZone } from "../src/lib/dates";
import { productivityScore } from "../src/lib/score";

// Fixed "now": Wed 8 Oct 2025, 10:00 local
const NOW = new Date(2025, 9, 8, 10, 0, 0);

describe("natural-language task parsing", () => {
  it("parses the headline example", () => {
    const d = parseTaskText("Tomorrow at 7 AM, spend 45 minutes learning AI automation.", NOW);
    expect(d.durationMin).toBe(45);
    expect(d.hasTime).toBe(true);
    const due = new Date(d.due!);
    expect([due.getFullYear(), due.getMonth(), due.getDate(), due.getHours(), due.getMinutes()]).toEqual([2025, 9, 9, 7, 0]);
    expect(d.title).toBe("Learning AI automation");
    expect(d.category).toBe("career");
    expect(d.reminderMin).toBe(15);
  });

  it("extracts priority, deadline day and category", () => {
    const d = parseTaskText("Submit DBMS assignment by Friday 5pm high priority", NOW);
    expect(d.priority).toBe("high");
    expect(d.category).toBe("college");
    const due = new Date(d.due!);
    expect([due.getDate(), due.getHours()]).toEqual([10, 17]);
    expect(d.title).toBe("Submit DBMS assignment");
  });

  it("treats a date without a time as all-day", () => {
    const d = parseTaskText("Pay electricity bill on 15 October", NOW);
    expect(d.hasTime).toBe(false);
    expect(d.reminderMin).toBeNull();
    expect(d.category).toBe("finance");
    expect(new Date(d.due!).getDate()).toBe(15);
  });

  it("understands recurrence", () => {
    const w = parseTaskText("Gym every Monday and Thursday 6pm", NOW);
    expect(w.recurrence).toEqual({ freq: "weekly", interval: 1, byDay: [1, 4] });
    const due = new Date(w.due!);
    expect(due.getDay()).toBe(4); // next listed weekday after Wed 10:00 is Thu
    expect(due.getHours()).toBe(18);
    expect(parseTaskText("Review notes daily at 9pm", NOW).recurrence?.freq).toBe("daily");
    expect(parseTaskText("Check budget every 2 weeks", NOW).recurrence).toMatchObject({ freq: "weekly", interval: 2 });
    expect(parseTaskText("Standup every weekday 9am", NOW).recurrence?.byDay).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps plain text as a title with sensible defaults", () => {
    const d = parseTaskText("buy notebook", NOW);
    expect(d).toMatchObject({ title: "Buy notebook", due: null, priority: "medium", category: "personal" });
  });

  it("parses explicit reminders and urgency", () => {
    const d = parseTaskText("urgent: viva prep tomorrow 9am remind me 30 minutes before", NOW);
    expect(d.priority).toBe("critical");
    expect(d.reminderMin).toBe(30);
    expect(d.category).toBe("college");
  });
});

describe("recurrence", () => {
  it("advances daily, weekly and monthly rules", () => {
    const wed = new Date(2025, 9, 8, 7, 0);
    expect(nextOccurrence(wed, { freq: "daily", interval: 2 })!.getDate()).toBe(10);
    expect(nextOccurrence(wed, { freq: "weekly", interval: 1, byDay: [1, 4] })!.getDay()).toBe(4);
    const thu = new Date(2025, 9, 9, 7, 0);
    expect(nextOccurrence(thu, { freq: "weekly", interval: 1, byDay: [1, 4] })!.getDay()).toBe(1);
    expect(nextOccurrence(new Date(2025, 0, 31), { freq: "monthly", interval: 1 })!.getMonth()).toBe(1);
  });
  it("stops after `until`", () => {
    expect(nextOccurrence(new Date(2025, 9, 8), { freq: "daily", interval: 1, until: "2025-10-08" })).toBeNull();
  });
});

describe("daily planner", () => {
  const mk = (title: string, o: Partial<Parameters<typeof newTask>[0]> = {}) => newTask({ title, ...o });
  it("places by importance and respects fixed events", () => {
    const tasks = [
      mk("Lecture", { due: new Date(2025, 9, 8, 11, 0).toISOString(), hasTime: true, durationMin: 60, category: "college" }),
      mk("Low thing", { priority: "low", due: new Date(2025, 9, 8).toISOString() }),
      mk("Critical thing", { priority: "critical", due: new Date(2025, 9, 8).toISOString(), durationMin: 30 }),
    ];
    const p = suggestPlan(tasks, NOW, "09:00", "21:00", NOW);
    expect(p.blocks.map((b) => b.title)).toEqual(["Critical thing", "Low thing", "Lecture"]) // low task fits the gap before the 11:00 lecture;
    expect(p.blocks[0].start.getHours()).toBe(10);
    expect(p.conflicts).toHaveLength(0);
  });
  it("reports conflicts and overload", () => {
    const a = mk("A", { due: new Date(2025, 9, 8, 12, 0).toISOString(), hasTime: true, durationMin: 60 });
    const b = mk("B", { due: new Date(2025, 9, 8, 12, 30).toISOString(), hasTime: true, durationMin: 60 });
    expect(suggestPlan([a, b], NOW, "09:00", "21:00", NOW).conflicts).toHaveLength(1);
    expect(findConflicts([a, b])).toHaveLength(1);
    const many = Array.from({ length: 8 }, (_, i) => mk("T" + i, { priority: "high", durationMin: 90, due: new Date(2025, 9, 8).toISOString() }));
    const p = suggestPlan(many, NOW, "09:00", "21:00", NOW);
    expect(p.unscheduled.length).toBeGreaterThan(0);
    expect(p.notes.join(" ")).toMatch(/n't fit/);
  });
  it("flags deadline risk", () => {
    // no explicit duration => this is a deadline (not a fixed event); default 45 min for high priority
    const t = mk("Submit", { priority: "high", due: new Date(2025, 9, 8, 10, 15).toISOString(), hasTime: true });
    const p = suggestPlan([t], NOW, "09:00", "21:00", NOW);
    expect(p.atRisk).toHaveLength(1);
  });
  it("puts higher priority first even when a lower-priority task has a deadline time", () => {
    const high = mk("High with 6pm deadline", { priority: "high", due: new Date(2025, 9, 8, 18, 0).toISOString(), hasTime: true });
    const crit = mk("Critical no time", { priority: "critical", due: new Date(2025, 9, 8).toISOString() });
    const p = suggestPlan([high, crit], NOW, "09:00", "21:00", NOW);
    expect(p.blocks.map((b) => b.title)).toEqual(["Critical no time", "High with 6pm deadline"]);
    expect(p.atRisk).toHaveLength(0);
  });
  it("includes overdue work on today's plan", () => {
    const t = mk("Late", { priority: "medium", due: new Date(2025, 9, 6).toISOString() });
    expect(suggestPlan([t], NOW, "09:00", "21:00", NOW).blocks).toHaveLength(1);
  });
});

describe("time zones", () => {
  it("computes 07:00 in a named zone", () => {
    const i = instantInZone(2025, 10, 9, 7, 0, "Asia/Kolkata");
    expect(i.toISOString()).toBe("2025-10-09T01:30:00.000Z");
    const p = partsInZone(i, "Asia/Kolkata");
    expect([p.hour, p.minute, p.day]).toEqual([7, 0, 9]);
    expect(instantInZone(2025, 1, 15, 7, 0, "America/New_York").toISOString()).toBe("2025-01-15T12:00:00.000Z");
  });
  it("lists upcoming daily instants in the future only", () => {
    const from = new Date("2025-10-09T02:00:00Z"); // 07:30 IST — today's 07:00 already passed
    const [a, b] = nextDailyInstants("07:00", "Asia/Kolkata", 2, from);
    expect(a.toISOString()).toBe("2025-10-10T01:30:00.000Z");
    expect(b.toISOString()).toBe("2025-10-11T01:30:00.000Z");
  });
});

describe("productivity score", () => {
  it("weights by priority and penalises overdue", () => {
    const today = new Date(2025, 9, 8).toISOString();
    const done = newTask({ title: "x", priority: "high", due: today, status: "done", completedAt: NOW.toISOString() });
    const open = newTask({ title: "y", priority: "high", due: today });
    expect(productivityScore([done, open], [], [], NOW).total).toBe(50);
    const late = newTask({ title: "z", due: new Date(2025, 9, 1).toISOString() });
    expect(productivityScore([done, open, late], [], [], NOW).total).toBeLessThan(50);
  });
});
