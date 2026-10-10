import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../src/db/db";
import { httpImpl } from "../src/lib/http";
import { defaultSettings } from "../src/lib/settings";
import { applyLocalActions, localAssistant, resumeAiTurn, runAiTurn } from "../src/lib/assistant";
import { addTask } from "../src/lib/tasks";
import { planNotifications } from "../src/lib/notifications";
import { analyzeResume } from "../src/lib/ats";
import { lintConnection, lintSystem, worstLevel } from "../src/lib/safety";
import { lumpsumProjection, rule503020, sipNeededForGoal, sipProjection, monthSummary } from "../src/lib/finance";
import { exportAll, importAll } from "../src/lib/backup";
import { hasPin, setPin, verifyPin, removePin, lockoutMs } from "../src/lib/security";

const S = { ...defaultSettings(), timezone: "Asia/Kolkata", ai: { apiKey: "sk-ant-test-key-123456", model: "claude-sonnet-5-5", enabled: true } };

beforeEach(async () => { await db.delete(); await db.open(); });

describe("assistant: confirmation gate", () => {
  it("runs read tools immediately but holds write tools until approved", async () => {
    await addTask({ title: "Existing", due: new Date(Date.now() - 86400000).toISOString() });
    const calls: any[] = [];
    const orig = httpImpl.request;
    let n = 0;
    httpImpl.request = async (_m, url, headers, body) => {
      expect(url).toBe("https://api.anthropic.com/v1/messages");
      expect(headers!["x-api-key"]).toBe(S.ai.apiKey);
      const req = JSON.parse(body!);
      calls.push(req);
      n++;
      if (n === 1) return { status: 200, text: JSON.stringify({ stop_reason: "tool_use", content: [
        { type: "text", text: "Let me look." },
        { type: "tool_use", id: "tu_read", name: "list_tasks", input: { filter: "overdue" } },
        { type: "tool_use", id: "tu_write", name: "create_task", input: { title: "Revise DBMS", due_iso: "2025-10-09T07:00:00", priority: "high", category: "college" } },
      ] }) };
      return { status: 200, text: JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: "Done." }] }) };
    };
    try {
      const out = await runAiTurn(S, [{ role: "user", content: "show overdue and add revise DBMS" }]);
      expect(out.pending?.kind).toBe("ai");
      expect(out.pending!.actions).toHaveLength(1);
      expect(out.pending!.actions[0].summary).toContain("Revise DBMS");
      // nothing written yet
      expect((await db.tasks.toArray()).map((t) => t.title)).toEqual(["Existing"]);
      expect(out.pending!.kind === "ai" && out.pending!.results["tu_read"].content).toContain("Existing");

      const res = await resumeAiTurn(S, out.pending as any, { tu_write: true }, out.text);
      expect(res.text).toContain("Done.");
      expect((await db.tasks.toArray()).map((t) => t.title).sort()).toEqual(["Existing", "Revise DBMS"]);
      // second request carries both tool_results
      const last = calls[1].messages.at(-1);
      expect(last.content.map((b: any) => b.tool_use_id).sort()).toEqual(["tu_read", "tu_write"]);
    } finally { httpImpl.request = orig; }
  });

  it("does nothing when the user rejects", async () => {
    const orig = httpImpl.request;
    let n = 0;
    httpImpl.request = async () => (++n === 1
      ? { status: 200, text: JSON.stringify({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "w", name: "create_note", input: { title: "x", body: "y" } }] }) }
      : { status: 200, text: JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: "Okay, skipped." }] }) });
    try {
      const out = await runAiTurn(S, [{ role: "user", content: "save a note" }]);
      await resumeAiTurn(S, out.pending as any, { w: false }, "");
      expect(await db.notes.count()).toBe(0);
    } finally { httpImpl.request = orig; }
  });

  it("surfaces API errors clearly", async () => {
    const orig = httpImpl.request;
    httpImpl.request = async () => ({ status: 401, text: JSON.stringify({ error: { message: "invalid x-api-key" } }) });
    try { await expect(runAiTurn(S, [{ role: "user", content: "hi" }])).rejects.toThrow(/rejected/); } finally { httpImpl.request = orig; }
  });
});

describe("assistant: offline mode", () => {
  it("lists overdue tasks and proposes (not saves) new tasks", async () => {
    await addTask({ title: "Late thing", due: new Date(Date.now() - 2 * 86400000).toISOString() });
    expect((await localAssistant(S, "show my overdue tasks")).text).toContain("Late thing");
    const out = await localAssistant(S, "add tomorrow at 7 AM spend 45 minutes learning AI automation");
    expect(out.pending?.kind).toBe("local");
    expect(await db.tasks.count()).toBe(1);
    await applyLocalActions(S, out.pending as any, { [out.pending!.actions[0].id]: true });
    const t = (await db.tasks.toArray()).find((x) => x.title.includes("earning"))!;
    expect(t.durationMin).toBe(45);
    expect(t.source).toBe("assistant");
  });
  it("is honest about what it can't do", async () => {
    expect((await localAssistant(S, "write me a poem")).text).toMatch(/API key/);
  });
});

