import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { addDays, addMonths, endOfMonth, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { db, uid } from "../db/db";
import type { Article, Bookmark, Habit, Note, Task } from "../db/types";
import { Btn, Card, Chip, Empty, Field, Modal, Notice, Tabs, useConfirm, useTab, useToast, Bar } from "../components/ui";
import { QuickAdd, TaskEditor, TaskRow, catColor } from "../components/tasks";
import { dayKey, fmtDue, parseDayKey, startOfDay } from "../lib/dates";
import { suggestPlan, findConflicts } from "../lib/scheduler";
import { bucketOf, compareTasks, addTask, postponeTask } from "../lib/tasks";
import { habitStreak, productivityScore } from "../lib/score";
import { useSettings } from "../lib/settings";
import { download } from "../lib/backup";

const TABS = ["today", "upcoming", "overdue", "completed", "calendar", "plan", "habits", "notes", "saved", "review"];

export default function MyDay() {
  const [tab, setTab] = useTab("today", TABS);
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [] as Task[]);
  const now = new Date();
  const counts = useMemo(() => ({
    overdue: tasks.filter((t) => bucketOf(t, now) === "overdue").length,
    today: tasks.filter((t) => bucketOf(t, now) === "today").length,
  }), [tasks]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div>
      <div className="page-head"><h1>My Day</h1><p>Tasks, schedule, habits, notes and your end-of-day review — all in one place.</p></div>
      <Tabs label="My Day sections" value={tab} onChange={setTab} tabs={[
        { id: "today", label: "Today", badge: counts.today }, { id: "upcoming", label: "Upcoming" }, { id: "overdue", label: "Overdue", badge: counts.overdue },
        { id: "completed", label: "Completed" }, { id: "calendar", label: "Calendar" }, { id: "plan", label: "Plan" }, { id: "habits", label: "Habits" },
        { id: "notes", label: "Notes" }, { id: "saved", label: "Saved" }, { id: "review", label: "Review" },
      ]} />
      {tab === "today" && <TodayTab tasks={tasks} />}
      {tab === "upcoming" && <UpcomingTab tasks={tasks} />}
      {tab === "overdue" && <OverdueTab tasks={tasks} />}
      {tab === "completed" && <CompletedTab tasks={tasks} />}
      {tab === "calendar" && <CalendarTab tasks={tasks} />}
      {tab === "plan" && <PlanTab tasks={tasks} />}
      {tab === "habits" && <HabitsTab />}
      {tab === "notes" && <NotesTab />}
      {tab === "saved" && <SavedTab />}
      {tab === "review" && <ReviewTab tasks={tasks} />}
    </div>
  );
}

function TodayTab({ tasks }: { tasks: Task[] }) {
  const now = new Date();
  const today = tasks.filter((t) => bucketOf(t, now) === "today").sort(compareTasks);
  const overdue = tasks.filter((t) => bucketOf(t, now) === "overdue");
  const nodate = tasks.filter((t) => bucketOf(t, now) === "nodate").sort(compareTasks);
  const doneToday = tasks.filter((t) => t.completedAt && dayKey(new Date(t.completedAt)) === dayKey(now));
  const conflicts = findConflicts(tasks).filter((c) => dayKey(new Date(c.a.due!)) === dayKey(now));
  const [, setTab] = useTab("today");
  return (
    <div className="col">
      <Card><QuickAdd /></Card>
      {overdue.length > 0 && <Notice kind="warn">{overdue.length} overdue task{overdue.length > 1 ? "s" : ""}. <button className="chip" onClick={() => setTab("overdue")}>Review overdue</button></Notice>}
      {conflicts.length > 0 && <Notice kind="danger">Scheduling conflict: “{conflicts[0].a.title}” overlaps “{conflicts[0].b.title}”.</Notice>}
      <Card title={`Today · ${format(now, "EEE d MMM")}`} icon="📅" actions={<Chip kind="ok">{doneToday.length} done</Chip>}>
        {today.length === 0 ? <Empty icon="🌤️" title="Nothing due today">Add a task above, or pull something forward from Upcoming.</Empty> : today.map((t) => <TaskRow key={t.id} t={t} />)}
      </Card>
      {nodate.length > 0 && <Card title="No date" icon="🗂️">{nodate.map((t) => <TaskRow key={t.id} t={t} />)}</Card>}
    </div>
  );
}

