import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Capacitor } from "@capacitor/core";
import { db } from "../db/db";
import { aiReady, callClaude, textOf } from "../lib/ai";
import { download, exportAll, importAll, wipeAll } from "../lib/backup";
import { localTimeZone } from "../lib/dates";
import { permissionState, requestPermission, sendTestNotification, syncNotifications, type ScheduleSummary } from "../lib/notifications";
import { hasPin, removePin, setPin } from "../lib/security";
import { saveSettings, useSettings, type Settings as S } from "../lib/settings";
import { Btn, Card, Chip, Field, Modal, Notice, Spinner, useAsync, useToast } from "../components/ui";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const zones = (): string[] => { try { return (Intl as any).supportedValuesOf("timeZone"); } catch { return [localTimeZone(), "Asia/Kolkata", "UTC"]; } };

export default function Settings() {
  const s = useSettings();
  const toast = useToast();
  const patch = (p: Partial<S>) => saveSettings(p);
  return (
    <div>
      <div className="page-head"><h1>Settings</h1><p>Everything is stored on this device. Nothing leaves it except the requests you configure below (news feeds and, if you add a key, AI).</p></div>
      <div className="col">
        <Profile s={s} patch={patch} />
        <Notifications s={s} patch={patch} />
        <AiCard s={s} />
        <Security />
        <DataCard toast={toast} />
        <Status s={s} />
      </div>
    </div>
  );
}

function Profile({ s, patch }: { s: S; patch: (p: Partial<S>) => void }) {
  const [interests, setInterests] = useState<string | null>(null);
  return (
    <Card title="Profile & preferences" icon="👤">
      <div className="grid g2">
        <Field label="Your name"><input type="text" value={s.name} onChange={(e) => patch({ name: e.target.value })} /></Field>
        <Field label="Time zone" hint="Used for the 7:00 AM briefing and all reminders."><select value={s.timezone} onChange={(e) => patch({ timezone: e.target.value })}>{[...new Set([s.timezone, ...zones()])].map((z) => <option key={z}>{z}</option>)}</select></Field>
        <Field label="Working day starts"><input type="time" value={s.workStart} onChange={(e) => patch({ workStart: e.target.value })} /></Field>
        <Field label="Working day ends"><input type="time" value={s.workEnd} onChange={(e) => patch({ workEnd: e.target.value })} /></Field>
        <Field label="Default reminder for timed tasks"><select value={s.defaultReminderMin} onChange={(e) => patch({ defaultReminderMin: Number(e.target.value) })}>{[0, 5, 10, 15, 30, 60].map((m) => <option key={m} value={m}>{m ? `${m} min before` : "At due time"}</option>)}</select></Field>
        <Field label="Theme"><select value={s.theme} onChange={(e) => patch({ theme: e.target.value as S["theme"] })}><option value="dark">Dark</option><option value="light">Light</option></select></Field>
      </div>
      <div style={{ marginTop: 12 }}><Field label="Interest keywords (comma separated)" hint="Stories mentioning these (whole words) rank higher in your briefing."><input type="text" value={interests ?? s.interests.join(", ")} onChange={(e) => { setInterests(e.target.value); patch({ interests: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }); }} onBlur={() => setInterests(null)} /></Field></div>
    </Card>
  );
}

