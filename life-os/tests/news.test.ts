import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../src/db/db";
import { httpImpl } from "../src/lib/http";
import { parseFeed } from "../src/lib/rss";
import { buildBriefing, dedupe, isClickbait, pickTop, refreshFeeds, scoreArticle, titleSimilarity, upscHint } from "../src/lib/news";
import type { Article, Feed } from "../src/db/types";
import { atom, html, rdf, rss } from "./fixtures/feeds";

const NOW = new Date("2025-10-08T06:00:00Z");
const ago = (h: number) => new Date(NOW.getTime() - h * 3600000).toUTCString();
const art = (o: Partial<Article> & { title: string }): Article => ({
  id: o.id ?? o.title, feedId: "f", source: "S", tier: "primary", section: "news", topic: "world",
  url: "https://example.org/" + encodeURIComponent(o.title), publishedAt: new Date(NOW.getTime() - 3600000).toISOString(),
  summary: "A reasonably long summary that explains the story in some detail for ranking.", fetchedAt: NOW.toISOString(), saved: false, tags: [], note: "", ...o,
});

describe("feed parsing", () => {
  it("parses RSS 2.0, stripping HTML and decoding entities", () => {
    const items = parseFeed(rss([{ title: "Hello &amp; world", link: "https://x.org/a", date: ago(2), desc: "Body <b>bold</b> &amp; more" }]));
    expect(items).toHaveLength(1);
    expect(items[0].summary).toBe("Body bold & more");
    expect(items[0].url).toBe("https://x.org/a");
    expect(items[0].publishedAt).toBe(new Date(NOW.getTime() - 2 * 3600000).toISOString());
  });
  it("parses Atom and RDF", () => {
    expect(parseFeed(atom("2025-10-08T01:00:00Z"))[0]).toMatchObject({ url: "https://example.org/atom-1", summary: "Utility-scale batteries & grids." });
    expect(parseFeed(rdf)[0]).toMatchObject({ title: "RDF item", publishedAt: "2025-10-08T05:00:00.000Z" });
  });
  it("rejects non-feed documents and unsafe links", () => {
    expect(() => parseFeed(html)).toThrow();
    const bad = rss([{ title: "js", link: "javascript:alert(1)", date: ago(1) }, { title: "ok", link: "https://ok.org/1", date: ago(1) }]);
    expect(parseFeed(bad).map((i) => i.url)).toEqual(["https://ok.org/1"]);
  });
  it("keeps items with unparseable dates but marks the date unknown", () => {
    const x = parseFeed(rss([{ title: "t", link: "https://ok.org/1", date: "garbage" }]));
    expect(x[0].publishedAt).toBeNull();
  });
});

