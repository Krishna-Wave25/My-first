import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { addMonths, format } from "date-fns";
import { db, getKV, setKV, uid } from "../db/db";
import type { Article, Budget, SavingsGoal, Transaction } from "../db/types";
import { FINANCE_NOTE, LESSONS, QUIZ } from "../content/finance";
import { Bar, BarChart, Btn, Card, Chip, Empty, ExtLink, Field, LineChart, Modal, Notice, Tabs, useConfirm, useTab, useToast } from "../components/ui";
import { dayKey, inr, inrCompact, monthKey, relativeTime } from "../lib/dates";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, emergencyFund, lumpsumProjection, monthSummary, realValue, rule503020, sipNeededForGoal, sipProjection } from "../lib/finance";
import { toCsv, download } from "../lib/backup";
import { openAssistant } from "../components/Shell";

const TABS = ["overview", "tracker", "budgets", "calc", "learn", "markets"];

export default function Finance() {
  const [tab, setTab] = useTab("overview", TABS);
  return (
    <div>
      <div className="page-head"><h1>Personal Finance</h1><p>Track money, plan budgets, learn the basics. Manual entry only — no bank access needed.</p></div>
      <Notice kind="warn">{FINANCE_NOTE}</Notice>
      <div style={{ height: 14 }} />
      <Tabs label="Finance sections" value={tab} onChange={setTab} tabs={[{ id: "overview", label: "Overview" }, { id: "tracker", label: "Income & expenses" }, { id: "budgets", label: "Budgets & goals" }, { id: "calc", label: "Calculators" }, { id: "learn", label: "Learn" }, { id: "markets", label: "Markets & data" }]} />
      {tab === "overview" && <Overview />}
      {tab === "tracker" && <TrackerTab />}
      {tab === "budgets" && <BudgetsTab />}
      {tab === "calc" && <Calculators />}
      {tab === "learn" && <Learn />}
      {tab === "markets" && <Markets />}
    </div>
  );
}

function useMonth() {
  const [m, setM] = useState(new Date());
  return { m, key: monthKey(m), prev: () => setM(addMonths(m, -1)), next: () => setM(addMonths(m, 1)), label: format(m, "MMMM yyyy") };
}
const MonthNav = ({ mo }: { mo: ReturnType<typeof useMonth> }) => <div className="row"><Btn sm aria-label="Previous month" onClick={mo.prev}>‹</Btn><strong style={{ minWidth: 120, textAlign: "center" }}>{mo.label}</strong><Btn sm aria-label="Next month" onClick={mo.next}>›</Btn></div>;

function Overview() {
  const mo = useMonth();
  const txs = useLiveQuery(() => db.transactions.filter((t) => t.date.startsWith(mo.key)).toArray(), [mo.key], [] as Transaction[]);
  const sum = monthSummary(txs);
  const target = rule503020(sum.income);
  if (!txs.length) return <div className="col"><MonthNav mo={mo} /><Empty icon="💸" title="No transactions this month">Log income and expenses in the “Income & expenses” tab to see your 50/30/20 split and savings rate.</Empty></div>;
  const rows = [["Needs", sum.by.needs, target.needs, "var(--info)"], ["Wants", sum.by.wants, target.wants, "var(--warn)"], ["Savings", sum.by.savings + Math.max(0, sum.net), target.savings, "var(--ok)"]] as const;
  const cats = Object.entries(sum.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8);
  return (
    <div className="col">
      <MonthNav mo={mo} />
      <div className="grid g4">
        <Card><div className="stat"><span className="v" style={{ color: "var(--ok)" }}>{inr(sum.income)}</span><span className="l">Income</span></div></Card>
        <Card><div className="stat"><span className="v">{inr(sum.spent)}</span><span className="l">Spent</span></div></Card>
        <Card><div className="stat"><span className="v" style={{ color: sum.net < 0 ? "var(--danger)" : "var(--text)" }}>{inr(sum.net)}</span><span className="l">Left over</span></div></Card>
        <Card><div className="stat"><span className="v">{sum.income ? `${Math.round(sum.savingsRate)}%` : "—"}</span><span className="l">Savings rate</span></div></Card>
      </div>
      <div className="grid g2">
        <Card title="50/30/20 check" icon="⚖️">
          {!sum.income ? <p className="small muted">Log some income to compare against 50/30/20.</p> : rows.map(([l, actual, tgt, c]) => (
            <div key={l} style={{ marginBottom: 12 }}>
              <div className="row small"><span className="strong">{l}</span><div className="sp" /><span>{inr(actual)} of {inr(tgt)} target</span></div>
              <Bar label={`${l} spending vs target`} value={actual} max={Math.max(tgt, 1)} tone={l !== "Savings" && actual > tgt ? "danger" : ""} />
              <span className="tiny" style={{ color: c }}>{l === "Savings" ? (actual >= tgt ? "On track" : `${inr(tgt - actual)} short of the 20% goal`) : actual > tgt ? `${inr(actual - tgt)} over` : "Within target"}</span>
            </div>
          ))}
          <p className="tiny muted">Guideline only — categories are mapped to needs/wants in the app; adjust to your situation.</p>
        </Card>
        <Card title="Where the money went" icon="🧾"><BarChart height={140} data={cats.map(([k, v]) => ({ label: k.split(/[ /&]/)[0], value: v }))} format={inr} /></Card>
      </div>
    </div>
  );
}