function UpcomingTab({ tasks }: { tasks: Task[] }) {
  const up = tasks.filter((t) => bucketOf(t) === "upcoming").sort(compareTasks);
  const groups = new Map<string, Task[]>();
  up.forEach((t) => { const k = dayKey(new Date(t.due!)); groups.set(k, [...(groups.get(k) ?? []), t]); });
  if (!up.length) return <Empty icon="🗓️" title="Nothing scheduled ahead">Use Quick add on the Today tab — e.g. “Friday 5pm submit lab record”.</Empty>;
  return <div className="col">{[...groups.entries()].map(([k, list]) => <Card key={k} title={format(parseDayKey(k), "EEEE, d MMM")}>{list.map((t) => <TaskRow key={t.id} t={t} />)}</Card>)}</div>;
}

function OverdueTab({ tasks }: { tasks: Task[] }) {
  const toast = useToast();
  const over = tasks.filter((t) => bucketOf(t) === "overdue").sort(compareTasks);
  if (!over.length) return <Empty icon="🎉" title="No overdue work">You're caught up.</Empty>;
  return (
    <Card title={`${over.length} overdue`} icon="⚠️" actions={<Btn sm onClick={async () => { for (const t of over) { const d = startOfDay(new Date()); const nd = t.hasTime ? new Date(t.due!) : d; if (t.hasTime) { nd.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); if (nd < new Date()) nd.setTime(Date.now() + 3600000); } await db.tasks.update(t.id, { due: nd.toISOString(), postponedCount: t.postponedCount + 1 }); } toast(`Moved ${over.length} to today`, "ok"); }}>Move all to today</Btn>}>
      {over.map((t) => <TaskRow key={t.id} t={t} />)}
    </Card>
  );
}

function CompletedTab({ tasks }: { tasks: Task[] }) {
  const done = tasks.filter((t) => t.status === "done").sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));
  if (!done.length) return <Empty icon="✔️" title="Nothing completed yet">Completed tasks appear here.</Empty>;
  return <Card title={`${done.length} completed`}>{done.slice(0, 100).map((t) => <TaskRow key={t.id} t={t} />)}</Card>;
}

