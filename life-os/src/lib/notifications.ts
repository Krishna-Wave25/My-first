import { Capacitor } from "@capacitor/core";
import { LocalNotifications, type LocalNotificationSchema } from "@capacitor/local-notifications";
import { db } from "../db/db";
import type { Task } from "../db/types";
import { instantInZone, nextDailyInstants, nextWeeklyInstants, partsInZone } from "./dates";
import { hashId } from "./rss";
import type { Settings } from "./settings";

export type Kind = "briefing" | "morningPlan" | "eveningReview" | "weeklyReview" | "techSummary" | "task" | "opportunity" | "test";
export interface Planned { key: string; kind: Kind; at: Date; title: string; body: string; route: string }
export interface ScheduleSummary { platform: "android-native" | "web"; permission: string; scheduled: number; byKind: Partial<Record<Kind, number>>; exactAlarms?: string; error?: string }

const nid = (key: string) => (parseInt(hashId(key), 36) % 2147483000) + 1;

/** Pure: compute every notification that should exist, from settings + data. */
export function planNotifications(s: Settings, tasks: Task[], opps: { id: string; name: string; deadline: string | null; status: string }[], now: Date = new Date()): Planned[] {
  const out: Planned[] = [];
  const tz = s.timezone;
  const n = s.notify;
  if (n.briefing) nextDailyInstants(s.briefingTime, tz, 7, now).forEach((at) => out.push({ key: `briefing:${at.toISOString()}`, kind: "briefing", at, title: "Your daily briefing is ready", body: "Five top stories for today — tap to read.", route: "/news" }));
  if (n.morningPlan) nextDailyInstants(s.morningPlanTime, tz, 7, now).forEach((at) => out.push({ key: `plan:${at.toISOString()}`, kind: "morningPlan", at, title: "Plan your day", body: "Open My Day for today's schedule and top priorities.", route: "/day" }));
  if (n.eveningReview) nextDailyInstants(s.eveningReviewTime, tz, 7, now).forEach((at) => out.push({ key: `eve:${at.toISOString()}`, kind: "eveningReview", at, title: "Evening review", body: "How did today go? Review your day and plan tomorrow.", route: "/day?tab=review" }));
  if (n.weeklyReview) nextWeeklyInstants(s.weeklyReviewDay, s.weeklyReviewTime, tz, 4, now).forEach((at) => out.push({ key: `week:${at.toISOString()}`, kind: "weeklyReview", at, title: "Weekly goal review", body: "Look back at the week and set goals for the next one.", route: "/reports" }));
  if (n.techSummary) nextWeeklyInstants(s.techSummaryDay, s.techSummaryTime, tz, 4, now).forEach((at) => out.push({ key: `tech:${at.toISOString()}`, kind: "techSummary", at, title: "Weekly technology summary", body: "This week in AI & technology.", route: "/tech" }));

  if (n.deadlines) {
    for (const t of tasks) {
      if (t.status !== "todo" || !t.due) continue;
      const due = new Date(t.due);
      let at: Date;
      if (t.hasTime) {
        if (t.reminderMin == null) continue;
        at = new Date(due.getTime() - t.reminderMin * 60000);
      } else {
        const p = partsInZone(due, tz);
        at = instantInZone(due.getFullYear(), due.getMonth() + 1, due.getDate(), 9, 0, tz);
        void p;
      }
      if (at <= now || at.getTime() - now.getTime() > 60 * 86400000) continue;
      out.push({ key: `task:${t.id}:${at.toISOString()}`, kind: "task", at, title: t.priority === "critical" ? `Critical: ${t.title}` : t.title, body: t.hasTime ? `Due ${due.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Due today", route: "/day" });
    }
  }
  if (n.opportunityDeadlines) {
    for (const o of opps) {
      if (!o.deadline || !["saved", "researching", "in_progress"].includes(o.status)) continue;
      const [y, m, d] = o.deadline.split("-").map(Number);
      for (const offset of [1, 0]) {
        const at = instantInZone(y, m, d - offset, 9, 0, tz);
        if (at > now) out.push({ key: `opp:${o.id}:${offset}`, kind: "opportunity", at, title: offset ? "Deadline tomorrow" : "Deadline today", body: o.name, route: "/earn?tab=tracker" });
      }
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

const isNative = () => Capacitor.isNativePlatform();

export async function permissionState(): Promise<string> {
  if (isNative()) return (await LocalNotifications.checkPermissions()).display;
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}
export async function requestPermission(): Promise<string> {
  if (isNative()) return (await LocalNotifications.requestPermissions()).display;
  return typeof Notification === "undefined" ? "unsupported" : await Notification.requestPermission();
}

let webTimers: number[] = [];

/** Replace every pending notification with the current plan. Returns what was *actually* scheduled. */
export async function syncNotifications(s: Settings, now: Date = new Date()): Promise<ScheduleSummary> {
  const tasks = await db.tasks.toArray();
  const opps = await db.opportunities.toArray();
  const planned = planNotifications(s, tasks, opps, now).slice(0, 180);
  const byKind: ScheduleSummary["byKind"] = {};
  planned.forEach((p) => (byKind[p.kind] = (byKind[p.kind] ?? 0) + 1));
  const permission = await permissionState();

  if (!isNative()) {
    webTimers.forEach((t) => clearTimeout(t));
    webTimers = [];
    let n = 0;
    if (permission === "granted") {
      for (const p of planned) {
        const ms = p.at.getTime() - now.getTime();
        if (ms > 2147000000 || ms > 86400000) continue; // only while the app is open, next 24h
        webTimers.push(window.setTimeout(() => new Notification(p.title, { body: p.body, tag: p.key }), ms));
        n++;
      }
    }
    return { platform: "web", permission, scheduled: n, byKind };
  }
  if (permission !== "granted") return { platform: "android-native", permission, scheduled: 0, byKind, error: "Notification permission not granted" };
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((x) => ({ id: x.id })) });
    const list: LocalNotificationSchema[] = planned.map((p) => ({
      id: nid(p.key), title: p.title, body: p.body, extra: { route: p.route },
      schedule: { at: p.at, allowWhileIdle: true }, channelId: "lifeos",
    }));
    if (list.length) await LocalNotifications.schedule({ notifications: list });
    const check = await LocalNotifications.getPending();
    let exact = "unknown";
    try { exact = (await LocalNotifications.checkExactNotificationSetting()).exact_alarm; } catch { /* older Android */ }
    return { platform: "android-native", permission, scheduled: check.notifications.length, byKind, exactAlarms: exact };
  } catch (e) {
    return { platform: "android-native", permission, scheduled: 0, byKind, error: (e as Error).message };
  }
}

export async function ensureChannel() {
  if (!isNative()) return;
  try {
    await LocalNotifications.createChannel({ id: "lifeos", name: "LIFE OS reminders", description: "Briefings, task reminders and reviews", importance: 4, visibility: 1 });
  } catch { /* channel APIs need Android 8+ */ }
}

/** Fire a real notification ~5 s from now so the user can confirm delivery works. */
export async function sendTestNotification(): Promise<string> {
  const perm = (await permissionState()) === "granted" ? "granted" : await requestPermission();
  if (perm !== "granted") return `Permission is “${perm}”. Allow notifications in system settings first.`;
  const at = new Date(Date.now() + 5000);
  if (isNative()) {
    await ensureChannel();
    await LocalNotifications.schedule({ notifications: [{ id: nid("test" + Date.now()), title: "LIFE OS test", body: "Notifications are working on this device.", schedule: { at, allowWhileIdle: true }, channelId: "lifeos", extra: { route: "/settings" } }] });
    return "Scheduled — it should appear in about 5 seconds. Lock the screen to test background delivery.";
  }
  window.setTimeout(() => new Notification("LIFE OS test", { body: "Browser notifications work while the app is open." }), 5000);
  return "Scheduled — appears in 5 seconds (browser notifications only fire while the app is open).";
}

export function onNotificationTap(navigate: (route: string) => void) {
  if (!isNative()) return () => {};
  const h = LocalNotifications.addListener("localNotificationActionPerformed", (e) => {
    const route = (e.notification.extra as { route?: string } | undefined)?.route;
    if (route) navigate(route);
  });
  return () => { h.then((x) => x.remove()); };
}
