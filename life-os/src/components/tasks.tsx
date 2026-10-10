import { useState } from "react";
import { db, uid } from "../db/db";
import { CATEGORIES, PRIORITIES, type Category, type Priority, type Recurrence, type Task } from "../db/types";
import { dayKey, fmtDue } from "../lib/dates";
import { parseTaskText } from "../lib/nlp";
import { describeRecurrence } from "../lib/recurrence";
import { useSettings } from "../lib/settings";
import { addTask, bucketOf, completeTask, deleteTask, postponeTask, reopenTask, toggleSubtask } from "../lib/tasks";
import { Btn, Chip, Field, Modal, useConfirm, useToast } from "./ui";

export const catColor = (c: Category) => CATEGORIES.find((x) => x.id === c)!.color;
export const catLabel = (c: Category) => CATEGORIES.find((x) => x.id === c)!.label;

/* ---------- quick add with natural language ---------- */
export function QuickAdd({ defaults, placeholder }: { defaults?: Partial<Task>; placeholder?: string }) {
  const s = useSettings();
  const toast = useToast();
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<Partial<Task> | null>(null);
  const draft = text.trim() ? parseTaskText(text, new Date(), s.defaultReminderMin) : null;

  const toPartial = (): Partial<Task> & { title: string } => ({
    ...defaults, title: draft!.title, category: defaults?.category ?? draft!.category, priority: draft!.priority, due: draft!.due, hasTime: draft!.hasTime,
    durationMin: draft!.durationMin, reminderMin: draft!.reminderMin, recurrence: draft!.recurrence, source: "nl",
  });
  const submit = async () => {
    if (!draft) return;
    const t = await addTask(toPartial());
    setText("");
    toast(`Added “${t.title}”${t.due ? " · " + fmtDue(t.due, t.hasTime) : ""}`, "ok");
  };
  return (
    <div>
      <form className="row nw" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <input type="text" aria-label="Quick add task in plain English" value={text} onChange={(e) => setText(e.target.value)}
          placeholder={placeholder ?? "e.g. Fri 5pm submit lab record, high priority"} autoComplete="off" />
        <Btn kind="primary" type="submit" disabled={!draft}>Add</Btn>
        <Btn type="button" disabled={!draft} onClick={() => draft && setEditing(toPartial())} aria-label="Add with details">⋯</Btn>
      </form>
      {draft && (
        <div className="parse-preview" aria-live="polite">
          <Chip tint={catColor(draft.category)}>{catLabel(draft.category)}</Chip>
          <Chip kind={draft.priority === "critical" ? "danger" : draft.priority === "high" ? "warn" : draft.priority === "low" ? "" : "info"}>{draft.priority}</Chip>
          {draft.due && <Chip>📅 {fmtDue(draft.due, draft.hasTime)}</Chip>}
          {draft.durationMin && <Chip>⏱ {draft.durationMin} min</Chip>}
          {draft.recurrence && <Chip>🔁 {describeRecurrence(draft.recurrence)}</Chip>}
          {draft.reminderMin !== null && <Chip>🔔 {draft.reminderMin} min before</Chip>}
          <span className="tiny muted" style={{ alignSelf: "center" }}>→ “{draft.title}”</span>
        </div>
      )}
      {editing && <TaskEditor initial={editing} onClose={() => { setEditing(null); setText(""); }} />}
    </div>
  );
}

