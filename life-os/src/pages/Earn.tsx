import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { addDays, format } from "date-fns";
import { db, uid } from "../db/db";
import type { OppStatus, TrackedOpportunity } from "../db/types";
import { ESTIMATE_NOTE, PLAYBOOKS, type Playbook } from "../content/opportunities";
import { Btn, Card, Chip, Empty, ExtLink, Field, Modal, Notice, Tabs, useConfirm, useTab, useToast } from "../components/ui";
import { inr, dayKey } from "../lib/dates";
import { addTask } from "../lib/tasks";

export const STATUSES: { id: OppStatus; label: string }[] = [
  { id: "saved", label: "Saved" }, { id: "researching", label: "Researching" }, { id: "in_progress", label: "In progress" },
  { id: "applied", label: "Applied" }, { id: "earned", label: "Earned" }, { id: "rejected", label: "Rejected" },
];
const KIND_LABEL: Record<TrackedOpportunity["kind"], string> = { earn: "Earning idea", job: "Job", internship: "Internship", scholarship: "Scholarship", certification: "Certification", other: "Other" };

export default function Earn() {
  const [tab, setTab] = useTab("ideas", ["ideas", "tracker", "first"]);
  return (
    <div>
      <div className="page-head"><h1>Earn Money</h1><p>Legitimate, skill-based income paths for a student — with the risks stated up front. No guaranteed-income promises, no invented listings.</p></div>
      <Notice kind="warn">{ESTIMATE_NOTE}</Notice>
      <div style={{ height: 14 }} />
      <Tabs label="Earn sections" value={tab} onChange={setTab} tabs={[{ id: "ideas", label: "Opportunities" }, { id: "tracker", label: "Tracker" }, { id: "first", label: "First ₹1,000 plan" }]} />
      {tab === "ideas" && <Ideas />}
      {tab === "tracker" && <Tracker kinds={["earn", "job", "internship", "scholarship", "certification", "other"]} />}
      {tab === "first" && <FirstPlan />}
    </div>
  );
}

function Ideas() {
  const [group, setGroup] = useState("");
  const [diff, setDiff] = useState("");
  const [comp, setComp] = useState("");
  const [free, setFree] = useState(false);
  const [open, setOpen] = useState<Playbook | null>(null);
  const tracked = useLiveQuery(() => db.opportunities.toArray(), [], [] as TrackedOpportunity[]);
  const toast = useToast();
  const groups = [...new Set(PLAYBOOKS.map((p) => p.group))];
  const list = PLAYBOOKS.filter((p) => (!group || p.group === group) && (!diff || p.difficulty === diff) && (!comp || p.competition === comp) && (!free || p.startCost.startsWith("₹0")));
  const pick = useMemo(() => { const easy = PLAYBOOKS.filter((p) => p.startCost.startsWith("₹0") && p.difficulty !== "Hard"); return easy[Math.floor(Date.now() / 86400000) % easy.length]; }, []);
  const track = async (p: Playbook) => {
    if (tracked.some((t) => t.playbookId === p.id)) return toast("Already in your tracker");
    const now = new Date().toISOString();
    await db.opportunities.add({ id: uid(), name: p.name, kind: p.group === "Career" ? "internship" : "earn", status: "saved", url: p.platforms[0]?.url ?? "", deadline: null, notes: "", amount: null, playbookId: p.id, createdAt: now, updatedAt: now });
    toast("Saved to your tracker", "ok");
  };
  return (
    <div className="col">
      <Card title="Today's suggested first action" icon="🎯" className="flat">
        <p className="strong">{pick.name}</p><p className="small">{pick.firstAction.title} · ~{pick.firstAction.minutes} min</p>
        <div className="row" style={{ marginTop: 8 }}>
          <Btn sm kind="primary" onClick={async () => { await addTask({ title: pick.firstAction.title, durationMin: pick.firstAction.minutes, category: "career", due: new Date().toISOString(), hasTime: false, source: "saved" }); toast("Added to today's tasks", "ok"); }}>Add to today</Btn>
          <Btn sm onClick={() => setOpen(pick)}>See the full plan</Btn>
        </div>
      </Card>
      <div className="row">
        <select aria-label="Category" style={{ width: 160 }} value={group} onChange={(e) => setGroup(e.target.value)}><option value="">All categories</option>{groups.map((g) => <option key={g}>{g}</option>)}</select>
        <select aria-label="Difficulty" style={{ width: 150 }} value={diff} onChange={(e) => setDiff(e.target.value)}><option value="">Any difficulty</option><option>Easy</option><option>Medium</option><option>Hard</option></select>
        <select aria-label="Competition" style={{ width: 160 }} value={comp} onChange={(e) => setComp(e.target.value)}><option value="">Any competition</option><option>Low</option><option>Medium</option><option>High</option></select>
        <label className="check"><input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} /> ₹0 to start</label>
      </div>
      <div className="grid auto">
        {list.map((p) => (
          <Card key={p.id} title={p.name}>
            <p className="small">{p.summary}</p>
            <div className="row" style={{ margin: "10px 0" }}>
              <Chip>{p.group}</Chip><Chip kind={p.difficulty === "Hard" ? "danger" : p.difficulty === "Medium" ? "warn" : "ok"}>{p.difficulty}</Chip><Chip>Competition: {p.competition}</Chip>
            </div>
            <p className="tiny muted"><strong>Start cost:</strong> {p.startCost}</p>
            <div className="row" style={{ marginTop: 10 }}><Btn sm onClick={() => setOpen(p)}>Details & plan</Btn><Btn sm kind="ghost" onClick={() => track(p)}>{tracked.some((t) => t.playbookId === p.id) ? "✓ Tracked" : "+ Track"}</Btn></div>
          </Card>
        ))}
      </div>
      {list.length === 0 && <Empty icon="🔎" title="No opportunities match these filters" />}
      {open && <PlaybookModal p={open} onClose={() => setOpen(null)} onTrack={() => track(open)} />}
    </div>
  );
}

