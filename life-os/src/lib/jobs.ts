import { db, getKV, setKV } from "../db/db";
import { refreshFeeds, type FetchReport } from "./news";

const KEY = "lastNewsRefresh";
export const NEWS_STALE_MS = 3 * 3600 * 1000;

/** Refresh feeds if the last successful refresh is older than `maxAgeMs`. Never throws. */
export async function maybeRefreshNews(maxAgeMs = NEWS_STALE_MS): Promise<FetchReport[] | null> {
  try {
    const last = await getKV<string | null>(KEY, null);
    if (last && Date.now() - new Date(last).getTime() < maxAgeMs) return null;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return null;
    const reports = await refreshFeeds();
    if (reports.some((r) => r.ok)) await setKV(KEY, new Date().toISOString());
    return reports;
  } catch {
    return null;
  }
}
export const lastNewsRefresh = () => getKV<string | null>(KEY, null);
export async function forceRefresh(section?: "news" | "tech"): Promise<FetchReport[]> {
  const reports = await refreshFeeds(section);
  if (reports.some((r) => r.ok)) await setKV(KEY, new Date().toISOString());
  return reports;
}
export { db };
