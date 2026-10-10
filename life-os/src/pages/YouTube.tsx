import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { addDays, format } from "date-fns";
import { db, uid } from "../db/db";
import type { Bookmark, Channel, IdeaStage, VideoIdea } from "../db/types";
import { CHANNELS, CHECKLIST_LONG, CHECKLIST_SHORT, STAGES, TITLE_FORMULAS, TITLE_NOTE } from "../content/youtube";
import { aiReady, generateVideoIdeas, generateVideoPackage } from "../lib/ai";
import { useSettings } from "../lib/settings";
import { addTask } from "../lib/tasks";
import { dayKey } from "../lib/dates";
import { BarChart, Btn, Card, Chip, Empty, ExtLink, Field, Modal, Notice, Spinner, Tabs, useAsync, useConfirm, useTab, useToast } from "../components/ui";

const ALL: Channel[] = ["MONEYVARK", "ZILVOREX"];

export default function YouTube() {
  const [tab, setTab] = useTab("pipeline", ["pipeline", "ideas", "calendar", "research", "performance"]);
  const [channel, setChannel] = useState<Channel | "">("");
  return (
    <div>
      <div className="page-head"><h1>YouTube Studio</h1><p>MONEYVARK and ZILVOREX in one workspace: ideas → script → production → schedule → results.</p></div>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className={`chip ${channel === "" ? "on" : ""}`} onClick={() => setChannel("")}>Both channels</button>
        {ALL.map((c) => <button key={c} className={`chip ${channel === c ? "on" : ""}`} onClick={() => setChannel(c)} style={{ ["--tint" as any]: CHANNELS[c].color }}>{c}</button>)}
      </div>
      <Tabs label="YouTube sections" value={tab} onChange={setTab} tabs={[{ id: "pipeline", label: "Pipeline" }, { id: "ideas", label: "Idea generator" }, { id: "calendar", label: "Content calendar" }, { id: "research", label: "Research" }, { id: "performance", label: "Performance" }]} />
      {tab === "pipeline" && <Pipeline channel={channel} />}
      {tab === "ideas" && <Ideas channel={channel} />}
      {tab === "calendar" && <CalendarView channel={channel} />}
      {tab === "research" && <Research />}
      {tab === "performance" && <Performance channel={channel} />}
    </div>
  );
}

const newIdea = (p: Partial<VideoIdea> & { title: string; channel: Channel }): VideoIdea => ({
  id: uid(), format: "long", stage: "idea", publishDate: null, hook: "", script: "", description: "", tags: [], thumbnail: "", origin: "manual", views: null, createdAt: new Date().toISOString(),
  checklist: [], ...p,
});
const checklistFor = (f: "short" | "long") => (f === "short" ? CHECKLIST_SHORT : CHECKLIST_LONG).map((label) => ({ id: uid(), label, done: false }));

