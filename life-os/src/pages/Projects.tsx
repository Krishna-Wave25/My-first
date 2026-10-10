import { useMemo, useState, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format, subDays } from "date-fns";
import { db, uid } from "../db/db";
import type { Project, ProjectItem, ProjectItemType } from "../db/types";
import { Bar, Btn, Card, Chip, Empty, ExtLink, Field, Modal, Notice, Tabs, useConfirm, useTab, useToast } from "../components/ui";
import { lintConnection, lintSystem, worstLevel, type Connection } from "../lib/safety";
import { addTask } from "../lib/tasks";
import { download } from "../lib/backup";

type FieldDef = { key: string; label: string; type: "text" | "textarea" | "number" | "select" | "date" | "bool" | "url" | "code"; options?: string[]; hint?: string; required?: boolean };
interface SectionDef {
  type: ProjectItemType; tab: string; label: string; add: string; empty: string; fields: FieldDef[]; groupBy?: { key: string; order: string[] };
  title: (d: any) => string; summary: (d: any) => ReactNode; banner?: ReactNode;
}

const STATUS_CHIP = (s: string) => <Chip kind={["done", "pass", "verified", "confirmed", "resolved", "high"].includes(s) ? "ok" : ["fail", "unresolved"].includes(s) ? "danger" : ["doing", "drafting", "review", "bench-tested", "medium", "simulated"].includes(s) ? "warn" : ""}>{s}</Chip>;