function CalendarTab({ tasks }: { tasks: Task[] }) {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [sel, setSel] = useState(dayKey());
  const [adding, setAdding] = useState(false);
  const start = startOfWeek(month);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const byDay = useMemo(() => { const m = new Map<string, Task[]>(); tasks.forEach((t) => { if (t.due && t.status === "todo") { const k = dayKey(new Date(t.due)); m.set(k, [...(m.get(k) ?? []), t]); } }); return m; }, [tasks]);
  const selTasks = tasks.filter((t) => t.due && dayKey(new Date(t.due)) === sel).sort(compareTasks);
  return (
    <div className="grid g2" style={{ gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)" }}>
      <Card title={format(month, "MMMM yyyy")} actions={<><Btn sm aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>‹</Btn><Btn sm onClick={() => { setMonth(startOfMonth(new Date())); setSel(dayKey()); }}>Today</Btn><Btn sm aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}>›</Btn></>}>
        <div className="cal" role="grid" aria-label="Calendar">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="dow" role="columnheader">{d}</div>)}
          {days.map((d) => {
            const k = dayKey(d); const list = byDay.get(k) ?? [];
            const over = list.some((t) => bucketOf(t) === "overdue");
            return (
              <button key={k} role="gridcell" className={`${isSameMonth(d, month) ? "" : "out"} ${k === dayKey() ? "today" : ""} ${k === sel ? "sel" : ""}`} aria-label={`${format(d, "EEEE d MMMM")}, ${list.length} open tasks`} aria-pressed={k === sel} onClick={() => setSel(k)}>
                <span>{d.getDate()}</span>
                <span className="dots">{list.slice(0, 3).map((t, i) => <i key={i} className={over ? "over" : ""} style={{ background: over ? undefined : catColor(t.category) }} />)}</span>
              </button>
            );
          })}
        </div>
        <p className="tiny muted" style={{ marginTop: 8 }}>{endOfMonth(month).getDate()} days · dots show open tasks, red = overdue</p>
      </Card>
      <Card title={format(parseDayKey(sel), "EEE d MMM")} actions={<Btn sm kind="primary" onClick={() => setAdding(true)}>+ Task</Btn>}>
        {selTasks.length ? selTasks.map((t) => <TaskRow key={t.id} t={t} compact />) : <Empty icon="🗓️" title="Free day">No tasks on this date.</Empty>}
      </Card>
      {adding && <TaskEditor initial={{ due: new Date(parseDayKey(sel)).toISOString() }} onClose={() => setAdding(false)} />}
    </div>
  );
}

