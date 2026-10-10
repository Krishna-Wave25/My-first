import { useLiveQuery } from "dexie-react-hooks";
import { db, getKV, setKV } from "../db/db";
import { localTimeZone } from "./dates";

export interface Settings {
  name: string;
  timezone: string;
  theme: "dark" | "light";
  workStart: string;
  workEnd: string;
  briefingTime: string;
  morningPlanTime: string;
  eveningReviewTime: string;
  weeklyReviewDay: number;
  weeklyReviewTime: string;
  techSummaryDay: number;
  techSummaryTime: string;
  notify: {
    briefing: boolean;
    morningPlan: boolean;
    deadlines: boolean;
    eveningReview: boolean;
    weeklyReview: boolean;
    techSummary: boolean;
    opportunityDeadlines: boolean;
  };
  defaultReminderMin: number;
  interests: string[];
  ai: { apiKey: string; model: string; enabled: boolean };
  dashboard: { order: string[]; hidden: string[] };
  onboarded: boolean;
}

export const DEFAULT_WIDGETS = [
  "priorities", "schedule", "briefing", "tech", "opportunity", "career",
  "youtube", "project", "habits", "score", "notes", "assistant",
];

/** The theme the pre-paint script in index.html already applied (OS preference on first run). */
const activeTheme = (): "dark" | "light" =>
  typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";

export const defaultSettings = (): Settings => ({
  name: "",
  timezone: localTimeZone(),
  theme: activeTheme(),
  workStart: "09:00",
  workEnd: "21:00",
  briefingTime: "07:00",
  morningPlanTime: "08:00",
  eveningReviewTime: "21:00",
  weeklyReviewDay: 0,
  weeklyReviewTime: "19:00",
  techSummaryDay: 6,
  techSummaryTime: "10:00",
  notify: {
    briefing: true, morningPlan: true, deadlines: true, eveningReview: true,
    weeklyReview: true, techSummary: false, opportunityDeadlines: true,
  },
  defaultReminderMin: 15,
  interests: ["AI", "solar", "IoT", "quantum", "SIP", "internship", "UPSC"],
  ai: { apiKey: "", model: "claude-sonnet-5-5", enabled: true },
  dashboard: { order: DEFAULT_WIDGETS, hidden: [] },
  onboarded: false,
});

export async function loadSettings(): Promise<Settings> {
  const saved = await getKV<Partial<Settings>>("settings", {});
  const d = defaultSettings();
  const s: Settings = {
    ...d, ...saved,
    notify: { ...d.notify, ...(saved.notify ?? {}) },
    ai: { ...d.ai, ...(saved.ai ?? {}) },
    dashboard: { ...d.dashboard, ...(saved.dashboard ?? {}) },
  };
  // make sure widgets added in newer versions show up
  for (const w of DEFAULT_WIDGETS) if (!s.dashboard.order.includes(w)) s.dashboard.order.push(w);
  return s;
}

export async function saveSettings(patch: Partial<Settings>) {
  const cur = await loadSettings();
  const next = { ...cur, ...patch };
  await setKV("settings", next);
  try { localStorage.setItem("lifeos-theme", next.theme); } catch { /* storage unavailable */ }
  document.documentElement.setAttribute("data-theme", next.theme);
  return next;
}

/** Live settings; returns defaults until the DB responds. */
export function useSettings(): Settings {
  const s = useLiveQuery(() => loadSettings(), [], undefined);
  return s ?? defaultSettings();
}
export function useSettingsReady(): Settings | undefined {
  return useLiveQuery(() => loadSettings(), [], undefined);
}
export { db };
