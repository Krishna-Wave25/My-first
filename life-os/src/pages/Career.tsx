import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { addDays, format } from "date-fns";
import { db, getKV, setKV, uid } from "../db/db";
import type { LearningLog, RoadmapProgress, TrackedOpportunity } from "../db/types";
import { COMMUNICATION_TIPS, GD_TOPICS, INTERVIEW, ROADMAPS } from "../content/career";
import { OFFICIAL_PORTALS } from "../content/opportunities";
import { analyzeResume } from "../lib/ats";
import { dayKey } from "../lib/dates";
import { addTask } from "../lib/tasks";
import { Bar, BarChart, Btn, Card, Chip, Empty, ExtLink, Field, Notice, Ring, Tabs, useTab, useToast } from "../components/ui";
import { OppModal, Tracker } from "./Earn";

export default function Career() {
  const [tab, setTab] = useTab("opps", ["opps", "resume", "interview", "roadmaps", "learning"]);
  return (
    <div>
      <div className="page-head"><h1>Career & Learning</h1><p>Find real opportunities on official portals, sharpen your resume and interviews, and follow a skill roadmap.</p></div>
      <Tabs label="Career sections" value={tab} onChange={setTab} tabs={[{ id: "opps", label: "Opportunities" }, { id: "resume", label: "Resume & ATS" }, { id: "interview", label: "Interview prep" }, { id: "roadmaps", label: "Skill roadmaps" }, { id: "learning", label: "Daily learning" }]} />
      {tab === "opps" && <Opps />}
      {tab === "resume" && <Resume />}
      {tab === "interview" && <Interview />}
      {tab === "roadmaps" && <Roadmaps />}
      {tab === "learning" && <Learning />}
    </div>
  );
}

const KIND_FOR: Record<string, TrackedOpportunity["kind"]> = { Internships: "internship", Scholarships: "scholarship", Certifications: "certification", Programmes: "other", Exams: "other" };
function Opps() {
  const [preset, setPreset] = useState<Partial<TrackedOpportunity> | null>(null);
  return (
    <div className="col">
      <Notice kind="info">This app does not list individual job or internship postings, because it can't verify them. Use the official portals below, then track the real posting here with its eligibility, location, stipend, deadline and official link — and tick “verified” only after you've checked the employer's own page. Legitimate employers never charge application fees.</Notice>
      <div className="grid auto">
        {Object.entries(OFFICIAL_PORTALS).map(([group, list]) => (
          <Card key={group} title={group}>
            {list.map((p) => (
              <div key={p.url} style={{ marginBottom: 12 }}>
                <div className="row nw"><ExtLink href={p.url}>{p.name} ↗</ExtLink><div className="sp" /><Btn sm kind="ghost" onClick={() => setPreset({ name: "", kind: KIND_FOR[group], url: p.url })}>Track</Btn></div>
                <p className="tiny muted">{p.what}</p>
              </div>
            ))}
          </Card>
        ))}
      </div>
      <h2>My applications & saved opportunities</h2>
      <Tracker kinds={["job", "internship", "scholarship", "certification"]} title="opportunity" />
      {preset && <OppModal kinds={["internship", "job", "scholarship", "certification", "other"]} preset={preset} onClose={() => setPreset(null)} />}
    </div>
  );
}

function Resume() {
  const saved = useLiveQuery(() => getKV<{ resume: string; jd: string }>("resumeDraft", { resume: "", jd: "" }), [], undefined);
  const [resume, setResume] = useState<string | null>(null);
  const [jd, setJd] = useState<string | null>(null);
  const r = resume ?? saved?.resume ?? "";
  const j = jd ?? saved?.jd ?? "";
  const rep = useMemo(() => (r.trim() && j.trim() ? analyzeResume(r, j) : null), [r, j]);
  return (
    <div className="grid g2" style={{ alignItems: "start" }}>
      <div className="col">
        <Field label="Your resume (paste plain text)"><textarea style={{ minHeight: 200 }} value={r} onChange={(e) => setResume(e.target.value)} onBlur={() => setKV("resumeDraft", { resume: r, jd: j })} /></Field>
        <Field label="Job / internship description"><textarea style={{ minHeight: 160 }} value={j} onChange={(e) => setJd(e.target.value)} onBlur={() => setKV("resumeDraft", { resume: r, jd: j })} /></Field>
        <p className="tiny muted">Stored only on this device. This checker is a keyword/structure heuristic — real ATS systems differ.</p>
      </div>
      <div className="col">
        {!rep ? <Empty icon="📄" title="Paste both to analyse">You'll see keyword coverage, what's missing, and structure checks.</Empty> : (
          <>
            <Card title="ATS match" actions={<Chip kind={rep.score >= 70 ? "ok" : rep.score >= 50 ? "warn" : "danger"}>{rep.score >= 70 ? "Strong" : rep.score >= 50 ? "Decent" : "Needs work"}</Chip>}>
              <div className="row"><Ring value={rep.score} label={`ATS match ${rep.score} percent`} /><p className="small grow">65% keyword coverage of the description, 35% resume structure.</p></div>
            </Card>
            <Card title={`Missing keywords (${rep.missing.length})`}>{rep.missing.length ? <div className="row">{rep.missing.slice(0, 20).map((k) => <Chip key={k} kind="warn">{k}</Chip>)}</div> : <p className="small">Nothing important missing.</p>}<p className="tiny muted" style={{ marginTop: 8 }}>Add a keyword only if it's true for you — mention it with evidence from a project.</p></Card>
            <Card title={`Matched (${rep.matched.length})`}><div className="row">{rep.matched.map((k) => <Chip key={k} kind="ok">{k}</Chip>)}</div></Card>
            <Card title="Structure checks">{rep.checks.map((c) => <p key={c.label} className="small" style={{ marginBottom: 6 }}>{c.pass ? "✅" : "⚠️"} <span className="strong">{c.label}</span>{!c.pass && <span className="muted"> — {c.tip}</span>}</p>)}</Card>
          </>
        )}
      </div>
    </div>
  );
}

