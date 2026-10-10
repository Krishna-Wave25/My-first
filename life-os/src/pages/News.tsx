import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { db } from "../db/db";
import type { Article, Feed, Topic } from "../db/types";
import { TOPIC_LABEL } from "../content/feeds";
import { aiReady, analyzeArticle } from "../lib/ai";
import { nextDailyInstants } from "../lib/dates";
import { forceRefresh, lastNewsRefresh } from "../lib/jobs";
import { buildBriefing, isClickbait, scoreArticle, upscHint, type FetchReport } from "../lib/news";
import { relativeTime } from "../lib/dates";
import { useSettings } from "../lib/settings";
import { addTask } from "../lib/tasks";
import { Btn, Card, Chip, Empty, ExtLink, Field, Modal, Notice, Spinner, Tabs, useAsync, useTab, useToast } from "../components/ui";
import { universalSearch } from "../lib/search";

const TABS = ["briefing", "explore", "archive", "sources"];
const TIER_LABEL = { official: "Official source", primary: "Original reporting", secondary: "Secondary source" } as const;

export function StoryCard({ a, rank }: { a: Article; rank?: number }) {
  const s = useSettings();
  const toast = useToast();
  const job = useAsync();
  const tech = a.section === "tech";
  const hint = upscHint(a);
  const an = a.analysis;
  return (
    <Card className="story">
      <div className="row nw" style={{ alignItems: "flex-start" }}>
        {rank && <span className="chip tint" style={{ ["--tint" as any]: "var(--accent)" }}>#{rank}</span>}
        <h3 className="grow"><a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text)", textDecoration: "none" }}>{a.title}<span className="sr-only"> (opens source)</span></a></h3>
      </div>
      <div className="src">
        <Chip kind={a.tier === "official" ? "ok" : a.tier === "primary" ? "info" : ""}>{TIER_LABEL[a.tier]}</Chip>
        <span>{a.source}</span><span>·</span>
        <time dateTime={a.publishedAt ?? undefined}>{a.publishedAt ? `${format(new Date(a.publishedAt), "d MMM yyyy, h:mm a")} (${relativeTime(a.publishedAt)})` : "Publication date not provided by source"}</time>
        <Chip>{TOPIC_LABEL[a.topic]}</Chip>
        {hint && <Chip kind="warn" title="Keyword heuristic — verify against the syllabus">UPSC? {hint}</Chip>}
      </div>
      <div className="fact"><span className="label">Reported by {a.source} (source text)</span>{a.summary || "The source did not provide a summary. Open the link for the full report."}</div>
      {an ? (
        <>
          <div className="analysis">
            <span className="label">AI analysis · based only on the excerpt above · {an.model}</span>
            <dl className="dl">
              {an.whatIsNew && <><dt>What's new</dt><dd>{an.whatIsNew}</dd></>}
              <dt>Why it matters</dt><dd>{an.whyItMatters}</dd>
              {an.applications && <><dt>Applications</dt><dd>{an.applications}</dd></>}
              <dt>Practical implications</dt><dd>{an.implications}</dd>
              {an.skills && <><dt>Skills to learn</dt><dd>{an.skills}</dd></>}
              {an.earning && <><dt>Earning angle</dt><dd>{an.earning}</dd></>}
              <dt>Relevance to you</dt><dd>{an.relevance}</dd>
              {an.upsc && <><dt>UPSC relevance</dt><dd>{an.upsc}</dd></>}
            </dl>
          </div>
          {an.speculation && <div className="spec"><span className="label">Speculation — not confirmed</span>{an.speculation}</div>}
        </>
      ) : (
        <div className="row">
          <Btn sm disabled={!aiReady(s) || job.busy} onClick={() => job.run(async () => { const r = await analyzeArticle(s, a); await db.articles.update(a.id, { analysis: r }); })}>{job.busy ? "Analysing…" : tech ? "✨ Explain this development" : "✨ Why it matters"}</Btn>
          {!aiReady(s) && <span className="tiny muted">Add an AI key in Settings to generate analysis. Without it only the source text is shown — nothing is invented.</span>}
        </div>
      )}
      {job.error && <Notice kind="danger">{job.error}</Notice>}
      <div className="row">
        <Btn sm kind="ghost" aria-pressed={a.saved} onClick={() => db.articles.update(a.id, { saved: !a.saved })}>{a.saved ? "★ Saved" : "☆ Save"}</Btn>
        <Btn sm kind="ghost" onClick={async () => { await addTask({ title: `Read: ${a.title}`, notes: a.url, category: "career", source: "saved" }); toast("Added to your tasks", "ok"); }}>→ Task</Btn>
        <ExtLink href={a.url}>Read source ↗</ExtLink>
      </div>
    </Card>
  );
}

export default function News() {
  const [tab, setTab] = useTab("briefing", TABS);
  return (
    <div>
      <div className="page-head"><h1>News & Briefing</h1><p>Five top stories a day from official and original-reporting sources. Every item shows its source, date and link. Confirmed reporting, AI analysis and speculation are always shown separately.</p></div>
      <Tabs label="News sections" value={tab} onChange={setTab} tabs={[{ id: "briefing", label: "Today's briefing" }, { id: "explore", label: "Explore" }, { id: "archive", label: "Archive" }, { id: "sources", label: "Sources" }]} />
      {tab === "briefing" && <Briefing />}
      {tab === "explore" && <Explore />}
      {tab === "archive" && <Archive />}
      {tab === "sources" && <Sources />}
    </div>
  );
}

function RefreshBar({ section, onDone }: { section?: "news" | "tech"; onDone?: (r: FetchReport[]) => void }) {
  const job = useAsync();
  const toast = useToast();
  const last = useLiveQuery(() => lastNewsRefresh(), [], null);
  return (
    <div className="row">
      <Btn sm onClick={() => job.run(async () => { const r = await forceRefresh(section); const ok = r.filter((x) => x.ok).length; toast(`Fetched ${ok}/${r.length} sources`, ok ? "ok" : "err"); onDone?.(r); })} disabled={job.busy}>{job.busy ? <Spinner label="Fetching…" /> : "↻ Refresh sources"}</Btn>
      <span className="tiny muted">{last ? `Last refresh ${relativeTime(last)}` : "Not refreshed yet"}</span>
      {job.error && <Notice kind="danger">{job.error}</Notice>}
    </div>
  );
}

function Briefing() {
  const s = useSettings();
  const [reports, setReports] = useState<FetchReport[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ articles: Article[]; at: string } | null>(null);
  const [version, setVersion] = useState(0);
  const articleCount = useLiveQuery(() => db.articles.count(), [], 0);
  const feedCount = useLiveQuery(() => db.feeds.filter((f) => f.enabled).count(), [], 0);
  const [more, setMore] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    buildBriefing(s.interests, new Date(), version > 0).then((r) => { if (live) { setData({ articles: r.articles, at: r.briefing.generatedAt }); setLoading(false); } });
    return () => { live = false; };
  }, [version, articleCount, s.interests.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = nextDailyInstants(s.briefingTime, s.timezone, 1)[0];
  const liveArts = useLiveQuery(async () => data ? ((await db.articles.bulkGet(data.articles.map((a) => a.id))).filter(Boolean) as Article[]) : [], [data], [] as Article[]);
  const failed = reports?.filter((r) => !r.ok) ?? [];
  return (
    <div className="col">
      <div className="row"><RefreshBar section="news" onDone={(r) => { setReports(r); setVersion((v) => v + 1); }} />
        <div className="sp" /><Chip>⏰ Next briefing {format(next, "EEE h:mm a")} ({s.timezone})</Chip></div>
      {failed.length > 0 && <Notice kind="warn">{failed.length} of {reports!.length} sources failed ({failed.slice(0, 3).map((f) => `${f.name}: ${f.error}`).join("; ")}{failed.length > 3 ? "…" : ""}). See Sources for details.</Notice>}
      {loading ? <Spinner label="Building your briefing…" /> : liveArts.length === 0 ? (
        <Empty icon="📭" title="No fresh verified stories available" action={<Btn kind="primary" onClick={() => setVersion((v) => v + 1)}>Try again</Btn>}>
          {feedCount === 0 ? "All sources are disabled. Enable some in Sources." : articleCount === 0 ? "Nothing has been fetched yet. Tap “Refresh sources”. If every source fails, the device may be offline." : "Nothing in your sources was published in the last 72 hours. I won't fill the briefing with old or invented items."}
        </Empty>
      ) : (
        <>
          {liveArts.length < 5 && <Notice kind="info">Only {liveArts.length} fresh, de-duplicated stor{liveArts.length === 1 ? "y was" : "ies were"} found in the last 72 hours. The briefing is never padded.</Notice>}
          {liveArts.map((a, i) => <StoryCard key={a.id} a={a} rank={i + 1} />)}
          <p className="tiny muted">Briefing built {data && relativeTime(data.at)} from your enabled sources. Ranking = source reliability + recency + your interests; near-duplicates and clickbait are removed.</p>
          <Btn onClick={() => setMore(true)}>Explore more stories →</Btn>
        </>
      )}
      {more && <MoreModal onClose={() => setMore(false)} exclude={liveArts.map((a) => a.id)} />}
    </div>
  );
}
function MoreModal({ onClose, exclude }: { onClose: () => void; exclude: string[] }) {
  const s = useSettings();
  const list = useLiveQuery(async () => (await db.articles.where("section").equals("news").toArray()).filter((a) => a.publishedAt && !exclude.includes(a.id) && !isClickbait(a.title)).sort((a, b) => scoreArticle(b, s.interests) - scoreArticle(a, s.interests)).slice(0, 15), [], [] as Article[]);
  return <Modal title="More stories" onClose={onClose} wide><div className="col">{list.length ? list.map((a) => <StoryCard key={a.id} a={a} />) : <p className="muted">No more recent stories.</p>}</div></Modal>;
}

function Explore() {
  const s = useSettings();
  const [topic, setTopic] = useState<Topic | "">("");
  const [range, setRange] = useState("3");
  const [source, setSource] = useState("");
  const [imp, setImp] = useState("all");
  const [q, setQ] = useState("");
  const arts = useLiveQuery(() => db.articles.where("section").equals("news").toArray(), [], [] as Article[]);
  const sources = [...new Set(arts.map((a) => a.source))].sort();
  const topics = [...new Set(arts.map((a) => a.topic))];
  const shown = useMemo(() => {
    const cutoff = range === "all" ? 0 : Date.now() - Number(range) * 86400000;
    return arts
      .filter((a) => (!topic || a.topic === topic) && (!source || a.source === source) && (range === "all" || (a.publishedAt && new Date(a.publishedAt).getTime() >= cutoff)) && (imp === "all" || a.tier !== "secondary") && (!q || `${a.title} ${a.summary}`.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => imp === "top" ? scoreArticle(b, s.interests) - scoreArticle(a, s.interests) : (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
      .slice(0, 60);
  }, [arts, topic, range, source, imp, q, s.interests]);
  return (
    <div className="col">
      <RefreshBar section="news" />
      <Card>
        <div className="grid g4">
          <Field label="Search"><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Keyword" /></Field>
          <Field label="Topic"><select value={topic} onChange={(e) => setTopic(e.target.value as Topic)}><option value="">All topics</option>{topics.map((t) => <option key={t} value={t}>{TOPIC_LABEL[t]}</option>)}</select></Field>
          <Field label="Date"><select value={range} onChange={(e) => setRange(e.target.value)}><option value="1">Last 24 hours</option><option value="3">Last 3 days</option><option value="7">Last 7 days</option><option value="all">Any time</option></select></Field>
          <Field label="Source"><select value={source} onChange={(e) => setSource(e.target.value)}><option value="">All sources</option>{sources.map((x) => <option key={x}>{x}</option>)}</select></Field>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <span className="small">Importance:</span>
          {[["all", "All, newest first"], ["top", "Ranked by importance"], ["reliable", "Official & original reporting only"]].map(([v, l]) => <button key={v} className={`chip ${imp === v ? "on" : ""}`} onClick={() => setImp(v)}>{l}</button>)}
          <span className="tiny muted">{shown.length} shown</span>
        </div>
      </Card>
      {shown.length === 0 ? <Empty icon="🔍" title="No stories match">Try a wider date range or refresh your sources.</Empty> : shown.map((a) => <StoryCard key={a.id} a={a} />)}
    </div>
  );
}

function Archive() {
  const briefings = useLiveQuery(() => db.briefings.orderBy("id").reverse().toArray(), [], []);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [hits, setHits] = useState<Awaited<ReturnType<typeof universalSearch>> | null>(null);
  useEffect(() => { let live = true; if (!q.trim()) { setHits(null); return; } universalSearch(q, 30).then((h) => live && setHits(h.filter((x) => x.kind === "article"))); return () => { live = false; }; }, [q]);
  const arts = useLiveQuery(async () => { const b = briefings.find((x) => x.id === open); return b ? ((await db.articles.bulkGet(b.articleIds)).filter(Boolean) as Article[]) : []; }, [open, briefings], [] as Article[]);
  return (
    <div className="col">
      <input type="search" aria-label="Search archive" placeholder="Search all stored stories (title, source, summary, your notes)…" value={q} onChange={(e) => setQ(e.target.value)} />
      {hits && (hits.length ? <Card title={`${hits.length} matching stories`}>{hits.map((h) => <div key={h.id} className="mini" style={{ marginBottom: 8 }}><span className="strong">{h.title}</span><div className="small muted">{h.snippet}</div></div>)}</Card> : <Empty icon="🔍" title="No stored story matches" />)}
      {!q && (briefings.length === 0 ? <Empty icon="🗄️" title="No past briefings yet">Each day's five stories are archived here once generated.</Empty> : (
        <div className="grid g2">
          <Card title="Past briefings">{briefings.map((b) => <button key={b.id} className={`mini ${open === b.id ? "sel" : ""}`} style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 8, cursor: "pointer", color: "inherit" }} onClick={() => setOpen(b.id)}>{format(new Date(b.id + "T00:00:00"), "EEEE, d MMM yyyy")} <span className="muted">· {b.articleIds.length} stories</span></button>)}</Card>
          <div className="col">{open ? arts.map((a, i) => <StoryCard key={a.id} a={a} rank={i + 1} />) : <Empty icon="👈" title="Pick a day" />}</div>
        </div>
      ))}
    </div>
  );
}

export function Sources() {
  const toast = useToast();
  const feeds = useLiveQuery(() => db.feeds.toArray(), [], [] as Feed[]);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", url: "https://", topic: "tech" as Topic, section: "news" as Feed["section"], tier: "secondary" as Feed["tier"] });
  return (
    <div className="col">
      <Notice kind="info">Sources are public RSS/Atom feeds fetched directly from each publisher — no API key, no middleman. Publishers sometimes move or retire feeds, so the health of each is shown below. In a desktop browser many sites block direct requests (CORS); the Android app fetches natively.</Notice>
      <div className="row"><Btn kind="primary" onClick={() => setAdding(true)}>+ Add feed</Btn><RefreshBar /></div>
      <Card><div className="scroll-x"><table className="tbl"><thead><tr><th>On</th><th>Source</th><th>Section</th><th>Topic</th><th>Tier</th><th>Health</th><th /></tr></thead><tbody>
        {feeds.map((x) => (
          <tr key={x.id}>
            <td><input type="checkbox" aria-label={`Enable ${x.name}`} checked={x.enabled} onChange={(e) => db.feeds.update(x.id, { enabled: e.target.checked })} /></td>
            <td><span className="strong">{x.name}</span><div className="tiny muted" style={{ maxWidth: 260 }}>{x.url}</div></td>
            <td>{x.section}</td><td>{TOPIC_LABEL[x.topic]}</td><td>{x.tier}</td>
            <td>{!x.lastStatus ? <Chip>not fetched</Chip> : x.lastStatus === "ok" ? <Chip kind="ok">{x.lastCount} items</Chip> : <Chip kind="danger" title={x.lastError}>{x.lastError}</Chip>}{x.lastFetched && <div className="tiny muted">{relativeTime(x.lastFetched)}</div>}</td>
            <td>{x.custom && <Btn sm kind="ghost" aria-label={`Remove ${x.name}`} onClick={() => db.feeds.delete(x.id)}>✕</Btn>}</td>
          </tr>
        ))}
      </tbody></table></div></Card>
      {adding && (
        <Modal title="Add a feed" onClose={() => setAdding(false)}>
          <form className="col" onSubmit={async (e) => { e.preventDefault(); await db.feeds.add({ id: "custom-" + Date.now(), name: f.name.trim(), url: f.url.trim(), topic: f.topic, section: f.section, tier: f.tier, enabled: true, custom: true }); setAdding(false); toast("Feed added — refresh to fetch it", "ok"); }}>
            <Field label="Name"><input type="text" data-autofocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
            <Field label="Feed URL (RSS / Atom)"><input type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} required /></Field>
            <div className="grid g2">
              <Field label="Section"><select value={f.section} onChange={(e) => setF({ ...f, section: e.target.value as Feed["section"] })}><option value="news">News briefing</option><option value="tech">Technology radar</option></select></Field>
              <Field label="Topic"><select value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value as Topic })}>{Object.entries(TOPIC_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <Field label="Reliability tier" hint="Official = government/regulator; Original = newsroom that reports first-hand"><select value={f.tier} onChange={(e) => setF({ ...f, tier: e.target.value as Feed["tier"] })}><option value="official">Official</option><option value="primary">Original reporting</option><option value="secondary">Secondary</option></select></Field>
            </div>
            <div className="row" style={{ justifyContent: "flex-end" }}><Btn onClick={() => setAdding(false)}>Cancel</Btn><Btn kind="primary" type="submit" disabled={!/^https?:\/\//.test(f.url) || !f.name.trim()}>Add</Btn></div>
          </form>
        </Modal>
      )}
    </div>
  );
}