function TrackerTab() {
  const toast = useToast();
  const { confirm, node } = useConfirm();
  const mo = useMonth();
  const [adding, setAdding] = useState(false);
  const txs = useLiveQuery(() => db.transactions.filter((t) => t.date.startsWith(mo.key)).toArray(), [mo.key], [] as Transaction[]);
  const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="col">
      <div className="row"><MonthNav mo={mo} /><div className="sp" /><Btn onClick={() => download(`transactions-${mo.key}.csv`, toCsv(sorted as any), "text/csv")} disabled={!sorted.length}>Export CSV</Btn><Btn kind="primary" onClick={() => setAdding(true)}>+ Add</Btn></div>
      {sorted.length === 0 ? <Empty icon="🧾" title="Nothing logged this month" action={<Btn kind="primary" onClick={() => setAdding(true)}>Add a transaction</Btn>}>Record income (stipend, pocket money, freelance) and expenses.</Empty> : (
        <Card><div className="scroll-x"><table className="tbl"><thead><tr><th>Date</th><th>Category</th><th>Note</th><th style={{ textAlign: "right" }}>Amount</th><th /></tr></thead><tbody>
          {sorted.map((t) => <tr key={t.id}><td>{format(new Date(t.date + "T00:00:00"), "d MMM")}</td><td>{t.category}</td><td>{t.note}</td><td style={{ textAlign: "right", color: t.type === "income" ? "var(--ok)" : "var(--text)" }}>{t.type === "income" ? "+" : "−"}{inr(t.amount)}</td>
            <td><Btn sm kind="ghost" aria-label="Delete transaction" onClick={async () => { if (await confirm("Delete this transaction?")) await db.transactions.delete(t.id); }}>✕</Btn></td></tr>)}
        </tbody></table></div></Card>
      )}
      {adding && <TxModal onClose={() => setAdding(false)} onSaved={() => toast("Saved", "ok")} />}
      {node}
    </div>
  );
}
function TxModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ type: "expense" as "income" | "expense", amount: "", category: EXPENSE_CATEGORIES[1], date: dayKey(), note: "" });
  const cats = f.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const amt = Number(f.amount);
  return (
    <Modal title="Add transaction" onClose={onClose}>
      <form className="col" onSubmit={async (e) => { e.preventDefault(); await db.transactions.add({ id: uid(), type: f.type, amount: amt, category: f.category, date: f.date, note: f.note }); onSaved(); onClose(); }}>
        <div className="row">{(["expense", "income"] as const).map((t) => <button type="button" key={t} className={`chip ${f.type === t ? "on" : ""}`} aria-pressed={f.type === t} onClick={() => setF({ ...f, type: t, category: (t === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)[0] })}>{t === "income" ? "Income" : "Expense"}</button>)}</div>
        <Field label="Amount (₹)"><input type="number" data-autofocus min={0.01} step="any" inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required /></Field>
        <Field label="Category"><select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{cats.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Date"><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required /></Field>
        <Field label="Note"><input type="text" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        <div className="row" style={{ justifyContent: "flex-end" }}><Btn onClick={onClose}>Cancel</Btn><Btn kind="primary" type="submit" disabled={!(amt > 0)}>Save</Btn></div>
      </form>
    </Modal>
  );
}

