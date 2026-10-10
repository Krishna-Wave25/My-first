import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { db } from "../db/db";
import type { Article, Habit, HabitLog, Note, Project, ProjectItem, Task, TrackedOpportunity, VideoIdea } from "../db/types";
import { PLAYBOOKS } from "../content/opportunities";
import { Bar, BarChart, Btn, Card, Chip, Empty, Notice, Ring, useToast } from "../components/ui";
import { QuickAdd, TaskRow } from "../components/tasks";
import { openAssistant } from "../components/Shell";
import { buildBriefing } from "../lib/news";
import { dayKey, fmtDue, relativeTime } from "../lib/dates";
import { habitStreak, productivityScore } from "../lib/score";
import { DEFAULT_WIDGETS, saveSettings, useSettings } from "../lib/settings";
import { addTask, bucketOf, compareTasks } from "../lib/tasks";
import { priorityWeight } from "../db/types";
import { uid } from "../db/db";
import { subDays } from "date-fns";

const WIDGET_LABEL: Record<string, string> = {
  priorities: "Top 3 priorities", schedule: "Deadlines & schedule", briefing: "Daily briefing", tech: "AI & tech updates", opportunity: "Today's opportunity",
  career: "Career & learning", youtube: "YouTube studio", project: "College project", habits: "Habits", score: "Productivity score", notes: "Quick notes", assistant: "AI assistant",
};

export default function Home() {
  const s = useSettings();
  const [edit, setEdit] = useState(false);
  const h = new Date().getHours();
  const greet = h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [] as Task[]);
  const habits = useLiveQuery(() => db.habits.toArray(), [], [] as Habit[]);
  const logs = useLiveQuery(() => db.habitLogs.toArray(), [], [] as HabitLog[]);
  const score = useMemo(() => productivityScore(tasks, habits, logs), [tasks, habits, logs]);
  const overdue = tasks.filter((t) => bucketOf(t) === "overdue").length;
  const order = s.dashboard.order.filter((w) => DEFAULT_WIDGETS.includes(w));
  const visible = order.filter((w) => !s.dashboard.hidden.includes(w));
  const move = (w: string, d: -1 | 1) => { const o = [...order]; const i = o.indexOf(w); const j = i + d; if (j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; saveSettings({ dashboard: { ...s.dashboard, order: o } }); };
  const toggle = (w: string) => saveSettings({ dashboard: { ...s.dashboard, hidden: s.dashboard.hidden.includes(w) ? s.dashboard.hidden.filter((x) => x !== w) : [...s.dashboard.hidden, w] } });
  return (
    <div>
      <div className="row" style={{ marginBottom: 18 }}>
        <div className="grow"><h1>{greet}{s.name ? `, ${s.name}` : ""} 👋</h1><p className="muted">{format(new Date(), "EEEE, d MMMM yyyy")} · {s.timezone}</p></div>
        <Ring value={score.total} size={84} label={`Productivity score ${score.total}`} />
        <Btn sm onClick={() => setEdit(!edit)} aria-pressed={edit}>{edit ? "Done" : "⚙ Customize"}</Btn>
      </div>
      {!s.name && <div style={{ marginBottom: 14 }}><Notice kind="info">Welcome! Add your name in <Link to="/settings">Settings</Link>, then try the quick-add box below — type something like “Friday 5pm submit lab record high priority”.</Notice></div>}
      <Card className="flat"><QuickAdd /></Card>
      {overdue > 0 && <div style={{ marginTop: 14 }}><Notice kind="warn">{overdue} overdue task{overdue > 1 ? "s need" : " needs"} attention — <Link to="/day?tab=overdue">review</Link></Notice></div>}
      {edit && (
        <Card title="Customize dashboard" className="flat">
          <p className="small muted" style={{ marginBottom: 8 }}>Show, hide and reorder sections. Changes save automatically.</p>
          {order.map((w, i) => (
            <div key={w} className="row nw" style={{ padding: "4px 0" }}>
              <label className="check grow"><input type="checkbox" checked={!s.dashboard.hidden.includes(w)} onChange={() => toggle(w)} /> {WIDGET_LABEL[w]}</label>
              <Btn sm aria-label={`Move ${WIDGET_LABEL[w]} up`} disabled={i === 0} onClick={() => move(w, -1)}>↑</Btn>
              <Btn sm aria-label={`Move ${WIDGET_LABEL[w]} down`} disabled={i === order.length - 1} onClick={() => move(w, 1)}>↓</Btn>
            </div>
          ))}
        </Card>
      )}
      <div className="grid auto" style={{ marginTop: 14, alignItems: "start", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))" }}>
        {visible.map((w) => <Widget key={w} id={w} tasks={tasks} habits={habits} logs={logs} score={score} />)}
      </div>
      {visible.length === 0 && <Empty icon="🧩" title="All sections hidden" action={<Btn onClick={() => setEdit(true)}>Customize</Btn>} />}
    </div>
  );
}