function Notifications({ s, patch }: { s: S; patch: (p: Partial<S>) => void }) {
  const [perm, setPerm] = useState("…");
  const [sum, setSum] = useState<ScheduleSummary | null>(null);
  const [msg, setMsg] = useState("");
  const job = useAsync();
  useEffect(() => { permissionState().then(setPerm); }, []);
  const rows: { k: keyof S["notify"]; label: string; time?: [keyof S, string]; day?: [keyof S] }[] = [
    { k: "briefing", label: "Daily briefing", time: ["briefingTime", "time"] },
    { k: "morningPlan", label: "Morning planning reminder", time: ["morningPlanTime", "time"] },
    { k: "deadlines", label: "Task deadline alerts" },
    { k: "eveningReview", label: "Evening productivity review", time: ["eveningReviewTime", "time"] },
    { k: "weeklyReview", label: "Weekly goal review", time: ["weeklyReviewTime", "time"], day: ["weeklyReviewDay"] },
    { k: "techSummary", label: "Weekly technology summary", time: ["techSummaryTime", "time"], day: ["techSummaryDay"] },
    { k: "opportunityDeadlines", label: "Opportunity deadline reminders" },
  ];
  const native = Capacitor.isNativePlatform();
  return (
    <Card title="Schedules & notifications" icon="🔔" actions={<Chip kind={perm === "granted" ? "ok" : "warn"}>permission: {perm}</Chip>}>
      <div className="col">
        {rows.map((r) => (
          <div key={r.k} className="row nw" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
            <label className="check grow"><input type="checkbox" checked={s.notify[r.k]} onChange={(e) => patch({ notify: { ...s.notify, [r.k]: e.target.checked } })} /> {r.label}</label>
            {r.day && <select aria-label={`${r.label} day`} style={{ width: 130, minHeight: 36 }} value={s[r.day[0]] as number} onChange={(e) => patch({ [r.day![0]]: Number(e.target.value) } as any)}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>}
            {r.time && <input type="time" aria-label={`${r.label} time`} style={{ width: 120, minHeight: 36 }} value={s[r.time[0]] as string} onChange={(e) => patch({ [r.time![0]]: e.target.value } as any)} />}
          </div>
        ))}
        <div className="row">
          <Btn onClick={async () => setPerm(await requestPermission())}>Allow notifications</Btn>
          <Btn onClick={() => job.run(async () => setMsg(await sendTestNotification()))}>Send test notification</Btn>
          <Btn onClick={() => job.run(async () => { setSum(await syncNotifications(s)); })}>{job.busy ? <Spinner /> : "Re-schedule now"}</Btn>
        </div>
        {msg && <Notice kind="info">{msg}</Notice>}
        {sum && <Notice kind={sum.scheduled ? "ok" : "warn"}>
          {sum.platform === "android-native" ? <>Android scheduled <strong>{sum.scheduled}</strong> pending notifications{sum.exactAlarms ? ` (exact alarms: ${sum.exactAlarms})` : ""}.</> : <>Browser: {sum.scheduled} timers armed (fire only while this tab is open).</>}
          {Object.keys(sum.byKind).length > 0 && <> Planned: {Object.entries(sum.byKind).map(([k, v]) => `${k} ${v}`).join(", ")}.</>}
          {sum.error && <> {sum.error}.</>}
        </Notice>}
        {job.error && <Notice kind="danger">{job.error}</Notice>}
        <p className="tiny muted">{native ? "Notifications are scheduled with Android and appear even when the app is closed. They are re-planned every time you open the app or change a task. If a reminder doesn't show up, check battery optimisation and the “Alarms & reminders” permission for this app." : "You're in a browser: scheduled notifications only fire while this page is open. Install the Android app for reliable delivery."} The daily briefing notification is a prompt — stories are fetched when you open the app (no server runs in the background).</p>
      </div>
    </Card>
  );
}