function BudgetsTab() {
  const toast = useToast();
  const mo = useMonth();
  const { confirm, node } = useConfirm();
  const budgets = useLiveQuery(() => db.budgets.where("month").equals(mo.key).toArray(), [mo.key], [] as Budget[]);
  const txs = useLiveQuery(() => db.transactions.filter((t) => t.date.startsWith(mo.key) && t.type === "expense").toArray(), [mo.key], [] as Transaction[]);
  const goals = useLiveQuery(() => db.savingsGoals.toArray(), [], [] as SavingsGoal[]);
  const [cat, setCat] = useState(EXPENSE_CATEGORIES[1]);
  const [lim, setLim] = useState("");
  const [g, setG] = useState({ name: "", target: "", deadline: "" });
  const [fund, setFund] = useState({ essentials: "", months: 3 });
  const needsSpent = txs.filter((t) => ["Rent/Hostel", "Food & Groceries", "Transport", "Bills & Utilities", "Education", "Health", "EMI/Loans"].includes(t.category)).reduce((a, t) => a + t.amount, 0);
  const ef = emergencyFund(Number(fund.essentials) || needsSpent, fund.months);
  return (
    <div className="col">
      <div className="grid g2" style={{ alignItems: "start" }}>
        <Card title="Monthly budgets" actions={<MonthNav mo={mo} />}>
          <form className="row nw" onSubmit={async (e) => { e.preventDefault(); const n = Number(lim); if (!(n > 0)) return; await db.budgets.put({ id: `${mo.key}:${cat}`, month: mo.key, category: cat, limit: n }); setLim(""); }}>
            <select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            <input type="number" aria-label="Monthly limit" placeholder="₹ limit" min={1} value={lim} onChange={(e) => setLim(e.target.value)} style={{ width: 120 }} />
            <Btn kind="primary" type="submit" disabled={!(Number(lim) > 0)}>Set</Btn>
          </form>
          <div style={{ marginTop: 14 }}>{budgets.length === 0 ? <p className="small muted">No budgets for {mo.label}. Set a limit for a category to track it.</p> : budgets.map((b) => {
            const spent = txs.filter((t) => t.category === b.category).reduce((a, t) => a + t.amount, 0);
            return <div key={b.id} style={{ marginBottom: 12 }}><div className="row small"><span className="strong">{b.category}</span><div className="sp" /><span>{inr(spent)} / {inr(b.limit)}</span><Btn sm kind="ghost" aria-label={`Remove budget ${b.category}`} onClick={() => db.budgets.delete(b.id)}>✕</Btn></div><Bar label={`${b.category} budget used`} value={spent} max={b.limit} tone={spent > b.limit ? "danger" : spent > b.limit * 0.8 ? "warn" : ""} />{spent > b.limit && <span className="tiny flag-danger">Over by {inr(spent - b.limit)}</span>}</div>;
          })}</div>
        </Card>
        <Card title="Emergency fund" icon="🛟">
          <div className="grid g2"><Field label="Monthly essential expenses (₹)" hint={needsSpent ? `This month's logged needs: ${inr(needsSpent)}` : undefined}><input type="number" min={0} value={fund.essentials} onChange={(e) => setFund({ ...fund, essentials: e.target.value })} placeholder={String(Math.round(needsSpent) || "")} /></Field>
            <Field label="Months of cover"><select value={fund.months} onChange={(e) => setFund({ ...fund, months: Number(e.target.value) })}>{[1, 2, 3, 6, 9, 12].map((m) => <option key={m}>{m}</option>)}</select></Field></div>
          <p style={{ margin: "12px 0" }}>Target: <span className="strong">{inr(ef.target)}</span></p>
          <Btn disabled={!ef.target} onClick={async () => { await db.savingsGoals.add({ id: uid(), name: "Emergency fund", target: ef.target, saved: 0, deadline: null, createdAt: new Date().toISOString() }); toast("Goal created", "ok"); }}>Create as savings goal</Btn>
        </Card>
      </div>
      <Card title="Savings goals" icon="🎯">
        <form className="row nw" onSubmit={async (e) => { e.preventDefault(); await db.savingsGoals.add({ id: uid(), name: g.name.trim(), target: Number(g.target), saved: 0, deadline: g.deadline || null, createdAt: new Date().toISOString() }); setG({ name: "", target: "", deadline: "" }); }}>
          <input type="text" aria-label="Goal name" placeholder="Goal (e.g. laptop, course fee)" value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} />
          <input type="number" aria-label="Target amount" placeholder="₹ target" min={1} value={g.target} onChange={(e) => setG({ ...g, target: e.target.value })} style={{ width: 130 }} />
          <input type="date" aria-label="Target date" value={g.deadline} onChange={(e) => setG({ ...g, deadline: e.target.value })} style={{ width: 160 }} />
          <Btn kind="primary" type="submit" disabled={!g.name.trim() || !(Number(g.target) > 0)}>Add</Btn>
        </form>
        <div style={{ marginTop: 14 }}>{goals.length === 0 ? <p className="small muted">No goals yet.</p> : goals.map((x) => <GoalRow key={x.id} g={x} confirm={confirm} />)}</div>
      </Card>
      {node}
    </div>
  );
}
function GoalRow({ g, confirm }: { g: SavingsGoal; confirm: (m: string) => Promise<boolean> }) {
  const [amt, setAmt] = useState("");
  const months = g.deadline ? Math.max(1, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (30 * 86400000))) : null;
  const need = months ? Math.max(0, (g.target - g.saved) / months) : null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="row small"><span className="strong">{g.name}</span><div className="sp" /><span>{inr(g.saved)} / {inr(g.target)}</span></div>
      <Bar label={`${g.name} saved`} value={g.saved} max={g.target} />
      <div className="row" style={{ marginTop: 6 }}>
        {need !== null && g.saved < g.target && <span className="tiny muted">Save ≈ {inr(need)}/month to hit {format(new Date(g.deadline!), "d MMM yyyy")}</span>}
        <div className="sp" />
        <input type="number" aria-label={`Add to ${g.name}`} placeholder="₹" style={{ width: 100, minHeight: 36 }} value={amt} onChange={(e) => setAmt(e.target.value)} />
        <Btn sm disabled={!(Number(amt) > 0)} onClick={async () => { await db.savingsGoals.update(g.id, { saved: g.saved + Number(amt) }); setAmt(""); }}>Add</Btn>
        <Btn sm kind="ghost" aria-label={`Delete ${g.name}`} onClick={async () => { if (await confirm(`Delete goal “${g.name}”?`)) await db.savingsGoals.delete(g.id); }}>✕</Btn>
      </div>
    </div>
  );
}

