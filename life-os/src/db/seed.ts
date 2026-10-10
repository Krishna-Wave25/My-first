import { db } from "./db";
import { DEFAULT_FEEDS } from "../content/feeds";

/** First-run setup: install the default feed list (no sample/fake user data is ever created). */
export async function ensureDefaults() {
  const have = new Set((await db.feeds.toArray()).map((f) => f.id));
  const missing = DEFAULT_FEEDS.filter((f) => !have.has(f.id));
  if (missing.length) await db.feeds.bulkAdd(missing);
}