const SECTIONS: SectionDef[] = [
  { type: "milestone", tab: "milestones", label: "Milestones", add: "Add milestone", empty: "No milestones yet. Break the project into dated steps.",
    fields: [{ key: "title", label: "Milestone", type: "text", required: true }, { key: "due", label: "Deadline", type: "date" }, { key: "status", label: "Status", type: "select", options: ["todo", "doing", "done"] }, { key: "notes", label: "Notes", type: "textarea" }],
    title: (d) => d.title, summary: (d) => <>{STATUS_CHIP(d.status ?? "todo")} {d.due && <Chip>📅 {format(new Date(d.due + "T00:00:00"), "d MMM yyyy")}</Chip>}</> },
  { type: "component", tab: "inventory", label: "Hardware", add: "Add component", empty: "No components listed. Record each part with the value from its datasheet.",
    groupBy: { key: "status", order: ["confirmed", "proposed"] },
    banner: <Notice kind="info"><strong>Confirmed</strong> = specification read from the datasheet or measured. <strong>Proposed</strong> = idea or assumption — do not rely on it until confirmed.</Notice>,
    fields: [{ key: "name", label: "Component", type: "text", required: true }, { key: "qty", label: "Quantity", type: "number" }, { key: "spec", label: "Specification (rated V / A / W, model)", type: "text" }, { key: "status", label: "Status", type: "select", options: ["confirmed", "proposed"] }, { key: "source", label: "Evidence (datasheet link, measurement)", type: "text" }, { key: "owned", label: "In hand", type: "bool" }, { key: "notes", label: "Notes", type: "textarea" }],
    title: (d) => d.name, summary: (d) => <>{STATUS_CHIP(d.status ?? "proposed")} {d.qty ? <Chip>× {d.qty}</Chip> : null} {d.owned ? <Chip kind="ok">in hand</Chip> : <Chip>to source</Chip>} {d.spec && <span className="small">{d.spec}</span>}</> },
  { type: "connection", tab: "wiring", label: "Wiring", add: "Add connection", empty: "No connections documented. Add each wire between components.",
    groupBy: { key: "status", order: ["confirmed", "proposed"] },
    fields: [{ key: "from", label: "From (component + terminal)", type: "text", required: true }, { key: "to", label: "To (component + pin/terminal)", type: "text", required: true }, { key: "signal", label: "Signal / net (5V, GND, A0, PWM…)", type: "text", required: true },
      { key: "voltage", label: "Voltage on this line (V)", type: "number" }, { key: "currentA", label: "Expected max current (A)", type: "number" }, { key: "wireAwg", label: "Wire gauge (AWG)", type: "number" }, { key: "fused", label: "Fuse / breaker in line", type: "bool" },
      { key: "status", label: "Status", type: "select", options: ["proposed", "confirmed"] }, { key: "verifiedBy", label: "How verified (multimeter, continuity, datasheet)", type: "text", hint: "Required before marking confirmed." }, { key: "notes", label: "Notes", type: "textarea" }],
    title: (d) => `${d.from} → ${d.to}`, summary: (d) => <>{STATUS_CHIP(d.status ?? "proposed")} <Chip>{d.signal}</Chip> {d.voltage != null && d.voltage !== "" && <Chip>{d.voltage} V</Chip>}</> },
  { type: "code", tab: "code", label: "Code", add: "Add code", empty: "No code stored. Keep Arduino sketches and MATLAB/Simulink notes with their test status.",
    fields: [{ key: "name", label: "File / model name", type: "text", required: true }, { key: "language", label: "Language", type: "select", options: ["Arduino C++", "MATLAB", "Simulink", "Python", "Other"] }, { key: "version", label: "Version", type: "text" }, { key: "status", label: "Status", type: "select", options: ["untested", "simulated", "bench-tested", "verified"] }, { key: "code", label: "Code / model notes", type: "code" }, { key: "notes", label: "Notes", type: "textarea" }],
    title: (d) => `${d.name}${d.version ? " · " + d.version : ""}`, summary: (d) => <>{STATUS_CHIP(d.status ?? "untested")} <Chip>{d.language}</Chip></> },
  { type: "test", tab: "tests", label: "Test results", add: "Record test", empty: "No measurements recorded. Log expected vs measured values with units and conditions.",
    fields: [{ key: "parameter", label: "Parameter", type: "text", required: true }, { key: "expected", label: "Expected", type: "number" }, { key: "measured", label: "Measured", type: "number" }, { key: "unit", label: "Unit", type: "text" }, { key: "date", label: "Date", type: "date" }, { key: "result", label: "Result", type: "select", options: ["pending", "pass", "fail"] }, { key: "conditions", label: "Conditions (irradiance, load, temperature…)", type: "text" }, { key: "notes", label: "Notes", type: "textarea" }],
    title: (d) => d.parameter, summary: (d) => { const e = Number(d.expected), m = Number(d.measured); const err = d.expected !== "" && d.expected != null && d.measured !== "" && d.measured != null && e !== 0 ? ((m - e) / e) * 100 : null; return <>{STATUS_CHIP(d.result ?? "pending")} <span className="mono">{d.measured ?? "—"} {d.unit}</span> <span className="muted small">expected {d.expected ?? "—"}</span>{err !== null && <Chip>{err >= 0 ? "+" : ""}{err.toFixed(1)}% error</Chip>}</>; } },
  { type: "log", tab: "troubleshoot", label: "Troubleshooting", add: "Log issue", empty: "No issues logged yet. Write down what failed, the cause and the fix — it becomes your viva material.",
    fields: [{ key: "date", label: "Date", type: "date" }, { key: "problem", label: "Problem / symptom", type: "textarea", required: true }, { key: "cause", label: "Cause (if known)", type: "textarea" }, { key: "fix", label: "Fix / next step", type: "textarea" }, { key: "resolved", label: "Resolved", type: "bool" }],
    title: (d) => String(d.problem ?? "").slice(0, 80), summary: (d) => <>{STATUS_CHIP(d.resolved ? "resolved" : "unresolved")} {d.date && <Chip>{d.date}</Chip>}</> },
  { type: "reference", tab: "refs", label: "References", add: "Add reference", empty: "No references. Save papers, datasheets and standards you rely on.",
    fields: [{ key: "title", label: "Title", type: "text", required: true }, { key: "url", label: "Link", type: "url" }, { key: "kind", label: "Type", type: "select", options: ["paper", "datasheet", "tutorial", "standard", "other"] }, { key: "notes", label: "Key takeaway", type: "textarea" }],
    title: (d) => d.title, summary: (d) => <><Chip>{d.kind ?? "other"}</Chip> {d.url && /^https?:\/\//.test(d.url) && <ExtLink href={d.url}>open ↗</ExtLink>}</> },
  { type: "viva", tab: "viva", label: "Viva", add: "Add question", empty: "No viva questions. Add what an examiner could ask, and your answer.",
    fields: [{ key: "question", label: "Question", type: "text", required: true }, { key: "answer", label: "Your answer", type: "textarea" }, { key: "confidence", label: "Confidence", type: "select", options: ["low", "medium", "high"] }],
    title: (d) => d.question, summary: (d) => <>{STATUS_CHIP(d.confidence ?? "low")} {!d.answer && <Chip kind="warn">no answer yet</Chip>}</> },
  { type: "document", tab: "docs", label: "Reports & slides", add: "Add document", empty: "No documents tracked. List the report, presentation and diagrams you must deliver.",
    fields: [{ key: "name", label: "Document", type: "text", required: true }, { key: "kind", label: "Type", type: "select", options: ["report", "presentation", "poster", "diagram", "other"] }, { key: "status", label: "Status", type: "select", options: ["not started", "drafting", "review", "done"] }, { key: "due", label: "Due", type: "date" }, { key: "notes", label: "Notes", type: "textarea" }],
    title: (d) => d.name, summary: (d) => <>{STATUS_CHIP(d.status === "not started" ? "todo" : d.status ?? "todo")} <Chip>{d.kind}</Chip></> },
];

const MICROGRID = {
  milestone: ["Finalize system architecture & block diagram", "Component list & procurement", "Sensor calibration (voltage/current) against a multimeter", "MPPT algorithm simulation in Simulink", "Firmware v1: measurement + logging", "Wiring plan reviewed by supervisor", "Low-voltage bench test", "Telemetry / dashboard integration", "Integration & fault tests", "Report draft", "Presentation", "Viva preparation"],
  document: [["Project report", "report"], ["Presentation", "presentation"], ["Circuit diagram", "diagram"], ["Test report", "report"]],
  viva: ["Explain the working principle of MPPT.", "Why did you choose your MPPT algorithm over the alternatives?", "How do you measure panel voltage and current, and how accurate is it?", "What protection is included (fuse, diode, over-voltage, reverse polarity)?", "How does the IoT telemetry work — protocol, broker, security?", "What are the limits of your system and how would you scale it?", "What safety precautions did you follow while building and testing?"],
};

async function createProject(name: string, description: string, template: Project["template"]) {
  const p: Project = { id: uid(), name, description, template, createdAt: new Date().toISOString() };
  await db.projects.add(p);
  if (template === "microgrid") {
    const now = new Date().toISOString();
    const mk = (type: ProjectItemType, data: any): ProjectItem => ({ id: uid(), projectId: p.id, type, data, createdAt: now, updatedAt: now });
    await db.projectItems.bulkAdd([
      ...MICROGRID.milestone.map((t) => mk("milestone", { title: t, status: "todo", due: "", notes: "" })),
      ...MICROGRID.document.map(([n, k]) => mk("document", { name: n, kind: k, status: "not started" })),
      ...MICROGRID.viva.map((q) => mk("viva", { question: q, answer: "", confidence: "low" })),
    ]);
  }
  return p;
}

export default function Projects() {
  const toast = useToast();
  const projects = useLiveQuery(() => db.projects.toArray(), [], undefined);
  const [sel, setSel] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", description: "", template: "microgrid" as Project["template"] });
  if (!projects) return null;
  const project = projects.find((p) => p.id === (sel ?? projects[0]?.id));
  return (
    <div>
      <div className="page-head"><h1>Projects</h1><p>Engineering workspaces: milestones, hardware, wiring (confirmed vs proposed, with safety flags), code, measurements, troubleshooting, references and viva prep.</p></div>
      <div className="row" style={{ marginBottom: 14 }}>
        {projects.map((p) => <button key={p.id} className={`chip ${p.id === project?.id ? "on" : ""}`} aria-pressed={p.id === project?.id} onClick={() => setSel(p.id)}>{p.name}</button>)}
        <Btn sm kind="primary" onClick={() => setAdding(true)}>+ New project</Btn>
      </div>
      {!project ? (
        <Empty icon="🛠️" title="No projects yet" action={<Btn kind="primary" onClick={() => setAdding(true)}>Create your first project</Btn>}>Start from the IoT Solar Microgrid template (milestones, documents and viva questions — no made-up data) or a blank workspace.</Empty>
      ) : <Workspace key={project.id} project={project} onDeleted={() => setSel(null)} />}
      {adding && (
        <Modal title="New project" onClose={() => setAdding(false)}>
          <form className="col" onSubmit={async (e) => { e.preventDefault(); const p = await createProject(f.name.trim(), f.description, f.template); setSel(p.id); setAdding(false); toast("Project created", "ok"); }}>
            <Field label="Name"><input type="text" data-autofocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="IoT Solar Microgrid Energy Management" required /></Field>
            <Field label="Description"><textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
            <Field label="Template"><select value={f.template} onChange={(e) => setF({ ...f, template: e.target.value as Project["template"] })}><option value="microgrid">IoT Solar Microgrid (milestones, documents, viva questions)</option><option value="blank">Blank workspace</option></select></Field>
            <div className="row" style={{ justifyContent: "flex-end" }}><Btn onClick={() => setAdding(false)}>Cancel</Btn><Btn kind="primary" type="submit" disabled={!f.name.trim()}>Create</Btn></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Workspace({ project, onDeleted }: { project: Project; onDeleted: () => void }) {
  const [tab, setTab] = useTab("overview", ["overview", ...SECTIONS.map((s) => s.tab)]);
  const { confirm, node } = useConfirm();
  const items = useLiveQuery(() => db.projectItems.where("projectId").equals(project.id).toArray(), [project.id], [] as ProjectItem[]);
  const count = (t: ProjectItemType) => items.filter((i) => i.type === t).length;
  return (
    <div className="col">
      <Card><div className="row"><div className="grow"><h2>{project.name}</h2><p className="small">{project.description}</p></div><Btn sm kind="danger" onClick={async () => { if (await confirm(`Delete project “${project.name}” and all its data?`)) { await db.projectItems.where("projectId").equals(project.id).delete(); await db.projects.delete(project.id); onDeleted(); } }}>Delete project</Btn></div></Card>
      <Tabs label="Project sections" value={tab} onChange={setTab} tabs={[{ id: "overview", label: "Overview" }, ...SECTIONS.map((s) => ({ id: s.tab, label: s.label, badge: count(s.type) }))]} />
      {tab === "overview" ? <Overview project={project} items={items} /> : <Section key={tab} project={project} def={SECTIONS.find((s) => s.tab === tab)!} items={items.filter((i) => i.type === SECTIONS.find((s) => s.tab === tab)!.type)} />}
      {node}
    </div>
  );
}

function Overview({ project, items }: { project: Project; items: ProjectItem[] }) {
  const ms = items.filter((i) => i.type === "milestone");
  const done = ms.filter((m) => m.data.status === "done").length;
  const conns = items.filter((i) => i.type === "connection").map((i) => i.data as Connection);
  const flags = conns.flatMap((c) => lintConnection(c));
  const danger = conns.filter((c) => worstLevel(lintConnection(c)) === "danger").length;
  const tests = items.filter((i) => i.type === "test");
  const viva = items.filter((i) => i.type === "viva");
  const nextMs = ms.filter((m) => m.data.status !== "done" && m.data.due).sort((a, b) => a.data.due.localeCompare(b.data.due))[0];
  const since = subDays(new Date(), 7).toISOString();
  const recent = items.filter((i) => i.updatedAt >= since);
  const md = useMemo(() => {
    const by = (t: ProjectItemType) => recent.filter((i) => i.type === t);
    const lines = [`# Weekly progress — ${project.name}`, `Week ending ${format(new Date(), "d MMM yyyy")}`, "",
      `- Milestones: ${done}/${ms.length} complete${by("milestone").length ? ` (${by("milestone").length} updated this week)` : ""}`,
      `- Tests recorded this week: ${by("test").length} (${by("test").filter((i) => i.data.result === "pass").length} pass, ${by("test").filter((i) => i.data.result === "fail").length} fail)`,
      `- Issues logged this week: ${by("log").length}; unresolved overall: ${items.filter((i) => i.type === "log" && !i.data.resolved).length}`,
      `- Wiring: ${conns.filter((c) => c.status === "confirmed").length} confirmed, ${conns.filter((c) => c.status !== "confirmed").length} proposed; ${danger} with safety warnings`,
      `- Viva: ${viva.filter((v) => v.data.answer).length}/${viva.length} questions answered`, "", "## Updated this week", ...recent.map((i) => `- ${i.type}: ${SECTIONS.find((s) => s.type === i.type)!.title(i.data)}`)];
    return lines.join("\n");
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="col">
      <div className="grid g4">
        <Card><div className="stat"><span className="v">{ms.length ? Math.round((done / ms.length) * 100) : 0}%</span><span className="l">{done}/{ms.length} milestones</span></div><div style={{ marginTop: 8 }}><Bar label="Milestones complete" value={done} max={Math.max(ms.length, 1)} /></div></Card>
        <Card><div className="stat"><span className="v" style={{ color: danger ? "var(--danger)" : undefined }}>{danger}</span><span className="l">connections with danger flags</span></div></Card>
        <Card><div className="stat"><span className="v">{tests.filter((t) => t.data.result === "pass").length}/{tests.length}</span><span className="l">tests passed</span></div></Card>
        <Card><div className="stat"><span className="v">{viva.filter((v) => v.data.answer).length}/{viva.length}</span><span className="l">viva answered</span></div></Card>
      </div>
      {nextMs && <Notice>Next deadline: <strong>{nextMs.data.title}</strong> on {format(new Date(nextMs.data.due + "T00:00:00"), "EEE d MMM yyyy")}</Notice>}
      {flags.some((f) => f.level === "danger") && <Notice kind="danger">Some documented connections have <strong>danger</strong> flags. Review the Wiring tab before powering anything.</Notice>}
      <Card title="Weekly progress summary" icon="🗒️" actions={<Btn sm onClick={() => download(`${project.name.replace(/\W+/g, "-")}-weekly.md`, md, "text/markdown")}>Export .md</Btn>}>
        <pre className="mono" style={{ whiteSpace: "pre-wrap", color: "var(--text-2)" }}>{md}</pre>
      </Card>
    </div>
  );
}

function Section({ project, def, items }: { project: Project; def: SectionDef; items: ProjectItem[] }) {
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const [edit, setEdit] = useState<ProjectItem | "new" | null>(null);
  const sysFlags = def.type === "connection" ? lintSystem(items.map((i) => i.data as Connection)) : [];
  const render = (i: ProjectItem) => {
    const flags = def.type === "connection" ? lintConnection(i.data as Connection) : [];
    return (
      <div key={i.id} className="mini" style={{ marginBottom: 8 }}>
        <div className="row nw" style={{ alignItems: "flex-start" }}>
          <div className="grow"><span className="strong">{def.title(i.data)}</span><div className="row" style={{ marginTop: 4 }}>{def.summary(i.data)}</div></div>
          {def.type === "milestone" && i.data.status !== "done" && <Btn sm kind="ghost" onClick={async () => { await addTask({ title: `${project.name}: ${i.data.title}`, category: "project", due: i.data.due ? new Date(i.data.due + "T00:00:00").toISOString() : null, hasTime: false, source: "plan" }); toast("Added to My Day", "ok"); }}>→ Task</Btn>}
          <Btn sm onClick={() => setEdit(i)}>Edit</Btn>
          <Btn sm kind="ghost" aria-label="Delete" onClick={async () => { if (await confirm("Delete this entry?")) await db.projectItems.delete(i.id); }}>✕</Btn>
        </div>
        {def.type === "code" && i.data.code && <pre className="mono" style={{ marginTop: 8, padding: 10, background: "var(--surface)", borderRadius: 10, overflow: "auto", maxHeight: 180 }}>{i.data.code}</pre>}
        {flags.map((f, k) => <p key={k} className={`small ${f.level === "danger" ? "flag-danger" : f.level === "warn" ? "flag-warn" : "muted"}`} style={{ marginTop: 4 }}>{f.level === "danger" ? "⛔" : f.level === "warn" ? "⚠️" : "ℹ️"} {f.message}</p>)}
        {i.data.notes && <p className="small muted" style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{i.data.notes}</p>}
        {def.type === "viva" && i.data.answer && <p className="small" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{i.data.answer}</p>}
        {def.type === "log" && <p className="small" style={{ marginTop: 4 }}>{i.data.cause && <><strong>Cause:</strong> {i.data.cause}<br /></>}{i.data.fix && <><strong>Fix:</strong> {i.data.fix}</>}</p>}
      </div>
    );
  };
  const sorted = [...items].sort((a, b) => (def.type === "milestone" ? String(a.data.due || "9999").localeCompare(String(b.data.due || "9999")) : b.updatedAt.localeCompare(a.updatedAt)));
  return (
    <div className="col">
      {def.type === "connection" && <Notice kind="warn"><strong>Safety:</strong> the checker only flags risks visible in your entries. A connection with no flags is <em>not</em> certified safe. Verify with a multimeter and datasheets, and get your supervisor to review before powering. Never work on mains or high-DC systems unsupervised.</Notice>}
      {def.banner}
      {sysFlags.map((f, i) => <Notice key={i} kind="warn">{f.message}</Notice>)}
      <div><Btn kind="primary" onClick={() => setEdit("new")}>+ {def.add}</Btn></div>
      {items.length === 0 ? <Empty icon="🗂️" title={`No ${def.label.toLowerCase()} yet`}>{def.empty}</Empty> : def.groupBy ? (
        def.groupBy.order.map((g) => { const list = sorted.filter((i) => (i.data[def.groupBy!.key] ?? def.groupBy!.order[def.groupBy!.order.length - 1]) === g); return <Card key={g} title={`${g[0].toUpperCase() + g.slice(1)} (${list.length})`}>{list.length ? list.map(render) : <p className="small muted">None.</p>}</Card>; })
      ) : <Card>{sorted.map(render)}</Card>}
      {edit && <ItemForm project={project} def={def} item={edit === "new" ? undefined : edit} onClose={() => setEdit(null)} />}
      {node}
    </div>
  );
}

function ItemForm({ project, def, item, onClose }: { project: Project; def: SectionDef; item?: ProjectItem; onClose: () => void }) {
  const toast = useToast();
  const [d, setD] = useState<Record<string, any>>(item?.data ?? Object.fromEntries(def.fields.map((f) => [f.key, f.type === "select" ? f.options![0] : f.type === "bool" ? false : ""])));
  const conn = def.type === "connection" ? lintConnection({ ...(d as any), voltage: d.voltage === "" ? null : Number(d.voltage), currentA: d.currentA === "" ? null : Number(d.currentA), wireAwg: d.wireAwg === "" ? null : Number(d.wireAwg) }) : [];
  const save = async () => {
    for (const f of def.fields) if (f.required && !String(d[f.key] ?? "").trim()) return toast(`${f.label} is required`, "err");
    if (def.type === "connection" && d.status === "confirmed" && !String(d.verifiedBy ?? "").trim()) return toast("Describe how it was verified before marking it confirmed", "err");
    const data = { ...d };
    for (const f of def.fields) if (f.type === "number") data[f.key] = d[f.key] === "" || d[f.key] == null ? "" : Number(d[f.key]);
    const now = new Date().toISOString();
    if (item) await db.projectItems.update(item.id, { data, updatedAt: now });
    else await db.projectItems.add({ id: uid(), projectId: project.id, type: def.type, data, createdAt: now, updatedAt: now });
    onClose();
  };
  return (
    <Modal title={item ? `Edit ${def.label.toLowerCase()}` : def.add} onClose={onClose} wide>
      <form className="col" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <div className="grid g2">
          {def.fields.map((f, idx) => {
            const v = d[f.key] ?? "";
            const set = (x: any) => setD({ ...d, [f.key]: x });
            const wide = f.type === "textarea" || f.type === "code";
            return (
              <div key={f.key} style={wide ? { gridColumn: "1 / -1" } : undefined}>
                {f.type === "bool" ? <label className="check" style={{ marginTop: 22 }}><input type="checkbox" checked={!!d[f.key]} onChange={(e) => set(e.target.checked)} /> {f.label}</label> : (
                  <Field label={f.label} hint={f.hint}>
                    {f.type === "select" ? <select value={v} onChange={(e) => set(e.target.value)}>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
                      : f.type === "textarea" ? <textarea value={v} onChange={(e) => set(e.target.value)} />
                      : f.type === "code" ? <textarea className="mono" style={{ minHeight: 200, fontFamily: "ui-monospace, monospace" }} spellCheck={false} value={v} onChange={(e) => set(e.target.value)} />
                      : <input type={f.type} data-autofocus={idx === 0 ? true : undefined} step={f.type === "number" ? "any" : undefined} value={v} onChange={(e) => set(e.target.value)} required={f.required} />}
                  </Field>
                )}
              </div>
            );
          })}
        </div>
        {conn.length > 0 && <div className="col">{conn.map((f, i) => <Notice key={i} kind={f.level === "danger" ? "danger" : f.level === "warn" ? "warn" : "info"}>{f.message}</Notice>)}</div>}
        <div className="row" style={{ justifyContent: "flex-end" }}><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" type="submit">Save</Btn></div>
      </form>
    </Modal>
  );
}