function Calculators() {
  const [kind, setKind] = useState<"sip" | "lump" | "goal" | "infl">("sip");
  const [v, setV] = useState({ monthly: 2000, years: 10, rate: 10, step: 0, lump: 50000, target: 500000, existing: 0, amount: 100000, infl: 6 });
  const n = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: Number(e.target.value) });
  const scenarios = [{ name: "Cautious", rate: Math.max(0, v.rate - 4), color: "var(--info)" }, { name: "Assumed", rate: v.rate, color: "var(--accent)" }, { name: "Optimistic", rate: v.rate + 4, color: "var(--warn)" }];
  const series = useMemo(() => scenarios.map((s) => ({ s, p: kind === "lump" ? lumpsumProjection(v.lump, v.years, s.rate) : sipProjection(v.monthly, v.years, s.rate, v.step) })), [v, kind]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="col">
      <div className="row">{([["sip", "SIP"], ["lump", "Lump sum"], ["goal", "Goal planner"], ["infl", "Inflation"]] as const).map(([k, l]) => <button key={k} className={`chip ${kind === k ? "on" : ""}`} aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>)}</div>
      <Notice kind="warn">Hypothetical projections using the rates you choose. Real returns vary, can be negative, and are never guaranteed. Fees, taxes and inflation are not included unless stated.</Notice>
      <div className="grid g2" style={{ alignItems: "start" }}>
        <Card title="Inputs">
          <div className="col">
            {kind === "sip" && <><Field label="Monthly SIP (₹)"><input type="number" min={0} value={v.monthly} onChange={n("monthly")} /></Field><Field label="Yearly step-up (%)"><input type="number" min={0} max={50} value={v.step} onChange={n("step")} /></Field></>}
            {kind === "lump" && <Field label="Lump sum (₹)"><input type="number" min={0} value={v.lump} onChange={n("lump")} /></Field>}
            {kind === "goal" && <><Field label="Target amount (₹)"><input type="number" min={0} value={v.target} onChange={n("target")} /></Field><Field label="Already saved (₹)"><input type="number" min={0} value={v.existing} onChange={n("existing")} /></Field></>}
            {kind === "infl" && <><Field label="Amount today (₹)"><input type="number" min={0} value={v.amount} onChange={n("amount")} /></Field><Field label="Assumed inflation (% / year)"><input type="number" min={0} max={30} step={0.5} value={v.infl} onChange={n("infl")} /></Field></>}
            <Field label="Years"><input type="number" min={1} max={50} value={v.years} onChange={n("years")} /></Field>
            {kind !== "infl" && <Field label="Assumed annual return (%)" hint="Cautious / optimistic cases are ∓4 points."><input type="number" min={0} max={40} step={0.5} value={v.rate} onChange={n("rate")} /></Field>}
          </div>
        </Card>
        <Card title="Result">
          {(kind === "sip" || kind === "lump") && <>
            <div className="scroll-x"><table className="tbl"><thead><tr><th>Scenario</th><th>Rate</th><th>Invested</th><th>Value after {v.years}y</th><th>Gain</th></tr></thead><tbody>{series.map(({ s, p }) => <tr key={s.name}><td><span className="strong">{s.name}</span></td><td>{s.rate}%</td><td>{inrCompact(p.invested)}</td><td className="strong">{inrCompact(p.value)}</td><td>{inrCompact(p.gain)}</td></tr>)}</tbody></table></div>
            <LineChart height={170} format={inrCompact} labels={series[1].p.series.map((x) => `${x.year}y`)} series={[{ name: "Invested", color: "var(--muted)", values: series[1].p.series.map((x) => x.invested) }, ...series.map(({ s, p }) => ({ name: s.name, color: s.color, values: p.series.map((x) => x.value) }))]} />
          </>}
          {kind === "goal" && <>{scenarios.map((s) => <p key={s.name} className="row"><span className="strong" style={{ minWidth: 100 }}>{s.name} ({s.rate}%)</span> need ≈ <span className="strong">{inr(Math.ceil(sipNeededForGoal(v.target, v.years, s.rate, v.existing)))}</span> / month</p>)}<p className="tiny muted">Plain saving with 0% return would need {inr(Math.ceil(Math.max(0, v.target - v.existing) / (v.years * 12)))} / month.</p></>}
          {kind === "infl" && <><p>At {v.infl}% inflation, <span className="strong">{inr(v.amount)}</span> today will buy only what <span className="strong">{inr(Math.round(realValue(v.amount, v.years, v.infl)))}</span> buys today, after {v.years} years.</p><p className="small muted" style={{ marginTop: 8 }}>This is why long-term savings need to grow faster than inflation. Check current CPI inflation on the MoSPI site.</p></>}
        </Card>
      </div>
    </div>
  );
}