function PlaybookModal({ p, onClose, onTrack }: { p: Playbook; onClose: () => void; onTrack: () => void }) {
  const toast = useToast();
  const { confirm, node } = useConfirm();
  return (
    <Modal title={p.name} onClose={onClose} wide>
      <div className="col">
        <Notice kind="warn">Revenue estimate: {p.revenueEstimate}. <span className="muted">Revenue ≠ profit; not guaranteed.</span></Notice>
        <dl className="dl">
          <dt>How it works</dt><dd>{p.how}</dd>
          <dt>Skills needed</dt><dd>{p.skills.join(" · ")}</dd>
          <dt>Starting cost</dt><dd>{p.startCost}</dd>
          <dt>Time to first income</dt><dd>{p.timeToFirstIncome} <span className="muted">(estimate)</span></dd>
          <dt>Difficulty / competition</dt><dd>{p.difficulty} / {p.competition}</dd>
        </dl>
        <div><span className="label">Risks & limitations</span><ul style={{ paddingLeft: 18 }}>{p.risks.map((r) => <li key={r}>{r}</li>)}</ul></div>
        <div><span className="label">Free learning resources</span><ul style={{ paddingLeft: 18 }}>{p.free.map((r) => <li key={r.url}><ExtLink href={r.url}>{r.label}</ExtLink></li>)}</ul></div>
        <div><span className="label">Platforms & links (verify terms before signing up)</span><ul style={{ paddingLeft: 18 }}>{p.platforms.map((r) => <li key={r.url}><ExtLink href={r.url}>{r.label}</ExtLink></li>)}</ul></div>
        <div><span className="label">Step-by-step plan</span><ol style={{ paddingLeft: 20 }}>{p.steps.map((s) => <li key={s}>{s}</li>)}</ol></div>
        <Card className="flat" title="Do this today" icon="⚡"><p>{p.firstAction.title} <span className="muted">(~{p.firstAction.minutes} min)</span></p></Card>
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <Btn onClick={onTrack}>+ Track</Btn>
          <Btn onClick={async () => { if (await confirm(`Create ${p.steps.length} tasks from this plan, one per day starting today?`, false)) { for (let i = 0; i < p.steps.length; i++) await addTask({ title: `${p.name}: ${p.steps[i]}`, category: "career", due: addDays(new Date(), i).toISOString(), hasTime: false, source: "plan" }); toast("Plan added to your tasks", "ok"); } }}>Turn plan into tasks</Btn>
          <Btn kind="primary" onClick={async () => { await addTask({ title: p.firstAction.title, durationMin: p.firstAction.minutes, category: "career", due: new Date().toISOString(), hasTime: false, source: "plan" }); toast("First action added to today", "ok"); onClose(); }}>Add first action to today</Btn>
        </div>
      </div>
      {node}
    </Modal>
  );
}