/* ---------- editor ---------- */
const WEEK = ["S", "M", "T", "W", "T", "F", "S"];
export function TaskEditor({ task, initial, onClose }: { task?: Task; initial?: Partial<Task>; onClose: () => void }) {
  const s = useSettings();
  const toast = useToast();
  const base = task ?? ({ title: "", notes: "", category: "personal", priority: "medium", due: null, hasTime: false, durationMin: null, reminderMin: null, recurrence: null, subtasks: [], tags: [], ...initial } as Task);
  const [f, setF] = useState<Task>({ ...(base as Task) });
  const dueD = f.due ? new Date(f.due) : null;
  const [date, setDate] = useState(dueD ? dayKey(dueD) : "");
  const [time, setTime] = useState(dueD && f.hasTime ? `${String(dueD.getHours()).padStart(2, "0")}:${String(dueD.getMinutes()).padStart(2, "0")}` : "");
  const [tags, setTags] = useState((f.tags ?? []).join(", "));
  const [sub, setSub] = useState("");
  const set = <K extends keyof Task>(k: K, v: Task[K]) => setF((x) => ({ ...x, [k]: v }));
  const rec = f.recurrence;
  const setRec = (patch: Partial<Recurrence> | null) => set("recurrence", patch === null ? null : ({ freq: "daily", interval: 1, ...(rec ?? {}), ...patch } as Recurrence));

  const save = async () => {
    if (!f.title.trim()) return toast("Give the task a title", "err");
    let due: string | null = null;
    if (date) {
      const [y, m, d] = date.split("-").map(Number);
      const [hh, mm] = time ? time.split(":").map(Number) : [0, 0];
      due = new Date(y, m - 1, d, hh, mm).toISOString();
    }
    const hasTime = !!date && !!time;
    const patch: Partial<Task> = {
      title: f.title.trim(), notes: f.notes, category: f.category, priority: f.priority, due, hasTime, durationMin: f.durationMin || null,
      reminderMin: hasTime ? f.reminderMin : null, recurrence: due ? f.recurrence : null, subtasks: f.subtasks,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    if (task) await db.tasks.update(task.id, patch);
    else await addTask({ ...initial, ...patch, title: patch.title! });
    toast(task ? "Task updated" : "Task added", "ok");
    onClose();
  };

  return (
    <Modal title={task ? "Edit task" : "New task"} onClose={onClose} wide>
      <form className="col" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Field label="Title"><input type="text" data-autofocus value={f.title} onChange={(e) => set("title", e.target.value)} required /></Field>
        <div className="grid g2">
          <Field label="Category"><select value={f.category} onChange={(e) => set("category", e.target.value as Category)}>{CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
          <Field label="Priority"><select value={f.priority} onChange={(e) => set("priority", e.target.value as Priority)}>{PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></Field>
          <Field label="Due date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Time (optional)"><input type="time" value={time} onChange={(e) => setTime(e.target.value)} disabled={!date} /></Field>
          <Field label="Duration (minutes)" hint="With a time + duration, the task is treated as a fixed event in your plan."><input type="number" min={5} step={5} value={f.durationMin ?? ""} onChange={(e) => set("durationMin", e.target.value ? Number(e.target.value) : null)} /></Field>
          <Field label="Reminder" hint={!time ? "All-day tasks remind you at 9:00 on the day." : undefined}>
            <select value={f.reminderMin ?? ""} disabled={!time} onChange={(e) => set("reminderMin", e.target.value === "" ? null : Number(e.target.value))}>
              <option value="">None</option><option value={0}>At due time</option><option value={5}>5 min before</option><option value={15}>15 min before</option><option value={30}>30 min before</option><option value={60}>1 hour before</option><option value={1440}>1 day before</option>
            </select>
          </Field>
        </div>
        <fieldset style={{ border: 0 }}>
          <legend className="label">Repeat</legend>
          <div className="row">
            <select aria-label="Repeat frequency" style={{ width: 160 }} value={rec?.freq ?? ""} disabled={!date} onChange={(e) => setRec(e.target.value ? { freq: e.target.value as Recurrence["freq"] } : null)}>
              <option value="">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </select>
            {rec && <><span className="small">every</span><input type="number" aria-label="Repeat interval" min={1} style={{ width: 76 }} value={rec.interval} onChange={(e) => setRec({ interval: Math.max(1, Number(e.target.value) || 1) })} /></>}
            {rec?.freq === "weekly" && WEEK.map((d, i) => (
              <button type="button" key={i} className={`chip ${rec.byDay?.includes(i) ? "tint" : ""}`} aria-pressed={!!rec.byDay?.includes(i)} aria-label={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i]}
                onClick={() => { const cur = new Set(rec.byDay ?? []); cur.has(i) ? cur.delete(i) : cur.add(i); setRec({ byDay: [...cur].sort() }); }}>{d}</button>
            ))}
          </div>
        </fieldset>
        <Field label="Notes"><textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        <Field label="Tags (comma separated)"><input type="text" value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
        <div>
          <span className="label">Subtasks / steps</span>
          {f.subtasks.map((st) => (
            <div key={st.id} className="row nw" style={{ marginBottom: 6 }}>
              <input type="checkbox" aria-label={`Done: ${st.title}`} checked={st.done} onChange={() => set("subtasks", f.subtasks.map((x) => (x.id === st.id ? { ...x, done: !x.done } : x)))} />
              <span className="grow">{st.title}</span>
              <Btn sm kind="ghost" aria-label={`Remove ${st.title}`} onClick={() => set("subtasks", f.subtasks.filter((x) => x.id !== st.id))}>✕</Btn>
            </div>
          ))}
          <div className="row nw">
            <input type="text" aria-label="New subtask" placeholder="Add a step…" value={sub} onChange={(e) => setSub(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (sub.trim()) { set("subtasks", [...f.subtasks, { id: uid(), title: sub.trim(), done: false }]); setSub(""); } } }} />
            <Btn sm onClick={() => { if (sub.trim()) { set("subtasks", [...f.subtasks, { id: uid(), title: sub.trim(), done: false }]); setSub(""); } }}>Add step</Btn>
          </div>
        </div>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" type="submit">{task ? "Save" : "Add task"}</Btn>
        </div>
      </form>
      <span className="sr-only">{s.timezone}</span>
    </Modal>
  );
}

/* ---------- row ---------- */
export function TaskRow({ t, compact }: { t: Task; compact?: boolean }) {
  const [edit, setEdit] = useState(false);
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const bucket = bucketOf(t);
  const done = t.status === "done";
  const doneSubs = t.subtasks.filter((x) => x.done).length;
  return (
    <div className={`task ${done ? "done" : ""}`}>
      <input type="checkbox" checked={done} aria-label={`${done ? "Reopen" : "Complete"}: ${t.title}`} style={{ marginTop: 3 }}
        onChange={async () => {
          if (done) await reopenTask(t.id);
          else { const next = await completeTask(t.id); toast(next ? `Done — next: ${fmtDue(next.due, next.hasTime)}` : "Done ✓", "ok"); }
        }} />
      <div className="grow">
        <div className="row nw" style={{ alignItems: "flex-start" }}>
          <span className="cat-dot" style={{ ["--cat" as any]: catColor(t.category), marginTop: 8 }} aria-hidden="true" />
          <button className="t-title" style={{ background: "none", border: 0, textAlign: "left", cursor: "pointer", padding: 0, font: "inherit", color: "inherit" }} onClick={() => setOpen(!open)} aria-expanded={open}>{t.title}</button>
        </div>
        <div className="meta">
          {bucket === "overdue" && <Chip kind="danger">Overdue</Chip>}
          {t.due && <Chip kind={bucket === "overdue" ? "danger" : ""}>📅 {fmtDue(t.due, t.hasTime)}</Chip>}
          <Chip className={`prio-${t.priority}`} tint={t.priority === "critical" ? "var(--danger)" : t.priority === "high" ? "var(--warn)" : undefined}>{t.priority}</Chip>
          {!compact && <Chip tint={catColor(t.category)}>{catLabel(t.category)}</Chip>}
          {t.durationMin && <Chip>⏱ {t.durationMin}m</Chip>}
          {t.recurrence && <Chip>🔁 {describeRecurrence(t.recurrence)}</Chip>}
          {t.subtasks.length > 0 && <Chip>☑ {doneSubs}/{t.subtasks.length}</Chip>}
          {t.postponedCount > 1 && <Chip kind="warn">postponed ×{t.postponedCount}</Chip>}
          {t.tags.map((g) => <Chip key={g}>#{g}</Chip>)}
        </div>
        {open && (
          <div className="fade-in" style={{ marginTop: 10 }}>
            {t.notes && <p className="small" style={{ whiteSpace: "pre-wrap", marginBottom: 8 }}>{t.notes}</p>}
            {t.subtasks.map((st) => (
              <label key={st.id} className="check small" style={{ display: "flex", marginBottom: 4 }}>
                <input type="checkbox" checked={st.done} onChange={() => toggleSubtask(t.id, st.id)} /> <span style={{ textDecoration: st.done ? "line-through" : "none" }}>{st.title}</span>
              </label>
            ))}
            <div className="row" style={{ marginTop: 8 }}>
              <Btn sm onClick={() => setEdit(true)}>Edit</Btn>
              {!done && <Btn sm onClick={async () => { await postponeTask(t.id, 1); toast("Moved to the next day"); }}>Postpone 1 day</Btn>}
              <Btn sm kind="danger" onClick={async () => { if (await confirm(`Delete “${t.title}”?`)) { await deleteTask(t.id); toast("Task deleted"); } }}>Delete</Btn>
            </div>
          </div>
        )}
      </div>
      {edit && <TaskEditor task={t} onClose={() => setEdit(false)} />}
      {node}
    </div>
  );
}