describe("ranking and filtering", () => {
  it("detects clickbait", () => {
    expect(isClickbait("You won't believe what this chip can do")).toBe(true);
    expect(isClickbait("10 ways to boost your productivity")).toBe(true);
    expect(isClickbait("RBI keeps repo rate unchanged at 5.5%")).toBe(false);
  });
  it("de-duplicates the same event and keeps the most reliable source", () => {
    const a = art({ title: "RBI keeps repo rate unchanged at 5.5 percent", tier: "secondary" });
    const b = art({ title: "RBI keeps repo rate unchanged at 5.5 percent in policy review", tier: "official", id: "b", url: "https://rbi.org.in/x" });
    const c = art({ title: "ISRO launches new navigation satellite" });
    const out = dedupe([a, b, c]);
    expect(out).toHaveLength(2);
    expect(out.find((x) => x.id === "b")).toBeTruthy();
    expect(titleSimilarity("a b c d", "e f g h")).toBe(0);
  });
  it("never ranks undated or stale stories", () => {
    expect(scoreArticle(art({ title: "x", publishedAt: null }), [], NOW)).toBe(-Infinity);
    const old = art({ title: "old news story", publishedAt: new Date(NOW.getTime() - 10 * 86400000).toISOString() });
    expect(pickTop([old], [], 5, NOW)).toHaveLength(0);
  });
  it("returns exactly five, spread across topics, newest/most reliable first", () => {
    const topics = ["india", "india", "india", "world", "business", "ai", "science", "sports"] as const;
    const list = topics.map((t, i) => art({ title: `Distinct headline number ${i} about ${t} ${["alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel"][i]}`, topic: t, publishedAt: new Date(NOW.getTime() - (i + 1) * 3600000).toISOString() }));
    const top = pickTop(list, [], 5, NOW);
    expect(top).toHaveLength(5);
    expect(top.filter((a) => a.topic === "india").length).toBeLessThanOrEqual(2);
  });
  it("boosts the user's interests", () => {
    const plain = art({ title: "Municipal budget passes after debate", topic: "world" });
    const hit = art({ title: "New AI chip announced by lab", topic: "world", id: "h" });
    expect(scoreArticle(hit, ["AI"], NOW)).toBeGreaterThan(scoreArticle(plain, ["AI"], NOW));
  });
  it("labels UPSC relevance by theme", () => {
    expect(upscHint({ title: "Supreme Court on new bill", summary: "", topic: "india" })).toBe("Polity & Governance");
    expect(upscHint({ title: "Celebrity wedding", summary: "", topic: "entertainment" })).toBeNull();
  });
});

describe("refresh + briefing (fixture network)", () => {
  const mkFeed = (id: string, url: string, topic: Feed["topic"]): Feed => ({ id, name: id, url, topic, tier: "primary", section: "news", enabled: true, custom: false });
  beforeEach(async () => { await db.delete(); await db.open(); });

  it("stores articles, records per-feed health and never invents when feeds fail", async () => {
    await db.feeds.bulkPut([mkFeed("ok", "https://f/ok", "india"), mkFeed("bad", "https://f/bad", "world"), mkFeed("web", "https://f/web", "tech")]);
    const orig = httpImpl.request;
    httpImpl.request = async (_m, url) => {
      if (url.endsWith("ok")) return { status: 200, text: rss([{ title: "Cabinet approves new solar mission", link: "https://f/1", date: new Date().toUTCString(), desc: "details here for the story that is long enough" }]) };
      if (url.endsWith("web")) return { status: 200, text: html };
      throw new Error("Failed to fetch");
    };
    try {
      const reports = await refreshFeeds("news");
      expect(reports.find((r) => r.feedId === "ok")).toMatchObject({ ok: true, count: 1 });
      expect(reports.find((r) => r.feedId === "bad")?.ok).toBe(false);
      expect(reports.find((r) => r.feedId === "web")?.error).toMatch(/XML|feed/i);
      expect((await db.feeds.get("bad"))?.lastStatus).toBe("error");
      expect(await db.articles.count()).toBe(1);
      const { articles } = await buildBriefing([], new Date());
      expect(articles).toHaveLength(1); // only one fresh story exists — we do not pad to five
    } finally { httpImpl.request = orig; }
  });

  it("preserves saved state and AI analysis on re-fetch", async () => {
    await db.feeds.put(mkFeed("ok", "https://f/ok", "india"));
    const xml = rss([{ title: "Story one for persistence", link: "https://f/1", date: new Date().toUTCString(), desc: "x".repeat(60) }]);
    const orig = httpImpl.request;
    httpImpl.request = async () => ({ status: 200, text: xml });
    try {
      await refreshFeeds();
      const a = (await db.articles.toArray())[0];
      await db.articles.update(a.id, { saved: true, tags: ["keep"], analysis: { whyItMatters: "w", implications: "i", relevance: "r", upsc: null, speculation: null, generatedAt: "t", model: "m" } });
      await refreshFeeds();
      const b = await db.articles.get(a.id);
      expect(b?.saved).toBe(true);
      expect(b?.tags).toEqual(["keep"]);
      expect(b?.analysis?.whyItMatters).toBe("w");
    } finally { httpImpl.request = orig; }
  });
});
