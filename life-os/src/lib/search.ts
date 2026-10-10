import { db } from "../db/db";

export interface SearchHit {
  kind: "task" | "note" | "article" | "opportunity" | "project" | "projectItem" | "idea" | "bookmark" | "briefing" | "learning";
  id: string;
  title: string;
  snippet: string;
  route: string;
  score: number;
  tags?: string[];
}

const norm = (s: string) => s.toLowerCase();
function scoreText(q: string[], title: string, body: string, tags: string[] = []): number {
  const t = norm(title), b = norm(body), g = norm(tags.join(" "));
  let s = 0;
  for (const w of q) {
    if (t.includes(w)) s += 5;
    if (g.includes(w)) s += 4;
    if (b.includes(w)) s += 1;
  }
  // all words must appear somewhere
  const all = q.every((w) => t.includes(w) || b.includes(w) || g.includes(w));
  return all ? s : 0;
}
const snip = (text: string, q: string[]) => {
  const low = norm(text);
  const i = Math.max(0, Math.min(...q.map((w) => (low.indexOf(w) < 0 ? 1e9 : low.indexOf(w)))));
  const start = i > 1e8 ? 0 : Math.max(0, i - 40);
  return (start ? "…" : "") + text.slice(start, start + 140).replace(/\s+/g, " ");
};

export async function universalSearch(query: string, limit = 40): Promise<SearchHit[]> {
  const q = norm(query).split(/\s+/).filter((w) => w.length > 0);
  if (!q.length) return [];
  const hits: SearchHit[] = [];
  const push = (h: Omit<SearchHit, "score">, s: number) => s > 0 && hits.push({ ...h, score: s });

  for (const t of await db.tasks.toArray())
    push({ kind: "task", id: t.id, title: t.title, snippet: snip(`${t.notes} ${t.subtasks.map((x) => x.title).join(" ")}` || t.category, q), route: "/day", tags: t.tags },
      scoreText(q, t.title, `${t.notes} ${t.category} ${t.subtasks.map((x) => x.title).join(" ")}`, t.tags));
  for (const n of await db.notes.toArray())
    push({ kind: "note", id: n.id, title: n.title || "Untitled note", snippet: snip(n.body, q), route: "/day?tab=notes", tags: n.tags }, scoreText(q, n.title, n.body, n.tags));
  for (const a of await db.articles.toArray())
    push({ kind: "article", id: a.id, title: a.title, snippet: `${a.source} — ${snip(a.summary, q)}`, route: a.section === "tech" ? "/tech" : "/news", tags: a.tags },
      scoreText(q, a.title, `${a.summary} ${a.note} ${a.source}`, a.tags) * (a.saved ? 1.5 : 1));
  for (const o of await db.opportunities.toArray())
    push({ kind: "opportunity", id: o.id, title: o.name, snippet: `${o.kind} · ${o.status.replace("_", " ")} — ${snip(o.notes, q)}`, route: "/earn?tab=tracker" }, scoreText(q, o.name, o.notes + " " + o.kind));
  for (const p of await db.projects.toArray())
    push({ kind: "project", id: p.id, title: p.name, snippet: snip(p.description, q), route: "/projects" }, scoreText(q, p.name, p.description));
  for (const it of await db.projectItems.toArray()) {
    const body = Object.values(it.data).filter((v) => typeof v === "string" || typeof v === "number").join(" ");
    const title = String(it.data.title ?? it.data.name ?? it.data.question ?? it.data.from ?? it.type);
    push({ kind: "projectItem", id: it.id, title: `${it.type}: ${title}`, snippet: snip(body, q), route: "/projects" }, scoreText(q, title, body));
  }
  for (const v of await db.videoIdeas.toArray())
    push({ kind: "idea", id: v.id, title: v.title, snippet: `${v.channel} · ${v.stage} — ${snip(v.hook || v.script, q)}`, route: "/youtube", tags: v.tags }, scoreText(q, v.title, `${v.hook} ${v.script} ${v.description} ${v.channel}`, v.tags));
  for (const b of await db.bookmarks.toArray())
    push({ kind: "bookmark", id: b.id, title: b.title, snippet: snip(`${b.note} ${b.url}`, q), route: "/day?tab=saved", tags: b.tags }, scoreText(q, b.title, `${b.note} ${b.url}`, b.tags));
  for (const l of await db.reviews.toArray())
    push({ kind: "briefing", id: l.id, title: `Day review ${l.id}`, snippet: snip(l.reflection, q), route: "/reports" }, scoreText(q, "review", l.reflection));
  for (const l of await db.learningLogs.toArray())
    push({ kind: "learning", id: l.id, title: `Learning: ${l.topic}`, snippet: `${l.minutes} min on ${l.date}`, route: "/career?tab=learning" }, scoreText(q, l.topic, l.date));

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
