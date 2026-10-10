import { db } from "../db/db";
import type { Article, Briefing, Feed, Topic } from "../db/types";
import { describeNetworkError, httpGet } from "./http";
import { hashId, parseFeed } from "./rss";
import { dayKey } from "./dates";

const CLICKBAIT = /(you won'?t believe|shocking|this one (trick|weird)|what happened next|goes viral|will blow your mind|\bgone wrong\b|!!+|\bmust[- ]see\b|\bjaw[- ]dropping\b)/i;
const LISTICLE = /^\d+\s+(things|ways|reasons|tips|tricks|signs)\b/i;
/** Whole-word, case-insensitive match (so "AI" does not match "explains"). */
export function matchesWord(text: string, word: string): boolean {
  const esc = word.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${esc}([^\\p{L}\\p{N}]|$)`, "iu").test(text);
}
export const isClickbait = (t: string) => CLICKBAIT.test(t) || LISTICLE.test(t);

const tokens = (t: string) =>
  new Set(t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !["the", "and", "for", "with", "that", "this", "from", "has", "are", "was", "will", "its", "over", "after", "says", "new"].includes(w)));
export function titleSimilarity(a: string, b: string): number {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((x) => B.has(x) && inter++);
  return inter / (A.size + B.size - inter);
}

/** Remove near-duplicate stories (same event reported by several outlets), keeping the most reliable. */
export function dedupe(items: Article[]): Article[] {
  const tierRank = { official: 0, primary: 1, secondary: 2 } as const;
  const sorted = [...items].sort((a, b) => tierRank[a.tier] - tierRank[b.tier]);
  const kept: Article[] = [];
  for (const it of sorted) {
    if (!kept.some((k) => k.url === it.url || titleSimilarity(k.title, it.title) >= 0.55)) kept.push(it);
  }
  return kept;
}

export interface FetchReport { feedId: string; name: string; ok: boolean; count: number; error?: string }

async function fetchOne(feed: Feed): Promise<{ items: Article[]; report: FetchReport }> {
  try {
    const r = await httpGet(feed.url, { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" });
    if (r.status < 200 || r.status >= 300) throw new Error(`HTTP ${r.status}`);
    const raw = parseFeed(r.text);
    const now = new Date().toISOString();
    const items: Article[] = raw.slice(0, 40).map((x) => ({
      id: hashId(x.url), feedId: feed.id, source: feed.name, tier: feed.tier, section: feed.section, topic: feed.topic,
      title: x.title, url: x.url, publishedAt: x.publishedAt, summary: x.summary, fetchedAt: now, saved: false, tags: [], note: "",
    }));
    return { items, report: { feedId: feed.id, name: feed.name, ok: true, count: items.length } };
  } catch (e) {
    return { items: [], report: { feedId: feed.id, name: feed.name, ok: false, count: 0, error: describeNetworkError(e) } };
  }
}

/** Fetch all enabled feeds (bounded concurrency), upsert articles, record per-feed health. */
export async function refreshFeeds(section?: Feed["section"], concurrency = 5): Promise<FetchReport[]> {
  const feeds = (await db.feeds.toArray()).filter((f) => f.enabled && (!section || f.section === section));
  const reports: FetchReport[] = [];
  let idx = 0;
  const worker = async () => {
    while (idx < feeds.length) {
      const feed = feeds[idx++];
      const { items, report } = await fetchOne(feed);
      reports.push(report);
      await db.transaction("rw", db.articles, db.feeds, async () => {
        for (const it of items) {
          const old = await db.articles.get(it.id);
          // never overwrite user state (saved/tags/notes) or an existing AI analysis
          await db.articles.put(old ? { ...it, saved: old.saved, tags: old.tags, note: old.note, analysis: old.analysis, topic: old.topic } : it);
        }
        await db.feeds.update(feed.id, {
          lastStatus: report.ok ? "ok" : "error", lastError: report.error, lastFetched: new Date().toISOString(), lastCount: report.count,
        });
      });
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, feeds.length) }, worker));
  return reports;
}

const TIER_W = { official: 30, primary: 20, secondary: 10 } as const;
const TOPIC_W: Partial<Record<Topic, number>> = { india: 8, upsc: 7, ai: 8, tech: 6, business: 6, world: 5, science: 4, energy: 6, environment: 4, cyber: 4, space: 3, sports: 1, entertainment: 0 };

export function scoreArticle(a: Article, interests: string[], now: Date = new Date()): number {
  if (!a.publishedAt) return -Infinity; // undated items can't be verified as current
  const ageH = Math.max(0, (now.getTime() - new Date(a.publishedAt).getTime()) / 3600000);
  let s = TIER_W[a.tier] + 40 * Math.exp(-ageH / 36) + (TOPIC_W[a.topic] ?? 0);
  const hay = `${a.title} ${a.summary}`;
  let hits = 0;
  for (const k of interests) if (k && matchesWord(hay, k)) hits++;
  s += Math.min(24, hits * 8);
  if (isClickbait(a.title)) s -= 40;
  if (a.summary.length < 40) s -= 6; // thin item
  return s;
}

/** Pick the top stories: fresh, deduped, non-clickbait, max `perTopic` per topic. */
export function pickTop(articles: Article[], interests: string[], n = 5, now: Date = new Date(), perTopic = 2): Article[] {
  const windowMs = 72 * 3600000;
  const fresh = articles.filter(
    (a) => a.section === "news" && a.publishedAt && now.getTime() - new Date(a.publishedAt).getTime() <= windowMs && new Date(a.publishedAt) <= new Date(now.getTime() + 3600000) && !isClickbait(a.title),
  );
  const ranked = dedupe(fresh)
    .map((a) => ({ a, s: scoreArticle(a, interests, now) }))
    .sort((x, y) => y.s - x.s);
  const out: Article[] = [];
  const count: Partial<Record<Topic, number>> = {};
  for (const { a } of ranked) {
    if ((count[a.topic] ?? 0) >= perTopic) continue;
    out.push(a);
    count[a.topic] = (count[a.topic] ?? 0) + 1;
    if (out.length === n) return out;
  }
  for (const { a } of ranked) {
    if (out.length === n) break;
    if (!out.includes(a)) out.push(a);
  }
  return out;
}

export async function buildBriefing(interests: string[], date = new Date(), force = false): Promise<{ briefing: Briefing; articles: Article[] }> {
  const id = dayKey(date);
  const existing = await db.briefings.get(id);
  if (existing && !force) {
    const arts = (await db.articles.bulkGet(existing.articleIds)).filter(Boolean) as Article[];
    if (arts.length) return { briefing: existing, articles: arts };
  }
  const all = await db.articles.where("section").equals("news").toArray();
  const top = pickTop(all, interests, 5, date);
  const briefing: Briefing = { id, generatedAt: new Date().toISOString(), articleIds: top.map((a) => a.id) };
  if (top.length) await db.briefings.put(briefing);
  return { briefing, articles: top };
}

/** Heuristic UPSC relevance flag (clearly labelled as a heuristic in the UI). */
export function upscHint(a: Pick<Article, "title" | "summary" | "topic">): string | null {
  const t = `${a.title} ${a.summary}`.toLowerCase();
  const rules: [RegExp, string][] = [
    [/\b(supreme court|high court|constitution|article \d+|bill|act\b|amendment|parliament|lok sabha|rajya sabha)\b/, "Polity & Governance"],
    [/\b(rbi|repo rate|inflation|gdp|budget|fiscal|gst|trade deficit|msme|subsidy|economic survey)\b/, "Indian Economy"],
    [/\b(scheme|yojana|mission|policy|ministry|niti aayog|cabinet)\b/, "Governance / Government Schemes"],
    [/\b(treaty|summit|un\b|united nations|bilateral|g20|brics|quad|sco|asean|sanction|geopolit)\w*/, "International Relations"],
    [/\b(isro|dst|biotech|ai policy|quantum mission|semiconductor mission|space|vaccine)\b/, "Science & Technology"],
    [/\b(climate|cop\d+|biodiversity|emission|wildlife|tiger reserve|pollution|renewable|net[- ]zero)\b/, "Environment & Ecology"],
    [/\b(security|border|terror|cyber|defence|army|navy)\b/, "Internal / External Security"],
  ];
  const hit = rules.find(([re]) => re.test(t));
  return hit ? hit[1] : null;
}