function Interview() {
  const topics = [...new Set(INTERVIEW.map((q) => q.topic))];
  const [topic, setTopic] = useState("");
  const pool = INTERVIEW.filter((q) => !topic || q.topic === topic);
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const [ans, setAns] = useState("");
  const [gd, setGd] = useState(0);
  const log = useLiveQuery(() => getKV<Record<string, number[]>>("interviewLog", {}), [], {} as Record<string, number[]>);
  const q = pool[i % Math.max(pool.length, 1)];
  const rate = async (n: number) => { await setKV("interviewLog", { ...log, [q.q]: [...(log[q.q] ?? []), n] }); setShow(false); setAns(""); setI(i + 1); };
  const practised = Object.keys(log).length;
  return (
    <div className="col">
      <div className="row">
        <select aria-label="Topic" style={{ width: 240 }} value={topic} onChange={(e) => { setTopic(e.target.value); setI(0); setShow(false); }}><option value="">All topics</option>{topics.map((t) => <option key={t}>{t}</option>)}</select>
        <Chip>{practised}/{INTERVIEW.length} practised</Chip>
      </div>
      {q && <Card title={q.topic} actions={<Btn sm onClick={() => { setI(i + 1); setShow(false); setAns(""); }}>Skip →</Btn>}>
        <p className="strong" style={{ fontSize: 17 }}>{q.q}</p>
        <Field label="Your answer (practise out loud, then write key points)"><textarea value={ans} onChange={(e) => setAns(e.target.value)} /></Field>
        {!show ? <Btn style={{ marginTop: 10 }} onClick={() => setShow(true)}>Show answer hints</Btn> : <>
          <Notice kind="info"><strong>Hints:</strong> {q.hint}</Notice>
          <p className="small" style={{ margin: "10px 0 6px" }}>How well did you do?</p>
          <div className="row">{[1, 2, 3, 4, 5].map((n) => <Btn key={n} sm onClick={() => rate(n)} aria-label={`Rate ${n} out of 5`}>{n}</Btn>)}</div></>}
        {log[q.q] && <p className="tiny muted" style={{ marginTop: 8 }}>Past self-ratings: {log[q.q].join(", ")}</p>}
      </Card>}
      <div className="grid g2">
        <Card title="Group-discussion practice" icon="🗣️"><p className="strong">{GD_TOPICS[gd % GD_TOPICS.length]}</p><p className="small muted" style={{ margin: "6px 0 10px" }}>Give yourself 2 minutes: opening point, 2 arguments with examples, one counter-point, a closing line.</p><Btn sm onClick={() => setGd(gd + 1)}>New topic</Btn></Card>
        <Card title="Communication tips" icon="💬"><ul style={{ paddingLeft: 18 }}>{COMMUNICATION_TIPS.map((t) => <li key={t} className="small" style={{ marginBottom: 4 }}>{t}</li>)}</ul></Card>
      </div>
    </div>
  );
}