function AiCard({ s }: { s: S }) {
  const [key, setKey] = useState<string | null>(null);
  const [res, setRes] = useState<{ ok: boolean; text: string } | null>(null);
  const job = useAsync();
  const val = key ?? s.ai.apiKey;
  return (
    <Card title="AI assistant" icon="✨" actions={<Chip kind={aiReady(s) ? "ok" : "warn"}>{aiReady(s) ? "key saved" : "no key"}</Chip>}>
      <div className="col">
        <Notice kind="info">AI is optional. With an Anthropic API key the assistant can answer open questions, analyse news, and draft video packages. The key is stored only on this device and requests go directly from this device to api.anthropic.com. Text you send (and the app data the assistant reads to answer) is sent to that service. Without a key, everything else still works and the assistant runs offline commands only.</Notice>
        <form onSubmit={(e) => e.preventDefault()} className="col">
          <Field label="Anthropic API key"><input type="password" autoComplete="off" value={val} placeholder="sk-ant-…" onChange={(e) => { setKey(e.target.value); void saveSettings({ ai: { ...s.ai, apiKey: e.target.value.trim() } }); }} /></Field>
        </form>
        <div className="grid g2">
          <Field label="Model"><input type="text" value={s.ai.model} onChange={(e) => saveSettings({ ai: { ...s.ai, model: e.target.value } })} /></Field>
          <label className="check" style={{ alignSelf: "end" }}><input type="checkbox" checked={s.ai.enabled} onChange={(e) => saveSettings({ ai: { ...s.ai, enabled: e.target.checked } })} /> Enable AI features</label>
        </div>
        <div className="row"><Btn disabled={!aiReady(s) || job.busy} onClick={() => job.run(async () => { setRes(null); const r = await callClaude(s, { system: "Reply with the single word: ok", messages: [{ role: "user", content: "ping" }], maxTokens: 10 }); setRes({ ok: true, text: `Connected. Model replied: “${textOf(r).slice(0, 40)}”` }); })}>{job.busy ? <Spinner label="Testing…" /> : "Test connection"}</Btn></div>
        {res && <Notice kind="ok">{res.text}</Notice>}
        {job.error && <Notice kind="danger">{job.error}</Notice>}
        <p className="tiny muted">Security note: a key stored in a mobile app can be extracted from a rooted device. Use a key with a spending limit, and never share a backup file that includes it.</p>
      </div>
    </Card>
  );
}

function Security() {
  const toast = useToast();
  const [pin, setPinV] = useState("");
  const [has, setHas] = useState(hasPin());
  return (
    <Card title="App lock" icon="🔒" actions={<Chip kind={has ? "ok" : ""}>{has ? "PIN on" : "off"}</Chip>}>
      <div className="col">
        <p className="small">Require a PIN when opening the app and after 30 seconds in the background. The PIN is salted and hashed (PBKDF2); repeated wrong attempts trigger a growing lockout.</p>
        <form className="row nw" onSubmit={async (e) => { e.preventDefault(); if (pin.length >= 4) { await setPin(pin); setPinV(""); setHas(true); toast("PIN set", "ok"); } }}><input type="password" inputMode="numeric" autoComplete="off" aria-label="New PIN" placeholder="4–8 digit PIN" maxLength={8} value={pin} onChange={(e) => setPinV(e.target.value.replace(/\D/g, ""))} style={{ maxWidth: 220 }} />
          <Btn kind="primary" type="submit" disabled={pin.length < 4}>{has ? "Change PIN" : "Set PIN"}</Btn>
          {has && <Btn onClick={() => { removePin(); setHas(false); toast("PIN removed"); }}>Remove</Btn>}</form>
        <Notice kind="warn">This locks the app interface. It does not encrypt the on-device database; protect the phone itself with a screen lock and device encryption (on by default on modern Android). If you forget the PIN, clear the app's storage in Android settings — which erases local data, so keep backups.</Notice>
      </div>
    </Card>
  );
}

