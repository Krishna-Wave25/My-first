import { expect, type Page } from "@playwright/test";

export const ROUTES: [string, string, RegExp][] = [
  ["Home", "/#/", /Good (morning|afternoon|evening|night)/],
  ["My Day", "/#/day", /My Day/],
  ["News", "/#/news", /News & Briefing/],
  ["AI & Technology", "/#/tech", /AI & Technology Radar/],
  ["Earn Money", "/#/earn", /Earn Money/],
  ["Finance", "/#/finance", /Personal Finance/],
  ["Career & Learning", "/#/career", /Career & Learning/],
  ["Projects", "/#/projects", /Projects/],
  ["YouTube Studio", "/#/youtube", /YouTube Studio/],
  ["Reports", "/#/reports", /Reports/],
  ["Settings", "/#/settings", /Settings/],
];

/** Collect console errors / page errors so tests can assert a clean run. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/Failed to load resource|net::ERR|favicon|manifest/i.test(t)) return; // network noise from blocked sandbox hosts
    errors.push(`console: ${t}`);
  });
  return errors;
}

export async function fresh(page: Page) {
  // No test depends on the real internet (the sandbox blocks it anyway): external requests fail fast.
  // Tests that need feeds register their own, later route which takes precedence.
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort("failed"));
  await page.goto("/");
  await page.evaluate(async () => {
    localStorage.clear();
    const dbs = await indexedDB.databases();
    await Promise.all(dbs.map((d) => new Promise((r) => { const q = indexedDB.deleteDatabase(d.name!); q.onsuccess = q.onerror = q.onblocked = () => r(null); })));
  });
  await page.goto("/#/");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

export const rssItems = (items: { title: string; link: string; hoursAgo: number; desc: string }[]) => `<?xml version="1.0"?><rss version="2.0"><channel><title>t</title>${items.map((i) => `<item><title>${i.title}</title><link>${i.link}</link><pubDate>${new Date(Date.now() - i.hoursAgo * 3600000).toUTCString()}</pubDate><description>${i.desc}</description></item>`).join("")}</channel></rss>`;