function Widget({ id, tasks, habits, logs, score }: { id: string; tasks: Task[]; habits: Habit[]; logs: HabitLog[]; score: ReturnType<typeof productivityScore> }) {
  switch (id) {
    case "priorities": return <Priorities tasks={tasks} />;
    case "schedule": return <Schedule tasks={tasks} />;
    case "briefing": return <BriefingWidget />;
    case "tech": return <TechWidget />;
    case "opportunity": return <OpportunityWidget />;
    case "career": return <CareerWidget />;
    case "youtube": return <YoutubeWidget />;
    case "project": return <ProjectWidget />;
    case "habits": return <HabitWidget habits={habits} logs={logs} />;
    case "score": return <ScoreWidget tasks={tasks} score={score} />;
    case "notes": return <NotesWidget />;
    case "assistant": return <AssistantWidget />;
    default: return null;
  }
}

function Priorities({ tasks }: { tasks: Task[] }) {
  const now = new Date();
  const top = tasks.filter((t) => t.status === "todo" && ["overdue", "today"].includes(bucketOf(t, now))).sort((a, b) => (bucketOf(a, now) === "overdue" ? -1 : 0) - (bucketOf(b, now) === "overdue" ? -1 : 0) || priorityWeight(b.priority) - priorityWeight(a.priority) || compareTasks(a, b)).slice(0, 3);
  const fallback = top.length ? top : tasks.filter((t) => t.status === "todo").sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority) || compareTasks(a, b)).slice(0, 3);
  return (
    <Card title="Top 3 priorities" icon="🎯" actions={<Link to="/day">All tasks →</Link>}>
      {fallback.length === 0 ? <Empty icon="🌤️" title="Nothing on your plate">Add a task with the box above.</Empty> : fallback.map((t) => <TaskRow key={t.id} t={t} compact />)}
    </Card>
  );
}
function Schedule({ tasks }: { tasks: Task[] }) {
  const up = tasks.filter((t) => t.status === "todo" && t.due).sort(compareTasks).slice(0, 6);
  return (
    <Card title="Deadlines & schedule" icon="📅" actions={<Link to="/day?tab=calendar">Calendar →</Link>}>
      {up.length === 0 ? <p className="small muted">No dated tasks.</p> : up.map((t) => <div key={t.id} className="row nw small" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}><span className="grow">{t.title}</span><Chip kind={bucketOf(t) === "overdue" ? "danger" : ""}>{fmtDue(t.due, t.hasTime)}</Chip></div>)}
    </Card>
  );
}
function BriefingWidget() {
  const nav = useNavigate();
  const s = useSettings();
  const [list, setList] = useState<Article[] | null>(null);
  const count = useLiveQuery(() => db.articles.count(), [], 0);
  useEffect(() => { let live = true; buildBriefing(s.interests).then((r) => live && setList(r.articles)); return () => { live = false; }; }, [count, s.interests.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card title="Daily briefing" icon="📰" actions={<Link to="/news">Open →</Link>}>
      {!list ? <p className="small muted">Loading…</p> : list.length === 0 ? <><p className="small muted">No fresh stories yet. Sources are fetched when you open the app online.</p><Btn sm style={{ marginTop: 8 }} onClick={() => nav("/news")}>Fetch now</Btn></> : (
        <ol style={{ paddingLeft: 18 }}>{list.map((a) => <li key={a.id} className="small" style={{ marginBottom: 6 }}><a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text)" }}>{a.title}</a><div className="tiny muted">{a.source} · {relativeTime(a.publishedAt)}</div></li>)}</ol>
      )}
    </Card>
  );
}
function TechWidget() {
  const list = useLiveQuery(async () => (await db.articles.where("section").equals("tech").toArray()).filter((a) => a.publishedAt).sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!)).slice(0, 4), [], [] as Article[]);
  return (
    <Card title="AI & tech updates" icon="🤖" actions={<Link to="/tech">Radar →</Link>}>
      {list.length === 0 ? <p className="small muted">No technology items fetched yet.</p> : list.map((a) => <div key={a.id} style={{ marginBottom: 8 }}><a className="small" href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--text)" }}>{a.title}</a><div className="tiny muted">{a.source} · {relativeTime(a.publishedAt)}</div></div>)}
    </Card>
  );
}
function OpportunityWidget() {
  const toast = useToast();
  const tracked = useLiveQuery(() => db.opportunities.toArray(), [], [] as TrackedOpportunity[]);
  const pick = useMemo(() => { const pool = PLAYBOOKS.filter((p) => p.startCost.startsWith("₹0") && p.difficulty !== "Hard"); return pool[Math.floor(Date.now() / 86400000) % pool.length]; }, []);
  const upcoming = tracked.filter((o) => o.deadline && ["saved", "researching", "in_progress"].includes(o.status)).sort((a, b) => a.deadline!.localeCompare(b.deadline!))[0];
  return (
    <Card title="Today's opportunity" icon="💰" actions={<Link to="/earn">Explore →</Link>}>
      <p className="strong">{pick.name}</p><p className="small">{pick.summary}</p>
      <p className="small" style={{ marginTop: 6 }}><strong>Try today:</strong> {pick.firstAction.title} (~{pick.firstAction.minutes} min)</p>
      <div className="row" style={{ marginTop: 8 }}><Btn sm kind="primary" onClick={async () => { await addTask({ title: pick.firstAction.title, durationMin: pick.firstAction.minutes, category: "career", due: new Date().toISOString(), hasTime: false, source: "plan" }); toast("Added to today's tasks", "ok"); }}>Add to today</Btn><Chip>estimates only · no guarantees</Chip></div>
      {upcoming && <p className="tiny" style={{ marginTop: 8 }}>⏰ Next tracked deadline: <strong>{upcoming.name}</strong> — {format(new Date(upcoming.deadline + "T00:00:00"), "d MMM")}</p>}
    </Card>
  );
}
function CareerWidget() {
  const nav = useNavigate();
  const logs = useLiveQuery(() => db.learningLogs.toArray(), [], []);
  const goal = useLiveQuery(async () => (await db.kv.get("learningGoal"))?.value ?? 45, [], 45) as number;
  const apps = useLiveQuery(() => db.opportunities.filter((o) => ["job", "internship", "scholarship", "certification"].includes(o.kind)).toArray(), [], [] as TrackedOpportunity[]);
  const today = logs.filter((l) => l.date === dayKey()).reduce((a, l) => a + l.minutes, 0);
  return (
    <Card title="Career & learning" icon="🎓" actions={<Link to="/career">Open →</Link>}>
      <p className="small">Learning today: <span className="strong">{today}/{goal} min</span></p><Bar label="Learning minutes today" value={today} max={goal} />
      <p className="small" style={{ marginTop: 10 }}>Tracked applications: <span className="strong">{apps.length}</span> · applied: {apps.filter((a) => a.status === "applied").length}</p>
      <Btn sm style={{ marginTop: 8 }} onClick={() => nav("/career?tab=learning")}>Log learning</Btn>
    </Card>
  );
}
function YoutubeWidget() {
  const ideas = useLiveQuery(() => db.videoIdeas.toArray(), [], [] as VideoIdea[]);
  const next = ideas.filter((i) => i.publishDate && i.stage !== "published").sort((a, b) => a.publishDate!.localeCompare(b.publishDate!))[0];
  return (
    <Card title="YouTube studio" icon="🎬" actions={<Link to="/youtube">Open →</Link>}>
      {(["MONEYVARK", "ZILVOREX"] as const).map((c) => { const m = ideas.filter((i) => i.channel === c); return <div key={c} className="row small" style={{ marginBottom: 4 }}><span className="strong" style={{ minWidth: 96 }}>{c}</span><Chip>{m.filter((i) => i.stage === "idea").length} ideas</Chip><Chip>{m.filter((i) => !["idea", "published"].includes(i.stage)).length} in production</Chip><Chip kind="ok">{m.filter((i) => i.stage === "published").length} published</Chip></div>; })}
      <p className="small muted" style={{ marginTop: 8 }}>{next ? `Next: “${next.title}” on ${format(new Date(next.publishDate + "T00:00:00"), "d MMM")}` : "Nothing scheduled."}</p>
    </Card>
  );
}
function ProjectWidget() {
  const projects = useLiveQuery(() => db.projects.toArray(), [], [] as Project[]);
  const items = useLiveQuery(() => db.projectItems.where("type").equals("milestone").toArray(), [], [] as ProjectItem[]);
  return (
    <Card title="College project" icon="🛠️" actions={<Link to="/projects">Open →</Link>}>
      {projects.length === 0 ? <p className="small muted">No project yet. Create your IoT Solar Microgrid workspace.</p> : projects.map((p) => { const m = items.filter((i) => i.projectId === p.id); const d = m.filter((i) => i.data.status === "done").length; return <div key={p.id} style={{ marginBottom: 10 }}><div className="row small"><span className="strong">{p.name}</span><div className="sp" />{d}/{m.length}</div><Bar label={`${p.name} milestones`} value={d} max={Math.max(m.length, 1)} /></div>; })}
    </Card>
  );
}
function HabitWidget({ habits, logs }: { habits: Habit[]; logs: HabitLog[] }) {
  const today = dayKey();
  const act = habits.filter((h) => !h.archived);
  return (
    <Card title="Habits" icon="🌱" actions={<Link to="/day?tab=habits">Manage →</Link>}>
      {act.length === 0 ? <p className="small muted">No habits yet.</p> : act.map((h) => { const on = logs.some((l) => l.id === `${h.id}:${today}`); return (
        <label key={h.id} className="check" style={{ display: "flex", padding: "5px 0" }}><input type="checkbox" checked={on} onChange={async () => { const id = `${h.id}:${today}`; if (on) await db.habitLogs.delete(id); else await db.habitLogs.put({ id, habitId: h.id, date: today }); }} /> <span aria-hidden="true">{h.icon}</span> <span className="grow">{h.name}</span><span className="tiny muted">🔥 {habitStreak(h.id, logs)}</span></label>
      ); })}
    </Card>
  );
}
function ScoreWidget({ tasks, score }: { tasks: Task[]; score: ReturnType<typeof productivityScore> }) {
  const days = Array.from({ length: 7 }, (_, i) => dayKey(subDays(new Date(), 6 - i)));
  return (
    <Card title="Productivity" icon="⚡">
      <div className="row"><Ring value={score.total} label={`Score ${score.total}`} /><div className="grow"><p className="strong">Score {score.total}/100</p><p className="small muted">{score.explain}</p></div></div>
      <div style={{ marginTop: 10 }}><BarChart height={90} data={days.map((d) => ({ label: format(new Date(d + "T00:00:00"), "EEEEE"), value: tasks.filter((t) => t.completedAt && dayKey(new Date(t.completedAt)) === d).length }))} /></div>
      <p className="tiny muted">Tasks completed, last 7 days. Score = 60% weighted tasks + 30% habits − overdue penalty.</p>
    </Card>
  );
}
function NotesWidget() {
  const toast = useToast();
  const [t, setT] = useState("");
  const recent = useLiveQuery(async () => (await db.notes.toArray()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 2), [], [] as Note[]);
  return (
    <Card title="Quick notes" icon="📝" actions={<Link to="/day?tab=notes">All →</Link>}>
      <form className="col" onSubmit={async (e) => { e.preventDefault(); if (!t.trim()) return; const now = new Date().toISOString(); await db.notes.add({ id: uid(), title: t.trim().split("\n")[0].slice(0, 60), body: t.trim(), tags: [], pinned: false, createdAt: now, updatedAt: now }); setT(""); toast("Note saved", "ok"); }}>
        <textarea aria-label="Quick note" style={{ minHeight: 70 }} placeholder="Capture a thought…" value={t} onChange={(e) => setT(e.target.value)} />
        <Btn sm kind="primary" type="submit" disabled={!t.trim()}>Save note</Btn>
      </form>
      {recent.map((n) => <p key={n.id} className="small muted" style={{ marginTop: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>• {n.title || n.body}</p>)}
    </Card>
  );
}
function AssistantWidget() {
  const [q, setQ] = useState("");
  return (
    <Card title="AI assistant" icon="✨">
      <form className="row nw" onSubmit={(e) => { e.preventDefault(); openAssistant(q.trim() || undefined); setQ(""); }}>
        <input type="text" aria-label="Ask the assistant" placeholder="Plan my day…" value={q} onChange={(e) => setQ(e.target.value)} /><Btn kind="primary" type="submit">Ask</Btn>
      </form>
      <div className="row" style={{ marginTop: 10 }}>{["Plan my day", "Show my overdue tasks", "Today's top 5 updates"].map((p) => <button key={p} className="chip" style={{ cursor: "pointer" }} onClick={() => openAssistant(p)}>{p}</button>)}</div>
    </Card>
  );
}