function DataCard({ toast }: { toast: (m: string, k?: "ok" | "err" | "") => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [withKey, setWithKey] = useState(false);
  const [wipe, setWipe] = useState(false);
  const [typed, setTyped] = useState("");
  const counts = useLiveQuery(async () => ({ tasks: await db.tasks.count(), notes: await db.notes.count(), articles: await db.articles.count(), tx: await db.transactions.count() }), [], undefined);
  return (
    <Card title="Your data" icon="💾">
      <div className="col">
        {counts && <p className="small muted">{counts.tasks} tasks · {counts.notes} notes · {counts.articles} stored articles · {counts.tx} transactions — all stored locally in this app.</p>}
        <div className="row">
          <Btn onClick={async () => download(`lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`, await exportAll(withKey))}>Export backup (JSON)</Btn>
          <label className="check small"><input type="checkbox" checked={withKey} onChange={(e) => setWithKey(e.target.checked)} /> include API key</label>
          <Btn onClick={() => file.current?.click()}>Restore from backup…</Btn>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const n = await importAll(await f.text()); toast(`Restored ${n} records`, "ok"); } catch (err) { toast((err as Error).message, "err"); } e.target.value = ""; }} />
        </div>
        <Notice>Restoring replaces the data on this device. Backups are plain JSON — store them somewhere private.</Notice>
        <div><Btn kind="danger" onClick={() => setWipe(true)}>Erase all data…</Btn></div>
      </div>
      {wipe && (
        <Modal title="Erase all data?" onClose={() => setWipe(false)} small>
          <p style={{ marginBottom: 10 }}>This permanently deletes every task, note, project and setting on this device. Type <strong>DELETE</strong> to confirm.</p>
          <input type="text" aria-label="Type DELETE" data-autofocus value={typed} onChange={(e) => setTyped(e.target.value)} />
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}><Btn onClick={() => setWipe(false)}>Cancel</Btn><Btn kind="danger" disabled={typed !== "DELETE"} onClick={async () => { await wipeAll(); localStorage.clear(); location.reload(); }}>Erase everything</Btn></div>
        </Modal>
      )}
    </Card>
  );
}

function Status({ s }: { s: S }) {
  const feeds = useLiveQuery(() => db.feeds.toArray(), [], []);
  const ok = feeds.filter((f) => f.lastStatus === "ok").length, bad = feeds.filter((f) => f.lastStatus === "error").length, never = feeds.filter((f) => f.enabled && !f.lastStatus).length;
  const rows: [string, "ok" | "warn" | "no", string][] = [
    ["Tasks, notes, habits, finance, projects, YouTube pipeline", "ok", "Stored in on-device IndexedDB; survives restarts."],
    ["Local reminders & scheduled notifications", Capacitor.isNativePlatform() ? "ok" : "warn", Capacitor.isNativePlatform() ? "Android system alarms. Use “Send test notification” to verify on your phone." : "Android app required for reliable delivery."],
    ["News & technology feeds (RSS)", ok ? "ok" : bad ? "warn" : "warn", `${ok} healthy, ${bad} failing, ${never} not yet fetched. Needs internet; no API key.`],
    ["AI assistant & analysis", aiReady(s) ? "ok" : "warn", aiReady(s) ? "Key saved — use Test connection to verify." : "Needs an Anthropic API key (optional)."],
    ["Cloud accounts, multi-device sync, server-side database", "no", "Not implemented: needs a backend (see README → Roadmap)."],
    ["Background 7:00 AM briefing generation / remote push / email", "no", "Needs a server or background worker. Today the 7:00 notification prompts you; stories load when you open the app."],
    ["Calendar integration (Google/Outlook)", "no", "Not implemented; needs OAuth and a registered app."],
    ["YouTube Analytics / keyword & competitor data", "no", "Not implemented; needs YouTube Analytics API access or a research provider. Views are entered manually."],
    ["Bank / investment account access", "no", "Deliberately not offered. Finance is manual entry."],
  ];
  return (
    <Card title="Integration status" icon="🧪">
      <div className="scroll-x"><table className="tbl"><tbody>{rows.map(([n, st, d]) => <tr key={n}><td style={{ width: 70 }}><Chip kind={st === "ok" ? "ok" : st === "warn" ? "warn" : "danger"}>{st === "ok" ? "works" : st === "warn" ? "needs setup" : "not built"}</Chip></td><td><span className="strong">{n}</span><div className="small muted">{d}</div></td></tr>)}</tbody></table></div>
      <p className="tiny muted" style={{ marginTop: 8 }}>LIFE OS AI v0.1.0 · {Capacitor.isNativePlatform() ? "Android app" : "web"} · {s.timezone}</p>
    </Card>
  );
}
