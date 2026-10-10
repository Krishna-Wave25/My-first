import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, uid } from "../db/db";
import type { Article, WatchItem } from "../db/types";
import { TECH_AREAS } from "../content/feeds";
import { matchesWord, scoreArticle, dedupe } from "../lib/news";
import { useSettings } from "../lib/settings";
import { Btn, Card, Chip, Empty, Field, Notice, Tabs, useTab } from "../components/ui";
import { StoryCard } from "./News";
import { useNavigate } from "react-router-dom";

const KINDS: WatchItem["kind"][] = ["technology", "company", "tool", "industry"];

export default function Tech() {
  const [tab, setTab] = useTab("radar", ["radar", "watchlist"]);
  return (
    <div>
      <div className="page-head"><h1>AI & Technology Radar</h1><p>What happened, why it matters, how you can use it, what to learn, and whether it opens an earning opportunity. Sources and dates on every item.</p></div>
      <Tabs label="Technology sections" value={tab} onChange={setTab} tabs={[{ id: "radar", label: "Radar" }, { id: "watchlist", label: "Watchlists" }]} />
      {tab === "radar" ? <Radar /> : <Watchlist />}
    </div>
  );
}

function Radar() {
  const s = useSettings();
  const nav = useNavigate();
  const arts = useLiveQuery(() => db.articles.toArray(), [], [] as Article[]);
  const watch = useLiveQuery(() => db.watchlist.toArray(), [], [] as WatchItem[]);
  const [area, setArea] = useState("");
  const [onlyWatch, setOnlyWatch] = useState(false);
  const shown = useMemo(() => {
    const cutoff = Date.now() - 14 * 86400000;
    const rx = TECH_AREAS.find((a) => a.id === area)?.match;
    const pool = arts.filter((a) => (a.section === "tech" || a.topic === "tech" || a.topic === "ai") && a.publishedAt && new Date(a.publishedAt).getTime() >= cutoff);
    return dedupe(pool)
      .filter((a) => (!rx || rx.test(`${a.title} ${a.summary}`)) && (!onlyWatch || watch.some((w) => matchesWord(`${a.title} ${a.summary}`, w.name))))
      .sort((a, b) => scoreArticle({ ...b, section: "news" }, s.interests) - scoreArticle({ ...a, section: "news" }, s.interests)).slice(0, 40);
  }, [arts, area, onlyWatch, watch, s.interests]);
  const total = arts.filter((a) => a.section === "tech").length;
  return (
    <div className="col">
      <div className="row">
        <button className={`chip ${area === "" ? "on" : ""}`} onClick={() => setArea("")}>All areas</button>
        {TECH_AREAS.map((a) => <button key={a.id} className={`chip ${area === a.id ? "on" : ""}`} onClick={() => setArea(a.id)}>{a.label}</button>)}
      </div>
      <div className="row"><label className="check"><input type="checkbox" checked={onlyWatch} onChange={(e) => setOnlyWatch(e.target.checked)} /> Only items matching my watchlists ({watch.length})</label>
        <div className="sp" /><Btn sm onClick={() => nav("/news?tab=sources")}>Manage sources / refresh</Btn></div>
      {shown.length === 0 ? (
        <Empty icon="📡" title={total === 0 ? "The radar is empty" : "No items match"}>{total === 0 ? "Fetch your technology sources from News → Sources (or Refresh). Nothing is shown unless it comes from a real, dated source." : "Try another area or turn off the watchlist filter."}</Empty>
      ) : shown.map((a) => {
        const hits = watch.filter((w) => matchesWord(`${a.title} ${a.summary}`, w.name));
        return <div key={a.id}>{hits.length > 0 && <div className="row" style={{ marginBottom: 6 }}>{hits.map((h) => <Chip key={h.id} kind="info">👁 {h.name}</Chip>)}</div>}<StoryCard a={a} /></div>;
      })}
      <Notice>“Explain this development” uses your AI key and is limited to the source excerpt; anything beyond it appears under Speculation.</Notice>
    </div>
  );
}

function Watchlist() {
  const items = useLiveQuery(() => db.watchlist.toArray(), [], [] as WatchItem[]);
  const [kind, setKind] = useState<WatchItem["kind"]>("technology");
  const [name, setName] = useState("");
  const arts = useLiveQuery(() => db.articles.toArray(), [], [] as Article[]);
  return (
    <div className="col">
      <Card title="Add to watchlist"><form className="row nw" onSubmit={async (e) => { e.preventDefault(); if (!name.trim()) return; await db.watchlist.add({ id: uid(), kind, name: name.trim(), createdAt: new Date().toISOString() }); setName(""); }}>
        <select aria-label="Kind" style={{ width: 150 }} value={kind} onChange={(e) => setKind(e.target.value as WatchItem["kind"])}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
        <input type="text" aria-label="Name to watch" placeholder="e.g. quantum error correction, NVIDIA, Arduino, solar storage" value={name} onChange={(e) => setName(e.target.value)} />
        <Btn kind="primary" type="submit" disabled={!name.trim()}>Watch</Btn></form></Card>
      {items.length === 0 ? <Empty icon="👁" title="Nothing on your watchlists">Track technologies, companies, tools and industries. Matching stories get highlighted on the radar.</Empty> : (
        <div className="grid auto">{KINDS.map((k) => { const list = items.filter((i) => i.kind === k); return list.length ? (
          <Card key={k} title={k[0].toUpperCase() + k.slice(1) + "s"}>
            {list.map((w) => { const n = arts.filter((a) => matchesWord(`${a.title} ${a.summary}`, w.name)).length; return <div key={w.id} className="row nw" style={{ marginBottom: 6 }}><span className="grow strong">{w.name}</span><Chip>{n} mention{n === 1 ? "" : "s"}</Chip><Btn sm kind="ghost" aria-label={`Stop watching ${w.name}`} onClick={() => db.watchlist.delete(w.id)}>✕</Btn></div>; })}
          </Card>) : null; })}</div>
      )}
      <Field label=""><span className="tiny muted">Mentions are counted in the articles currently stored on this device (whole-word match).</span></Field>
    </div>
  );
}