export function Tracker({ kinds, title }: { kinds: TrackedOpportunity["kind"][]; title?: string }) {
  const items = useLiveQuery(() => db.opportunities.toArray(), [], [] as TrackedOpportunity[]);
  const [edit, setEdit] = useState<TrackedOpportunity | "new" | null>(null);
  const mine = items.filter((i) => kinds.includes(i.kind));
  const earned = mine.filter((i) => i.status === "earned").reduce((a, i) => a + (i.amount ?? 0), 0);
  return (
    <div className="col">
      <div className="row"><Btn kind="primary" onClick={() => setEdit("new")}>+ Add {title ?? "opportunity"}</Btn><div className="sp" />{earned > 0 && <Chip kind="ok" title="Entered by you; revenue, not profit">Recorded earnings: {inr(earned)}</Chip>}</div>
      {mine.length === 0 ? <Empty icon="📋" title="Your tracker is empty">Save opportunities from the list, or add one you found yourself. Always record the official link and deadline.</Empty> : (
        <div className="board">
          {STATUSES.map((st) => {
            const col = mine.filter((i) => i.status === st.id);
            return (
              <section key={st.id} aria-label={st.label}>
                <h4>{st.label} <span className="muted">({col.length})</span></h4>
                {col.map((o) => {
                  const days = o.deadline ? Math.ceil((new Date(o.deadline + "T23:59:59").getTime() - Date.now()) / 86400000) : null;
                  return (
                    <button key={o.id} className="mini" style={{ textAlign: "left", cursor: "pointer", color: "inherit" }} onClick={() => setEdit(o)}>
                      <div className="strong">{o.name}</div>
                      <div className="row" style={{ marginTop: 4 }}>
                        <Chip>{KIND_LABEL[o.kind]}</Chip>
                        {days !== null && <Chip kind={days < 0 ? "danger" : days <= 3 ? "warn" : ""}>{days < 0 ? "deadline passed" : days === 0 ? "due today" : `${days} d left`}</Chip>}
                        {o.amount ? <Chip kind="ok">{inr(o.amount)}</Chip> : null}
                        {o.meta && (o.meta.verified ? <Chip kind="ok">✓ verified</Chip> : <Chip kind="warn">unverified</Chip>)}
                      </div>
                    </button>
                  );
                })}
              </section>
            );
          })}
        </div>
      )}
      {edit && <OppModal opp={edit === "new" ? undefined : edit} kinds={kinds} onClose={() => setEdit(null)} />}
    </div>
  );
}

export function OppModal({ opp, kinds, onClose, preset }: { opp?: TrackedOpportunity; kinds: TrackedOpportunity["kind"][]; onClose: () => void; preset?: Partial<TrackedOpportunity> }) {
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const [f, setF] = useState<TrackedOpportunity>(opp ?? { id: uid(), name: "", kind: kinds[0], status: "saved", url: "", deadline: null, notes: "", amount: null, playbookId: null, createdAt: new Date().toISOString(), updatedAt: "", ...preset });
  const [meta, setMeta] = useState(f.meta ?? { eligibility: "", location: "", stipend: "", verified: false });
  const needsMeta = ["job", "internship", "scholarship", "certification"].includes(f.kind);
  const urlOk = !f.url || /^https?:\/\//.test(f.url);
  const save = async () => {
    if (!f.name.trim()) return toast("Name is required", "err");
    if (!urlOk) return toast("URL must start with http:// or https://", "err");
    const rec = { ...f, name: f.name.trim(), meta: needsMeta ? meta : undefined, updatedAt: new Date().toISOString() };
    await db.opportunities.put(rec);
    if (!opp && rec.deadline) await addTask({ title: `Deadline: ${rec.name}`, due: new Date(rec.deadline + "T00:00:00").toISOString(), hasTime: false, category: "career", priority: "high", source: "saved" });
    toast("Saved", "ok"); onClose();
  };
  return (
    <Modal title={opp ? "Edit opportunity" : "New opportunity"} onClose={onClose} wide>
      <form className="col" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <div className="grid g2">
          <Field label="Name"><input type="text" data-autofocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
          <Field label="Type"><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as TrackedOpportunity["kind"] })}>{(["earn", "job", "internship", "scholarship", "certification", "other"] as const).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></Field>
          <Field label="Status"><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as OppStatus })}>{STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></Field>
          <Field label="Application deadline" hint="Only enter a date you read on the official page."><input type="date" value={f.deadline ?? ""} onChange={(e) => setF({ ...f, deadline: e.target.value || null })} /></Field>
          <Field label="Official URL"><input type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://…" /></Field>
          {(f.status === "earned" || f.amount) && <Field label="Amount earned so far (₹, revenue)"><input type="number" min={0} value={f.amount ?? ""} onChange={(e) => setF({ ...f, amount: e.target.value ? Number(e.target.value) : null })} /></Field>}
        </div>
        {needsMeta && (
          <Card className="flat" title="Verification (from the official posting)">
            <div className="grid g2">
              <Field label="Eligibility"><input type="text" value={meta.eligibility} onChange={(e) => setMeta({ ...meta, eligibility: e.target.value })} /></Field>
              <Field label="Location / mode"><input type="text" value={meta.location} onChange={(e) => setMeta({ ...meta, location: e.target.value })} /></Field>
              <Field label="Stipend / salary / amount"><input type="text" value={meta.stipend} onChange={(e) => setMeta({ ...meta, stipend: e.target.value })} /></Field>
              <label className="check" style={{ alignSelf: "end" }}><input type="checkbox" checked={meta.verified} onChange={(e) => setMeta({ ...meta, verified: e.target.checked })} /> I checked this on the official site (and nothing asked me to pay a fee)</label>
            </div>
          </Card>
        )}
        <Field label="Notes"><textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        <div className="row">
          {opp && <Btn kind="danger" onClick={async () => { if (await confirm("Delete this opportunity?")) { await db.opportunities.delete(opp.id); onClose(); } }}>Delete</Btn>}
          {f.url && urlOk && <ExtLink href={f.url}>Open official page ↗</ExtLink>}
          <div className="sp" /><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" type="submit">Save</Btn>
        </div>
        {!opp && f.deadline && <p className="tiny muted">A “Deadline: …” task will also be created.</p>}
      </form>
      {node}
    </Modal>
  );
}

