import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import { db } from "../db/db";
import { Bar, BarChart, Btn, Card, Chip, Empty, Tabs, useTab } from "../components/ui";
import { download, toCsv } from "../lib/backup";
import { inr } from "../lib/dates";
import { monthSummary } from "../lib/finance";
import { weekMarkdown, weekStats, type WeekStats } from "../lib/reports";
import { openAssistant } from "../components/Shell";
import { monthKey } from "../lib/dates";

export default function Reports() {
  const [tab, setTab] = useTab("week", ["week", "export"]);
  const [days, setDays] = useState(7);
  const w = useLiveQuery(() => weekStats(new Date(), days), [days]);
  const txs = useLiveQuery(() => db.transactions.filter((t) => t.date.startsWith(monthKey())).toArray(), [], []);
  return (
    <div>
      <div className="page-head"><h1>Reports</h1><p>Real numbers from your own activity — nothing estimated or simulated.</p></div>
      <Tabs label="Report sections" value={tab} onChange={setTab} tabs={[{ id: "week", label: "Progress review" }, { id: "export", label: "Export data" }]} />
      {tab === "week" && (w ? <Week w={w} days={days} setDays={setDays} month={monthSummary(txs)} /> : null)}
      {tab === "export" && <Export />}
    </div>
  );
}

function Week({ w, days, setDays, month }: { w: WeekStats; days: number; setDays: (n: number) => void; month: ReturnType<typeof monthSummary> }) {
  const empty = w.completed + w.created + w.learningMinutes + w.notes === 0 && w.habitRate === null;
  return (
    <div className="col">
      <div className="row">{[7, 14, 30].map((n) => <button key={n} className={`chip ${days === n ? "on" : ""}`} aria-pressed={days === n} onClick={() => setDays(n)}>Last {n} days</button>)}<div className="sp" />
        <Btn sm onClick={() => download(`review-${w.to}.md`, weekMarkdown(w), "text/markdown")}>Export .md</Btn><Btn sm onClick={() => openAssistant("Review my progress this week and suggest three concrete improvements")}>✨ Discuss with assistant</Btn></div>
      {empty ? <Empty icon="📊" title="Not enough activity yet">Complete a few tasks, log habits or learning time, and your review will fill in.</Empty> : null}
      <div className="grid g4">
        <Card><div className="stat"><span className="v">{w.completed}</span><span className="l">tasks completed</span></div></Card>
        <Card><div className="stat"><span className="v" style={{ color: w.overdue ? "var(--danger)" : undefined }}>{w.overdue}</span><span className="l">overdue now</span></div></Card>
        <Card><div className="stat"><span className="v">{w.habitRate === null ? "—" : `${w.habitRate}%`}</span><span className="l">habit completion</span></div></Card>
        <Card><div className="stat"><span className="v">{w.learningMinutes}</span><span className="l">learning minutes</span></div></Card>
      </div>
      <div className="grid g2">
        <Card title="Tasks completed per day"><BarChart height={130} data={w.daily.map((d) => ({ label: format(new Date(d.date + "T00:00:00"), days > 14 ? "d" : "EEEEE"), value: d.done }))} /></Card>
        <Card title="By category">{Object.keys(w.completedByCategory).length === 0 ? <p className="small muted">No completed tasks in this period.</p> : Object.entries(w.completedByCategory).map(([k, v]) => <div key={k} style={{ marginBottom: 8 }}><div className="row small"><span className="strong" style={{ textTransform: "capitalize" }}>{k}</span><div className="sp" />{v}</div><Bar label={`${k} tasks completed`} value={v} max={w.completed} /></div>)}</Card>
      </div>
      <div className="grid g3">
        <Card title="Money (logged)"><p>Income <span className="strong">{inr(w.income)}</span></p><p>Spent <span className="strong">{inr(w.spent)}</span></p><p className="tiny muted">This month: income {inr(month.income)}, spent {inr(month.spent)}</p></Card>
        <Card title="Content"><p><span className="strong">{w.videos.published}</span> published · <span className="strong">{w.videos.inPipeline}</span> in production</p></Card>
        <Card title="Opportunities"><p>Recorded earnings <span className="strong">{inr(w.oppEarned)}</span></p><Chip>entered by you · revenue, not profit</Chip></Card>
      </div>
    </div>
  );
}

function Export() {
  const sets: [string, string, () => Promise<any[]>][] = [
    ["Tasks (CSV)", "tasks.csv", () => db.tasks.toArray()], ["Transactions (CSV)", "transactions.csv", () => db.transactions.toArray()],
    ["Notes (CSV)", "notes.csv", () => db.notes.toArray()], ["Opportunity tracker (CSV)", "opportunities.csv", () => db.opportunities.toArray()],
    ["Video ideas (CSV)", "video-ideas.csv", () => db.videoIdeas.toArray()], ["Learning log (CSV)", "learning.csv", () => db.learningLogs.toArray()],
  ];
  return (
    <div className="col">
      <Card title="Export selected data" icon="📤"><div className="grid auto">{sets.map(([label, file, get]) => <Btn key={file} onClick={async () => download(file, toCsv(await get()), "text/csv")}>{label}</Btn>)}</div><p className="tiny muted" style={{ marginTop: 10 }}>For a full backup (and restore) use Settings → Data. Saved articles can be exported from My Day → Saved.</p></Card>
    </div>
  );
}