function Learn() {
  const done = useLiveQuery(() => getKV<string[]>("lessonsDone", []), [], [] as string[]);
  const [qi, setQi] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const q = QUIZ[qi];
  return (
    <div className="col">
      <Bar label="Lessons completed" value={done.length} max={LESSONS.length} /><p className="tiny muted">{done.length}/{LESSONS.length} lessons completed</p>
      {LESSONS.map((l) => (
        <Card key={l.id}>
          <details>
            <summary style={{ cursor: "pointer", listStyle: "none" }}><div className="row"><h3 className="grow">{done.includes(l.id) ? "✅ " : ""}{l.title}</h3><Chip>{l.level}</Chip><Chip>{l.minutes} min</Chip></div><p className="small muted">{l.summary}</p></summary>
            <ul style={{ paddingLeft: 18, margin: "12px 0" }}>{l.points.map((p) => <li key={p} style={{ marginBottom: 4 }}>{p}</li>)}</ul>
            <Notice kind="warn"><strong>Risk:</strong> {l.risk}</Notice>
            <p className="small" style={{ marginTop: 10 }}><span className="label">Verify at official sources</span>{l.verify.map((v) => <span key={v.url} style={{ marginRight: 12 }}><ExtLink href={v.url}>{v.label}</ExtLink></span>)}</p>
            <p className="small" style={{ margin: "10px 0" }}><strong>Try this:</strong> {l.action}</p>
            <Btn sm onClick={() => setKV("lessonsDone", done.includes(l.id) ? done.filter((x) => x !== l.id) : [...done, l.id])}>{done.includes(l.id) ? "Mark as not done" : "Mark complete"}</Btn>
          </details>
        </Card>
      ))}
      <Card title={`Quick quiz · ${qi + 1}/${QUIZ.length}`} icon="🧠">
        <p className="strong">{q.q}</p>
        <div className="col" style={{ margin: "10px 0" }}>{q.options.map((o, i) => <button key={o} className="btn" disabled={pick !== null} style={pick !== null ? { borderColor: i === q.answer ? "var(--ok)" : i === pick ? "var(--danger)" : undefined } : undefined} onClick={() => { setPick(i); if (i === q.answer) setScore(score + 1); }}>{o}</button>)}</div>
        {pick !== null && <><Notice kind={pick === q.answer ? "ok" : "danger"}>{pick === q.answer ? "Correct. " : "Not quite. "}{q.why}</Notice><div className="row" style={{ marginTop: 10 }}>{qi < QUIZ.length - 1 ? <Btn onClick={() => { setQi(qi + 1); setPick(null); }}>Next</Btn> : <><span className="strong">Score {score}/{QUIZ.length}</span><Btn onClick={() => { setQi(0); setPick(null); setScore(0); }}>Restart</Btn></>}</div></>}
      </Card>
    </div>
  );
}