function PlanTab({ tasks }: { tasks: Task[] }) {
  const s = useSettings();
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const [offset, setOffset] = useState(0);
  const day = addDays(new Date(), offset);
  const plan = useMemo(() => suggestPlan(tasks, day, s.workStart, s.workEnd), [tasks, offset, s.workStart, s.workEnd]); // eslint-disable-line react-hooks/exhaustive-deps
  const apply = async () => {
    if (!(await confirm(`Set start times on ${plan.blocks.filter((b) => b.kind === "flex").length} task(s) as shown? You can still edit them.`, false))) return;
    for (const b of plan.blocks.filter((x) => x.kind === "flex")) {
      await db.tasks.update(b.taskId, { due: b.start.toISOString(), hasTime: true, durationMin: Math.round((b.end.getTime() - b.start.getTime()) / 60000), reminderMin: s.defaultReminderMin });
    }
    toast("Plan applied — tasks now have start times", "ok");
  };
  return (
    <div className="col">
      <div className="row">
        <Chip>{`Work window ${s.workStart}–${s.workEnd}`}</Chip>
        <div className="sp" />
        <Btn sm className={offset === 0 ? "primary" : ""} onClick={() => setOffset(0)}>Today</Btn>
        <Btn sm className={offset === 1 ? "primary" : ""} onClick={() => setOffset(1)}>Tomorrow</Btn>
      </div>
      {plan.notes.map((n, i) => <Notice key={i} kind="warn">{n}</Notice>)}
      <Card title={`Suggested schedule · ${format(day, "EEE d MMM")}`} icon="🧭" actions={<><Chip>{plan.plannedMinutes} min planned</Chip><Chip>{plan.freeMinutes} min free</Chip></>}>
        {plan.blocks.length === 0 ? <Empty icon="🌿" title="Nothing to schedule">Add tasks with deadlines or high priority and I'll fit them around your fixed events.</Empty> : (
          <div className="tl">
            {plan.blocks.map((b) => (
              <div className="tl-item" key={b.taskId}>
                <div className="tl-time">{format(b.start, "h:mm a")}<br />{format(b.end, "h:mm a")}</div>
                <div className={`tl-body ${b.kind} ${plan.atRisk.includes(b) ? "risk" : ""}`}>
                  <span className="strong">{b.title}</span>
                  <div className="row" style={{ marginTop: 4 }}>
                    <Chip>{b.kind === "fixed" ? "fixed event" : "suggested"}</Chip>
                    {b.deadline && <Chip kind={plan.atRisk.includes(b) ? "danger" : ""}>deadline {format(b.deadline, "h:mm a")}</Chip>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {plan.blocks.some((b) => b.kind === "flex") && <div className="row" style={{ marginTop: 14 }}><Btn kind="primary" onClick={apply}>Apply suggested times</Btn><span className="tiny muted">Changes your tasks; nothing is applied until you confirm.</span></div>}
      </Card>
      {plan.conflicts.length > 0 && <Card title="Conflicts" icon="⚠️">{plan.conflicts.map((c, i) => <p key={i} className="small">“{c.a.title}” ({format(c.a.start, "h:mm a")}) overlaps “{c.b.title}” ({format(c.b.start, "h:mm a")}).</p>)}</Card>}
      {plan.unscheduled.length > 0 && (
        <Card title="Didn't fit" icon="📦">
          {plan.unscheduled.map((t) => <div key={t.id} className="row nw" style={{ marginBottom: 6 }}><span className="grow">{t.title}</span><Btn sm onClick={() => postponeTask(t.id, 1)}>Postpone</Btn></div>)}
        </Card>
      )}
      {node}
    </div>
  );
}

function HabitsTab() {
  const habits = useLiveQuery(() => db.habits.toArray(), [], [] as Habit[]).filter((h) => !h.archived);
  const logs = useLiveQuery(() => db.habitLogs.toArray(), [], []);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💧");
  const today = dayKey();
  const last7 = Array.from({ length: 7 }, (_, i) => dayKey(addDays(new Date(), i - 6)));
  const toggle = async (h: Habit, date: string) => {
    const id = `${h.id}:${date}`;
    if (logs.some((l) => l.id === id)) await db.habitLogs.delete(id); else await db.habitLogs.put({ id, habitId: h.id, date });
  };
  return (
    <div className="col">
      <Card title="New habit"><form className="row nw" onSubmit={async (e) => { e.preventDefault(); if (!name.trim()) return; await db.habits.add({ id: uid(), name: name.trim(), icon, createdAt: new Date().toISOString(), archived: false }); setName(""); }}>
        <input type="text" aria-label="Emoji" value={icon} onChange={(e) => setIcon(e.target.value)} style={{ width: 64, textAlign: "center" }} maxLength={4} />
        <input type="text" aria-label="Habit name" placeholder="e.g. 30 min study, workout, read" value={name} onChange={(e) => setName(e.target.value)} />
        <Btn kind="primary" type="submit" disabled={!name.trim()}>Add</Btn>
      </form></Card>
      {habits.length === 0 ? <Empty icon="🌱" title="No habits yet">Start with one small daily habit you can do in under 10 minutes.</Empty> : (
        <Card title="This week">
          {habits.map((h) => (
            <div key={h.id} className="row nw" style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <span aria-hidden="true" style={{ fontSize: 20 }}>{h.icon}</span>
              <div className="grow"><span className="strong">{h.name}</span><div className="tiny muted">🔥 {habitStreak(h.id, logs)} day streak</div></div>
              <div className="row nw" style={{ gap: 4 }}>
                {last7.map((d) => { const on = logs.some((l) => l.id === `${h.id}:${d}`); return (
                  <button key={d} className="chip" aria-pressed={on} aria-label={`${h.name} on ${d}${on ? ", done" : ""}`} onClick={() => toggle(h, d)} style={{ minWidth: 34, minHeight: 34, justifyContent: "center", background: on ? "var(--accent)" : undefined, color: on ? "var(--accent-ink)" : undefined, outline: d === today ? "2px solid var(--accent-2)" : undefined }}>{format(parseDayKey(d), "EEEEE")}</button>
                ); })}
              </div>
              <Btn sm kind="ghost" aria-label={`Archive ${h.name}`} onClick={() => db.habits.update(h.id, { archived: true })}>🗄</Btn>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function NotesTab() {
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const notes = useLiveQuery(() => db.notes.toArray(), [], [] as Note[]);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Note | "new" | null>(null);
  const shown = notes.filter((n) => !q || `${n.title} ${n.body} ${n.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  return (
    <div className="col">
      <div className="row nw"><input type="search" aria-label="Search notes" placeholder="Search notes or #tags" value={q} onChange={(e) => setQ(e.target.value.replace(/^#/, ""))} /><Btn kind="primary" onClick={() => setEdit("new")}>+ Note</Btn></div>
      {shown.length === 0 ? <Empty icon="📝" title={q ? "No matching notes" : "No notes yet"}>Capture ideas, insights and meeting notes. Tag them to find them later.</Empty> : (
        <div className="grid auto">{shown.map((n) => (
          <Card key={n.id} title={<>{n.pinned && "📌 "}{n.title || "Untitled"}</>} actions={<Btn sm kind="ghost" onClick={() => setEdit(n)}>Edit</Btn>}>
            <p className="small" style={{ whiteSpace: "pre-wrap", maxHeight: 120, overflow: "hidden" }}>{n.body}</p>
            <div className="row" style={{ marginTop: 8 }}>{n.tags.map((t) => <Chip key={t}>#{t}</Chip>)}<span className="tiny muted">{format(new Date(n.updatedAt), "d MMM")}</span></div>
            <div className="row" style={{ marginTop: 8 }}>
              <Btn sm onClick={async () => { await addTask({ title: n.title || n.body.slice(0, 60), notes: n.body, source: "saved" }); toast("Converted to a task", "ok"); }}>→ Task</Btn>
              <Btn sm kind="danger" onClick={async () => { if (await confirm("Delete this note?")) await db.notes.delete(n.id); }}>Delete</Btn>
            </div>
          </Card>
        ))}</div>
      )}
      {edit && <NoteEditor note={edit === "new" ? undefined : edit} onClose={() => setEdit(null)} />}
      {node}
    </div>
  );
}
function NoteEditor({ note, onClose }: { note?: Note; onClose: () => void }) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [body, setBody] = useState(note?.body ?? "");
  const [tags, setTags] = useState((note?.tags ?? []).join(", "));
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const save = async () => {
    const now = new Date().toISOString();
    const data = { title, body, tags: tags.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean), pinned, updatedAt: now };
    if (note) await db.notes.update(note.id, data); else await db.notes.add({ id: uid(), createdAt: now, ...data });
    onClose();
  };
  return (
    <Modal title={note ? "Edit note" : "New note"} onClose={onClose}>
      <form className="col" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Field label="Title"><input type="text" data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Note"><textarea style={{ minHeight: 160 }} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        <Field label="Tags (comma separated)"><input type="text" value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
        <label className="check"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to top</label>
        <div className="row" style={{ justifyContent: "flex-end" }}><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" type="submit" disabled={!title.trim() && !body.trim()}>Save</Btn></div>
      </form>
    </Modal>
  );
}

function SavedTab() {
  const toast = useToast();
  const marks = useLiveQuery(() => db.bookmarks.toArray(), [], [] as Bookmark[]);
  const arts = useLiveQuery(() => db.articles.where("saved").equals(1 as any).toArray().catch(() => db.articles.filter((a) => a.saved).toArray()), [], [] as Article[]);
  const [adding, setAdding] = useState(false);
  const [tag, setTag] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const allTags = [...new Set([...marks.flatMap((m) => m.tags), ...arts.flatMap((a) => a.tags)])];
  const items = [
    ...marks.map((m) => ({ id: m.id, kind: "bookmark" as const, title: m.title, url: m.url, note: m.note, tags: m.tags, at: m.createdAt, meta: "Bookmark" })),
    ...arts.map((a) => ({ id: a.id, kind: "article" as const, title: a.title, url: a.url, note: a.note, tags: a.tags, at: a.fetchedAt, meta: `${a.source}${a.publishedAt ? " · " + format(new Date(a.publishedAt), "d MMM yyyy") : ""}` })),
  ].filter((i) => !tag || i.tags.includes(tag)).sort((a, b) => b.at.localeCompare(a.at));
  const exportPicked = () => {
    const sel = items.filter((i) => picked.has(i.id));
    download("lifeos-saved.md", sel.map((i) => `## ${i.title}\n${i.url}\n${i.meta}\n${i.note ? "\n" + i.note + "\n" : ""}${i.tags.length ? "\nTags: " + i.tags.join(", ") : ""}\n`).join("\n"), "text/markdown");
  };
  return (
    <div className="col">
      <div className="row"><Btn kind="primary" onClick={() => setAdding(true)}>+ Bookmark</Btn><Btn disabled={!picked.size} onClick={exportPicked}>Export selected ({picked.size})</Btn>
        <div className="sp" />{allTags.map((t) => <button key={t} className={`chip ${tag === t ? "on" : ""}`} onClick={() => setTag(tag === t ? "" : t)}>#{t}</button>)}</div>
      {items.length === 0 ? <Empty icon="🔖" title="Nothing saved yet">Save articles from News / Technology, or bookmark tools and websites here.</Empty> : (
        <Card>{items.map((i) => (
          <div key={i.id} className="task">
            <input type="checkbox" aria-label={`Select ${i.title}`} checked={picked.has(i.id)} onChange={(e) => { const n = new Set(picked); e.target.checked ? n.add(i.id) : n.delete(i.id); setPicked(n); }} />
            <div className="grow"><a href={i.url} target="_blank" rel="noopener noreferrer" className="t-title strong">{i.title}</a>
              <div className="meta"><Chip>{i.meta}</Chip>{i.tags.map((t) => <Chip key={t}>#{t}</Chip>)}</div>{i.note && <p className="small" style={{ marginTop: 6 }}>{i.note}</p>}
              <div className="row" style={{ marginTop: 6 }}>
                <Btn sm onClick={async () => { await addTask({ title: `Read: ${i.title}`, notes: i.url, category: "career", source: "saved" }); toast("Converted to a task", "ok"); }}>→ Task</Btn>
                <Btn sm kind="ghost" onClick={async () => { if (i.kind === "bookmark") await db.bookmarks.delete(i.id); else await db.articles.update(i.id, { saved: false }); }}>Remove</Btn>
              </div></div>
          </div>
        ))}</Card>
      )}
      {adding && <BookmarkForm onClose={() => setAdding(false)} />}
    </div>
  );
}
function BookmarkForm({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ title: "", url: "https://", note: "", tags: "" });
  const valid = /^https?:\/\/.+\..+/.test(f.url) && f.title.trim();
  return (
    <Modal title="Add bookmark" onClose={onClose}>
      <form className="col" onSubmit={async (e) => { e.preventDefault(); await db.bookmarks.add({ id: uid(), title: f.title.trim(), url: f.url.trim(), note: f.note, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean), createdAt: new Date().toISOString() }); onClose(); }}>
        <Field label="Title"><input type="text" data-autofocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="URL"><input type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></Field>
        <Field label="Note"><textarea value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        <Field label="Tags (comma separated)"><input type="text" value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></Field>
        <div className="row" style={{ justifyContent: "flex-end" }}><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" type="submit" disabled={!valid}>Save</Btn></div>
      </form>
    </Modal>
  );
}

function ReviewTab({ tasks }: { tasks: Task[] }) {
  const s = useSettings();
  const toast = useToast();
  const habits = useLiveQuery(() => db.habits.toArray(), [], []);
  const logs = useLiveQuery(() => db.habitLogs.toArray(), [], []);
  const reviews = useLiveQuery(() => db.reviews.orderBy("id").reverse().toArray(), [], []);
  const today = dayKey();
  const saved = reviews.find((r) => r.id === today);
  const [text, setText] = useState<string | null>(null);
  const val = text ?? saved?.reflection ?? "";
  const now = new Date();
  const done = tasks.filter((t) => t.completedAt && dayKey(new Date(t.completedAt)) === today);
  const left = tasks.filter((t) => t.status === "todo" && (bucketOf(t, now) === "today" || bucketOf(t, now) === "overdue"));
  const score = productivityScore(tasks, habits, logs);
  const tomorrow = addDays(now, 1);
  const plan = suggestPlan(tasks.filter((t) => !left.some((l) => l.id === t.id)), tomorrow, s.workStart, s.workEnd);
  const prompts = "Wins today:\nWhat blocked me:\nOne thing to do differently tomorrow:";
  return (
    <div className="grid g2" style={{ alignItems: "start" }}>
      <div className="col">
        <Card title="Today in review" icon="🌙" actions={<Chip kind={score.total >= 70 ? "ok" : score.total >= 40 ? "warn" : "danger"}>Score {score.total}</Chip>}>
          <p className="small muted">{score.explain}</p>
          <h4 style={{ margin: "12px 0 6px" }}>Completed ({done.length})</h4>
          {done.length ? done.map((t) => <div key={t.id} className="small">✓ {t.title}</div>) : <p className="small muted">Nothing completed yet.</p>}
          <h4 style={{ margin: "12px 0 6px" }}>Still open ({left.length})</h4>
          {left.map((t) => <div key={t.id} className="row nw small"><span className="grow">{t.title} <span className="muted">· {fmtDue(t.due, t.hasTime)}</span></span><Btn sm onClick={() => postponeTask(t.id, 1)}>→ Tomorrow</Btn></div>)}
          {left.length > 1 && <Btn sm style={{ marginTop: 10 }} onClick={async () => { for (const t of left) await postponeTask(t.id, 1); toast(`Moved ${left.length} tasks to tomorrow`, "ok"); }}>Move all to tomorrow</Btn>}
          <hr className="sep" />
          <Field label="Reflection"><textarea style={{ minHeight: 130 }} placeholder={prompts} value={val} onChange={(e) => setText(e.target.value)} /></Field>
          <Btn kind="primary" style={{ marginTop: 10 }} onClick={async () => { await db.reviews.put({ id: today, reflection: val, createdAt: new Date().toISOString() }); toast("Review saved", "ok"); }}>Save review</Btn>
        </Card>
        {reviews.length > 0 && <Card title="Past reviews">{reviews.slice(0, 7).map((r) => <details key={r.id}><summary className="small strong" style={{ cursor: "pointer", padding: "6px 0" }}>{format(parseDayKey(r.id), "EEE d MMM")}</summary><p className="small" style={{ whiteSpace: "pre-wrap" }}>{r.reflection || "(empty)"}</p></details>)}</Card>}
      </div>
      <Card title={`Tomorrow · ${format(tomorrow, "EEE d MMM")}`} icon="☀️">
        {plan.notes.map((n, i) => <Notice key={i} kind="warn">{n}</Notice>)}
        {plan.blocks.length ? (
          <div className="tl" style={{ marginTop: 10 }}>{plan.blocks.map((b) => <div className="tl-item" key={b.taskId}><div className="tl-time">{format(b.start, "h:mm a")}</div><div className={`tl-body ${b.kind}`}>{b.title}</div></div>)}</div>
        ) : <Empty icon="🌅" title="Tomorrow is open">Add tasks to plan it. Unfinished work you move over will appear here.</Empty>}
        <div style={{ marginTop: 12 }}><Bar label="Planned working minutes" value={plan.plannedMinutes} max={Math.max(plan.plannedMinutes + plan.freeMinutes, 1)} /><p className="tiny muted" style={{ marginTop: 4 }}>{plan.plannedMinutes} of {plan.plannedMinutes + plan.freeMinutes} working minutes planned</p></div>
      </Card>
    </div>
  );
}