function Pipeline({ channel }: { channel: Channel | "" }) {
  const toast = useToast();
  const all = useLiveQuery(() => db.videoIdeas.toArray(), [], [] as VideoIdea[]);
  const ideas = all.filter((i) => !channel || i.channel === channel);
  const [edit, setEdit] = useState<VideoIdea | null>(null);
  const [title, setTitle] = useState("");
  const [ch, setCh] = useState<Channel>("MONEYVARK");
  const [fmt, setFmt] = useState<"short" | "long">("long");
  return (
    <div className="col">
      <Card><form className="row" onSubmit={async (e) => { e.preventDefault(); if (!title.trim()) return; await db.videoIdeas.add(newIdea({ title: title.trim(), channel: channel || ch, format: fmt, checklist: checklistFor(fmt) })); setTitle(""); toast("Idea added", "ok"); }}>
        {!channel && <select aria-label="Channel" style={{ width: 150 }} value={ch} onChange={(e) => setCh(e.target.value as Channel)}>{ALL.map((c) => <option key={c}>{c}</option>)}</select>}
        <select aria-label="Format" style={{ width: 110 }} value={fmt} onChange={(e) => setFmt(e.target.value as "short" | "long")}><option value="long">Long</option><option value="short">Short</option></select>
        <input type="text" aria-label="Video idea title" placeholder="New video idea…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Btn kind="primary" type="submit" disabled={!title.trim()}>Add</Btn></form></Card>
      {ideas.length === 0 ? <Empty icon="🎬" title="No videos in the pipeline">Add an idea above or generate some in the Idea generator tab.</Empty> : (
        <div className="board">
          {STAGES.map((st) => {
            const col = ideas.filter((i) => i.stage === st);
            return (
              <section key={st} aria-label={st}>
                <h4 style={{ textTransform: "capitalize" }}>{st} <span className="muted">({col.length})</span></h4>
                {col.map((i) => {
                  const done = i.checklist.filter((c) => c.done).length;
                  return (
                    <button key={i.id} className="mini" style={{ textAlign: "left", cursor: "pointer", color: "inherit" }} onClick={() => setEdit(i)}>
                      <div className="strong">{i.title}</div>
                      <div className="row" style={{ marginTop: 4 }}>
                        <Chip tint={CHANNELS[i.channel].color}>{i.channel}</Chip><Chip>{i.format}</Chip>
                        {i.origin === "ai" && <Chip kind="info" title="AI-generated suggestion, not a verified trend">AI idea</Chip>}
                        {i.publishDate && <Chip>📅 {format(new Date(i.publishDate + "T00:00:00"), "d MMM")}</Chip>}
                        {i.checklist.length > 0 && <Chip>☑ {done}/{i.checklist.length}</Chip>}
                      </div>
                    </button>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
      {edit && <IdeaEditor idea={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function IdeaEditor({ idea, onClose }: { idea: VideoIdea; onClose: () => void }) {
  const s = useSettings();
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const job = useAsync();
  const [d, setD] = useState<VideoIdea>(idea);
  const [titles, setTitles] = useState<string[]>([]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [outline, setOutline] = useState<string[]>([]);
  const set = <K extends keyof VideoIdea>(k: K, v: VideoIdea[K]) => setD((x) => ({ ...x, [k]: v }));
  const gen = () => job.run(async () => {
    const p = await generateVideoPackage(s, d.channel, d.title, d.format);
    setTitles(p.titles); setThumbs(p.thumbnails); setOutline(p.outline);
    setD((x) => ({ ...x, hook: x.hook || p.hook, description: x.description || p.description, tags: x.tags.length ? x.tags : p.tags, thumbnail: x.thumbnail || p.thumbnails[0] || "" }));
    toast("Draft generated — review and edit before using", "ok");
  });
  const save = async () => { await db.videoIdeas.put(d); onClose(); };
  return (
    <Modal title="Video workspace" onClose={onClose} wide>
      <div className="col">
        <div className="grid g2">
          <Field label="Working title"><input type="text" data-autofocus value={d.title} onChange={(e) => set("title", e.target.value)} /></Field>
          <Field label="Stage"><select value={d.stage} onChange={(e) => set("stage", e.target.value as IdeaStage)}>{STAGES.map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Channel"><select value={d.channel} onChange={(e) => set("channel", e.target.value as Channel)}>{ALL.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Format"><select value={d.format} onChange={(e) => { const f = e.target.value as "short" | "long"; set("format", f); if (!d.checklist.some((c) => c.done)) set("checklist", checklistFor(f)); }}><option value="long">Long-form</option><option value="short">Short</option></select></Field>
          <Field label="Publish date"><input type="date" value={d.publishDate ?? ""} onChange={(e) => set("publishDate", e.target.value || null)} /></Field>
          {d.stage === "published" && <Field label="Views (from YouTube Studio, entered by you)"><input type="number" min={0} value={d.views ?? ""} onChange={(e) => set("views", e.target.value ? Number(e.target.value) : null)} /></Field>}
        </div>
        <div className="row"><Btn onClick={gen} disabled={!aiReady(s) || job.busy}>{job.busy ? <Spinner label="Drafting…" /> : "✨ Draft title ideas, hook, outline, description, tags"}</Btn>{!aiReady(s) && <span className="tiny muted">Needs an AI key (Settings). Drafts are AI suggestions, not verified trends.</span>}</div>
        {job.error && <Notice kind="danger">{job.error}</Notice>}
        {titles.length > 0 && <Card className="flat" title="Title options (AI)">{titles.map((t) => <div key={t} className="row nw" style={{ marginBottom: 4 }}><span className="grow">{t} <span className="tiny muted">({t.length})</span></span><Btn sm onClick={() => set("title", t)}>Use</Btn></div>)}</Card>}
        {outline.length > 0 && <Card className="flat" title="Outline (AI)"><ol style={{ paddingLeft: 18 }}>{outline.map((o, i) => <li key={i} className="small">{o}</li>)}</ol><Btn sm onClick={() => set("script", (d.script ? d.script + "\n\n" : "") + outline.map((o, i) => `${i + 1}. ${o}`).join("\n"))}>Append to script</Btn></Card>}
        {thumbs.length > 0 && <Card className="flat" title="Thumbnail concepts (AI)">{thumbs.map((t) => <p key={t} className="small" style={{ marginBottom: 4 }}>• {t}</p>)}</Card>}
        <Field label="Hook (first 15 seconds)"><textarea value={d.hook} onChange={(e) => set("hook", e.target.value)} /></Field>
        <Field label="Script"><textarea style={{ minHeight: 200 }} value={d.script} onChange={(e) => set("script", e.target.value)} /></Field>
        <Field label="Thumbnail concept"><textarea value={d.thumbnail} onChange={(e) => set("thumbnail", e.target.value)} /></Field>
        <Field label="Description"><textarea value={d.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Tags (comma separated)"><input type="text" value={d.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((t) => t.trim()).filter(Boolean))} /></Field>
        <div><span className="label">Production checklist</span>
          {d.checklist.map((c) => <label key={c.id} className="check small" style={{ display: "flex", marginBottom: 2 }}><input type="checkbox" checked={c.done} onChange={() => set("checklist", d.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))} /> <span style={{ textDecoration: c.done ? "line-through" : "none" }}>{c.label}</span></label>)}
          {d.checklist.length === 0 && <Btn sm onClick={() => set("checklist", checklistFor(d.format))}>Add standard checklist</Btn>}
        </div>
        {d.channel === "MONEYVARK" && <Notice kind="warn">Finance content: no guaranteed-return claims, show risks, cite sources, and add a “not financial advice” disclaimer.</Notice>}
        <div className="row">
          <Btn kind="danger" onClick={async () => { if (await confirm("Delete this video?")) { await db.videoIdeas.delete(d.id); onClose(); } }}>Delete</Btn>
          <Btn onClick={async () => { await addTask({ title: `${d.channel}: ${d.title}`, category: "content", due: d.publishDate ? new Date(d.publishDate + "T00:00:00").toISOString() : null, hasTime: false, source: "plan" }); toast("Task created", "ok"); }}>→ Task</Btn>
          <div className="sp" /><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" onClick={save}>Save</Btn>
        </div>
      </div>
      {node}
    </Modal>
  );
}

function Ideas({ channel }: { channel: Channel | "" }) {
  const s = useSettings();
  const toast = useToast();
  const job = useAsync();
  const existing = useLiveQuery(() => db.videoIdeas.toArray(), [], [] as VideoIdea[]);
  const [ch, setCh] = useState<Channel>(channel || "MONEYVARK");
  const [res, setRes] = useState<{ title: string; format: "short" | "long"; hook: string }[]>([]);
  const target = channel || ch;
  return (
    <div className="col">
      <Notice kind="info"><strong>Verified vs predicted.</strong> Ideas below are AI-generated suggestions — not verified trends. This app does not have access to search volumes, competitor statistics or YouTube Analytics, and will never invent them. Check demand yourself in YouTube search suggestions and YouTube Studio → Research.</Notice>
      <Card title="Daily video ideas" icon="💡">
        <div className="row">
          {!channel && <select aria-label="Channel" style={{ width: 160 }} value={ch} onChange={(e) => setCh(e.target.value as Channel)}>{ALL.map((c) => <option key={c}>{c}</option>)}</select>}
          <Btn kind="primary" disabled={!aiReady(s) || job.busy} onClick={() => job.run(async () => setRes(await generateVideoIdeas(s, target, 5, existing.filter((i) => i.channel === target).map((i) => i.title))))}>{job.busy ? <Spinner label="Thinking…" /> : `Generate 5 ideas for ${target}`}</Btn>
          {!aiReady(s) && <span className="tiny muted">Add an AI key in Settings → AI.</span>}
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>{CHANNELS[target].tagline}: {CHANNELS[target].pillars.join(" · ")}</p>
        {job.error && <Notice kind="danger">{job.error}</Notice>}
        <div className="col" style={{ marginTop: 12 }}>{res.map((r, i) => (
          <div key={i} className="mini"><div className="row nw"><div className="grow"><span className="strong">{r.title}</span><div className="row" style={{ marginTop: 4 }}><Chip>{r.format}</Chip><Chip kind="info">AI suggestion</Chip></div><p className="small">{r.hook}</p></div>
            <Btn sm onClick={async () => { await db.videoIdeas.add(newIdea({ title: r.title, channel: target, format: r.format, hook: r.hook, origin: "ai", checklist: checklistFor(r.format) })); setRes(res.filter((_, k) => k !== i)); toast("Added to pipeline", "ok"); }}>Add</Btn></div></div>
        ))}</div>
      </Card>
      <Card title="Title formulas" icon="✍️"><ul style={{ paddingLeft: 18 }}>{TITLE_FORMULAS.map((t) => <li key={t} className="small" style={{ marginBottom: 4 }}>{t}</li>)}</ul><p className="tiny muted">{TITLE_NOTE}</p></Card>
    </div>
  );
}

function CalendarView({ channel }: { channel: Channel | "" }) {
  const all = useLiveQuery(() => db.videoIdeas.toArray(), [], [] as VideoIdea[]);
  const ideas = all.filter((i) => !channel || i.channel === channel);
  const days = Array.from({ length: 28 }, (_, i) => addDays(new Date(), i));
  const unscheduled = ideas.filter((i) => !i.publishDate && i.stage !== "published");
  return (
    <div className="col">
      <Card title="Next 4 weeks" icon="📅">
        <div className="grid g4">{days.map((d) => { const k = dayKey(d); const list = ideas.filter((i) => i.publishDate === k); return (
          <div key={k} className="mini" style={{ minHeight: 70, opacity: list.length ? 1 : 0.65 }}><span className="tiny muted">{format(d, "EEE d MMM")}</span>{list.map((i) => <div key={i.id} className="small" style={{ marginTop: 4 }}><Chip tint={CHANNELS[i.channel].color}>{i.channel.slice(0, 4)}</Chip> {i.title}</div>)}</div>
        ); })}</div>
      </Card>
      <Card title={`Unscheduled (${unscheduled.length})`}>{unscheduled.length ? unscheduled.map((i) => <div key={i.id} className="row nw" style={{ marginBottom: 6 }}><span className="grow">{i.title}</span><input type="date" aria-label={`Schedule ${i.title}`} style={{ width: 160, minHeight: 36 }} onChange={(e) => e.target.value && db.videoIdeas.update(i.id, { publishDate: e.target.value, stage: i.stage === "idea" ? "scheduled" : i.stage })} /></div>) : <p className="small muted">Everything has a date.</p>}</Card>
    </div>
  );
}

function Research() {
  const toast = useToast();
  const logs = useLiveQuery(() => db.bookmarks.filter((b) => b.tags.includes("yt-research")).toArray(), [], [] as Bookmark[]);
  const [f, setF] = useState({ title: "", url: "", note: "" });
  return (
    <div className="col">
      <Notice kind="warn"><strong>No live YouTube data in this app.</strong> Trending topics, keyword volumes and competitor stats require YouTube Analytics / a research provider (e.g. YouTube Studio → Research, vidIQ, TubeBuddy) and are never invented here. Log what you find, with the link and date, so your research is traceable.</Notice>
      <div className="grid g2">
        <Card title="Where to research (official)">{[["YouTube Studio → Analytics", "https://studio.youtube.com/"], ["YouTube Trends (public)", "https://www.youtube.com/feed/trending"], ["Google Trends", "https://trends.google.com/trends/"], ["YouTube Analytics help", "https://support.google.com/youtube/topic/9257532"]].map(([l, u]) => <p key={u} style={{ marginBottom: 6 }}><ExtLink href={u}>{l}</ExtLink></p>)}</Card>
        <Card title="Log a finding" icon="🔎"><form className="col" onSubmit={async (e) => { e.preventDefault(); await db.bookmarks.add({ id: uid(), title: f.title.trim(), url: f.url.trim() || "https://studio.youtube.com/", note: `${format(new Date(), "d MMM yyyy")}: ${f.note}`, tags: ["youtube", "yt-research"], createdAt: new Date().toISOString() }); setF({ title: "", url: "", note: "" }); toast("Logged", "ok"); }}>
          <Field label="Topic / competitor / keyword"><input type="text" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
          <Field label="Source link"><input type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://…" /></Field>
          <Field label="What you observed (numbers from the source, with date)"><textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
          <Btn kind="primary" type="submit" disabled={!f.title.trim()}>Save</Btn></form></Card>
      </div>
      <Card title={`Research log (${logs.length})`}>{logs.length === 0 ? <p className="small muted">Nothing logged yet.</p> : logs.map((b) => <div key={b.id} className="task"><div className="grow"><a className="strong" href={b.url} target="_blank" rel="noopener noreferrer">{b.title}</a><p className="small">{b.note}</p></div><Btn sm kind="ghost" aria-label="Delete" onClick={() => db.bookmarks.delete(b.id)}>✕</Btn></div>)}</Card>
    </div>
  );
}

function Performance({ channel }: { channel: Channel | "" }) {
  const all = useLiveQuery(() => db.videoIdeas.toArray(), [], [] as VideoIdea[]);
  const pub = all.filter((i) => i.stage === "published" && (!channel || i.channel === channel));
  const withViews = pub.filter((i) => i.views !== null);
  return (
    <div className="col">
      <Notice kind="info">Automatic performance tracking needs the YouTube Analytics API (OAuth), which isn't connected. Enter views from YouTube Studio manually when you edit a published video; everything shown here comes from numbers you entered.</Notice>
      <div className="grid g3">
        {ALL.filter((c) => !channel || c === channel).map((c) => { const mine = all.filter((i) => i.channel === c); return (
          <Card key={c}><div className="stat"><span className="l">{c}</span><span className="v">{mine.filter((i) => i.stage === "published").length}</span><span className="l">published · {mine.filter((i) => !["idea", "published"].includes(i.stage)).length} in production · {mine.filter((i) => i.stage === "idea").length} ideas</span></div></Card>
        ); })}
      </div>
      {withViews.length === 0 ? <Empty icon="📈" title="No view counts entered">Open a published video in the Pipeline and add its views to see a chart.</Empty> : <Card title="Views by video (entered by you)"><BarChart height={140} data={withViews.slice(0, 12).map((i) => ({ label: i.title.slice(0, 6), value: i.views! }))} /></Card>}
    </div>
  );
}