const SOURCES = [
  ["RBI — press releases & policy", "https://www.rbi.org.in/"], ["NSE India — market data", "https://www.nseindia.com/"], ["BSE India — market data", "https://www.bseindia.com/"],
  ["AMFI — mutual fund NAVs", "https://www.amfiindia.com/"], ["SEBI — regulator & investor education", "https://www.sebi.gov.in/"], ["MoSPI — CPI / GDP statistics", "https://mospi.gov.in/"], ["Income Tax Department", "https://www.incometax.gov.in/"],
] as const;
function Markets() {
  const items = useLiveQuery(async () => (await db.articles.filter((a) => a.topic === "business" && !!a.publishedAt && Date.now() - new Date(a.publishedAt!).getTime() < 7 * 86400000).toArray()).sort((a, b) => b.publishedAt!.localeCompare(a.publishedAt!)).slice(0, 15), [], [] as Article[]);
  return (
    <div className="col">
      <Notice kind="info">This app does not include a live price feed, so it never shows index levels, NAVs or stock prices of its own. Below are dated business headlines from your news sources, and the official places to check numbers.</Notice>
      <Card title="Official data sources" icon="🏛️">{SOURCES.map(([l, u]) => <p key={u} style={{ marginBottom: 6 }}><ExtLink href={u}>{l}</ExtLink></p>)}</Card>
      <Card title="Recent business & RBI headlines" icon="🗞️" actions={<Btn sm onClick={() => openAssistant("Summarize today's financial markets using only the headlines you can retrieve. Say clearly that you have no live prices.")}>✨ Summarize</Btn>}>
        {items.length === 0 ? <Empty icon="📰" title="No recent business headlines">Refresh your sources in News → Sources.</Empty> : items.map((a) => (
          <div key={a.id} className="task"><div className="grow"><a className="strong" href={a.url} target="_blank" rel="noopener noreferrer">{a.title}</a><div className="tiny muted">{a.source} · <time dateTime={a.publishedAt!}>{format(new Date(a.publishedAt!), "d MMM yyyy, h:mm a")}</time> ({relativeTime(a.publishedAt)})</div></div></div>
        ))}
      </Card>
    </div>
  );
}