function Roadmaps() {
  const toast = useToast();
  const [rid, setRid] = useState(ROADMAPS[0].id);
  const prog = useLiveQuery(() => db.roadmapProgress.toArray(), [], [] as RoadmapProgress[]);
  const rm = ROADMAPS.find((r) => r.id === rid)!;
  const isDone = (sid: string) => prog.some((p) => p.id === `${rid}:${sid}` && p.done);
  const total = rm.steps.length, doneN = rm.steps.filter((s) => isDone(s.id)).length;
  return (
    <div className="col">
      <div className="row">{ROADMAPS.map((r) => <button key={r.id} className={`chip ${r.id === rid ? "on" : ""}`} aria-pressed={r.id === rid} onClick={() => setRid(r.id)}>{r.name}</button>)}</div>
      <Card><p>{rm.blurb}</p><div style={{ marginTop: 10 }}><Bar value={doneN} max={total} label="Roadmap progress" /><p className="tiny muted" style={{ marginTop: 4 }}>{doneN}/{total} steps complete</p></div></Card>
      {(["Beginner", "Intermediate", "Advanced"] as const).map((stage) => {
        const steps = rm.steps.filter((s) => s.stage === stage);
        return steps.length ? (
          <Card key={stage} title={stage}>
            {steps.map((s) => (
              <div key={s.id} className="task">
                <input type="checkbox" aria-label={`Mark done: ${s.title}`} checked={isDone(s.id)} onChange={(e) => db.roadmapProgress.put({ id: `${rid}:${s.id}`, done: e.target.checked })} />
                <div className="grow"><span className="strong">{s.title}</span><p className="small">{s.detail}</p>
                  {s.resource && <p className="small"><ExtLink href={s.resource.url}>{s.resource.label} ↗</ExtLink></p>}
                  {s.project && <p className="small"><strong>Portfolio project:</strong> {s.project} <Btn sm kind="ghost" onClick={async () => { await addTask({ title: `Project: ${s.project}`, category: "career", notes: `${rm.name} → ${s.title}`, source: "plan" }); toast("Added as a task", "ok"); }}>→ Task</Btn></p>}
                </div>
              </div>
            ))}
          </Card>
        ) : null;
      })}
    </div>
  );
}

function Learning() {
  const logs = useLiveQuery(() => db.learningLogs.toArray(), [], [] as LearningLog[]);
  const goal = useLiveQuery(() => getKV<number>("learningGoal", 45), [], 45);
  const [f, setF] = useState({ topic: "", minutes: "30" });
  const today = dayKey();
  const todayMin = logs.filter((l) => l.date === today).reduce((a, l) => a + l.minutes, 0);
  const days = Array.from({ length: 14 }, (_, i) => dayKey(addDays(new Date(), i - 13)));
  const per = days.map((d) => logs.filter((l) => l.date === d).reduce((a, l) => a + l.minutes, 0));
  let streak = 0; for (let i = days.length - 1; i >= 0; i--) { if (per[i] > 0) streak++; else if (i === days.length - 1) continue; else break; }
  return (
    <div className="grid g2" style={{ alignItems: "start" }}>
      <div className="col">
        <Card title="Today" icon="🎯"><div className="row"><Ring value={Math.min(100, (todayMin / Math.max(goal, 1)) * 100)} label={`${todayMin} of ${goal} minutes`} /><div><p className="strong">{todayMin} / {goal} min</p><p className="small muted">🔥 {streak} day streak</p><label className="field small" style={{ marginTop: 6 }}>Daily goal (min)<input type="number" min={5} step={5} style={{ width: 100 }} value={goal} onChange={(e) => setKV("learningGoal", Number(e.target.value) || 30)} /></label></div></div></Card>
        <Card title="Log a session"><form className="col" onSubmit={async (e) => { e.preventDefault(); await db.learningLogs.add({ id: uid(), date: today, minutes: Number(f.minutes), topic: f.topic.trim() }); setF({ ...f, topic: "" }); }}>
          <Field label="What did you study?"><input type="text" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} placeholder="e.g. MQTT basics, SIP lesson, DBMS" required /></Field>
          <Field label="Minutes"><input type="number" min={1} value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} /></Field>
          <Btn kind="primary" type="submit" disabled={!f.topic.trim() || !(Number(f.minutes) > 0)}>Log</Btn></form></Card>
      </div>
      <div className="col">
        <Card title="Last 14 days"><BarChart height={130} data={days.map((d, i) => ({ label: format(new Date(d + "T00:00:00"), "d"), value: per[i] }))} format={(n) => `${n} min`} /></Card>
        <Card title="Recent sessions">{logs.length === 0 ? <p className="small muted">No sessions yet.</p> : [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((l) => <p key={l.id} className="small row nw"><span className="grow">{l.topic}</span><span className="muted">{l.minutes} min · {format(new Date(l.date + "T00:00:00"), "d MMM")}</span><Btn sm kind="ghost" aria-label="Delete log" onClick={() => db.learningLogs.delete(l.id)}>✕</Btn></p>)}</Card>
      </div>
    </div>
  );
}