const WEEK_PLAN = [
  "Choose one skill you can already do (writing, editing, coding, tutoring, design) and one type of client.",
  "Create 2 small portfolio samples (or reuse college work) and put them in one shareable place.",
  "Write a 3-line offer: who you help, what you deliver, how long it takes, price.",
  "Message 5 people you know or local businesses with the offer. No spam — personalised and brief.",
  "Join one legitimate platform (see the Opportunities tab) and complete your profile honestly.",
  "Send 5 more tailored messages/proposals. Follow up on day-1 messages politely.",
  "Review what happened. Improve the offer. Do not pay anyone to “guarantee” work.",
];
function FirstPlan() {
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const best = ["tutoring", "video-editing", "content-writing", "freelance-web"].map((id) => PLAYBOOKS.find((p) => p.id === id)!);
  return (
    <div className="col">
      <Notice>Nobody can promise you ₹1,000 in a given time. Realistically, a first rupee comes from someone who already trusts you — a friend's family, a local business, a junior who needs tutoring. This 7-day plan maximises your chances of finding out quickly.</Notice>
      <Card title="Best-fit starting points for a student (₹0 to start)">{best.map((p) => <div key={p.id} className="row nw" style={{ marginBottom: 8 }}><span className="grow"><span className="strong">{p.name}</span><div className="tiny muted">{p.timeToFirstIncome}</div></span><Chip kind={p.difficulty === "Easy" ? "ok" : "warn"}>{p.difficulty}</Chip></div>)}</Card>
      <Card title="7-day action plan" actions={<Btn kind="primary" sm onClick={async () => { if (await confirm("Create 7 tasks, one per day starting today?", false)) { for (let i = 0; i < 7; i++) await addTask({ title: `First ₹1,000 · Day ${i + 1}: ${WEEK_PLAN[i]}`, category: "career", due: addDays(new Date(), i).toISOString(), hasTime: false, source: "plan" }); toast("7-day plan added to My Day", "ok"); } }}>Add to my tasks</Btn>}>
        <ol style={{ paddingLeft: 20 }}>{WEEK_PLAN.map((s, i) => <li key={i} style={{ marginBottom: 6 }}>{s} <span className="tiny muted">({format(addDays(new Date(), i), "EEE d MMM")})</span></li>)}</ol>
      </Card>
      <Card title="Avoid scams" icon="🛑"><ul style={{ paddingLeft: 18 }}><li>Never pay a “registration”, “security” or “training” fee to get a job or internship.</li><li>Be wary of “guaranteed” daily income, copy-paste jobs, crypto doubling and “investment” groups on messaging apps.</li><li>Never share OTPs, card details or your bank PIN. Real clients pay you; you don't pay them.</li><li>Report fraud at <ExtLink href="https://cybercrime.gov.in/">cybercrime.gov.in</ExtLink>.</li></ul></Card>
      <span className="sr-only">{dayKey()}</span>{node}
    </div>
  );
}