describe("notification plan", () => {
  const NOW = new Date("2025-10-08T20:00:00Z"); // 01:30 IST on 9 Oct
  it("schedules 07:00 IST briefings in the configured zone", () => {
    const p = planNotifications(S, [], [], NOW).filter((x) => x.kind === "briefing");
    expect(p).toHaveLength(7);
    expect(p[0].at.toISOString()).toBe("2025-10-09T01:30:00.000Z");
  });
  it("adds task reminders before due time and skips past/disabled ones", async () => {
    const t = await addTask({ title: "Call", due: "2025-10-09T05:00:00.000Z", hasTime: true, reminderMin: 30 });
    const past = await addTask({ title: "Old", due: "2025-10-01T05:00:00.000Z", hasTime: true, reminderMin: 30 });
    const p = planNotifications(S, [t, past], [], NOW).filter((x) => x.kind === "task");
    expect(p.map((x) => x.title)).toEqual(["Call"]);
    expect(p[0].at.toISOString()).toBe("2025-10-09T04:30:00.000Z");
    expect(planNotifications({ ...S, notify: { ...S.notify, deadlines: false, briefing: false } }, [t], [], NOW).some((x) => x.kind === "task" || x.kind === "briefing")).toBe(false);
  });
  it("reminds about opportunity deadlines the day before and the day of", () => {
    const p = planNotifications(S, [], [{ id: "o", name: "Internship X", deadline: "2025-10-20", status: "saved" }, { id: "p", name: "Done", deadline: "2025-10-20", status: "rejected" }], NOW).filter((x) => x.kind === "opportunity");
    expect(p.map((x) => x.title)).toEqual(["Deadline tomorrow", "Deadline today"]);
  });
});

describe("ATS matcher", () => {
  it("scores keyword coverage and structure", () => {
    const jd = "We need a Python developer with machine learning, React and REST API experience. Embedded systems a plus.";
    const resume = "Asha Rao asha@x.com +91 98765 43210\nEducation: B.Tech ECE\nSkills: Python, React, REST API, machine learning\nProjects: Built a solar monitor cutting power loss by 18% for 200 users";
    const r = analyzeResume(resume, jd);
    expect(r.matched).toEqual(expect.arrayContaining(["python", "react"]));
    expect(r.missing.join(" ")).toMatch(/embedded/);
    expect(r.score).toBeGreaterThan(40);
    expect(analyzeResume("hello", jd).score).toBeLessThan(r.score);
  });
});

describe("wiring safety linter", () => {
  it("flags voltage on logic pins, unfused batteries and unverified wiring", () => {
    const f = lintConnection({ from: "Solar panel +", to: "Arduino A0", signal: "analog in", voltage: 21, status: "proposed" });
    expect(f.some((x) => x.level === "danger" && /logic pin/.test(x.message))).toBe(true);
    expect(f.some((x) => x.level === "info")).toBe(true);
    expect(worstLevel(f)).toBe("danger");
    const b = lintConnection({ from: "Battery +", to: "MPPT BAT", signal: "12V", voltage: 12.8, currentA: 20, fused: false, status: "confirmed", verifiedBy: "multimeter" });
    expect(b.some((x) => /fuse/.test(x.message))).toBe(true);
    expect(lintConnection({ from: "Sensor", to: "Arduino A1", signal: "analog", voltage: 3.3, status: "confirmed", verifiedBy: "datasheet" })).toEqual([]);
    expect(lintConnection({ from: "A", to: "B", signal: "12V", voltage: 12, currentA: 12, wireAwg: 22, fused: true, status: "confirmed", verifiedBy: "x" }).some((x) => /AWG/.test(x.message))).toBe(true);
  });
  it("warns when no common ground is recorded", () => {
    expect(lintSystem([{ from: "A", to: "B", signal: "5V", status: "confirmed" }]).length).toBe(1);
    expect(lintSystem([{ from: "A", to: "B", signal: "GND", status: "confirmed" }])).toEqual([]);
  });
});

describe("finance maths", () => {
  it("matches closed-form results", () => {
    expect(lumpsumProjection(100000, 10, 12).value).toBe(Math.round(100000 * Math.pow(1.12, 10)));
    const sip = sipProjection(5000, 10, 12);
    expect(sip.invested).toBe(600000);
    expect(sip.value).toBeGreaterThan(1100000); // ≈ ₹11.6 L at 12% (hypothetical)
    expect(sip.value).toBeLessThan(1200000);
    const need = sipNeededForGoal(sip.value, 10, 12);
    expect(Math.round(need)).toBeGreaterThanOrEqual(4999);
    expect(Math.round(need)).toBeLessThanOrEqual(5001);
    expect(rule503020(40000)).toEqual({ needs: 20000, wants: 12000, savings: 8000 });
  });
  it("summarises a month into needs/wants/savings", () => {
    const s = monthSummary([{ type: "income", amount: 10000, category: "Stipend" }, { type: "expense", amount: 4000, category: "Rent/Hostel" }, { type: "expense", amount: 1000, category: "Shopping" }]);
    expect(s).toMatchObject({ income: 10000, spent: 5000, net: 5000 });
    expect(s.by).toEqual({ needs: 4000, wants: 1000, savings: 0 });
  });
});

describe("backup + PIN", () => {
  it("round-trips data and strips the API key from exports", async () => {
    await addTask({ title: "Persist me" });
    await db.kv.put({ key: "settings", value: { ...S } });
    const json = await exportAll();
    expect(json).not.toContain(S.ai.apiKey);
    await db.tasks.clear();
    expect(await importAll(json)).toBeGreaterThan(0);
    expect((await db.tasks.toArray())[0].title).toBe("Persist me");
    await expect(importAll('{"app":"other"}')).rejects.toThrow();
  });
  it("hashes the PIN, verifies it and locks out after repeated failures", async () => {
    await setPin("4821");
    expect(hasPin()).toBe(true);
    expect(localStorage.getItem("lifeos-pin")).not.toContain("4821");
    expect(await verifyPin("0000")).toBe("wrong");
    expect(await verifyPin("4821")).toBe("ok");
    for (let i = 0; i < 5; i++) await verifyPin("1111");
    expect(lockoutMs()).toBeGreaterThan(0);
    expect(await verifyPin("4821")).toBe("locked");
    removePin();
    expect(hasPin()).toBe(false);
  });
});

