import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { db, uid } from "../db/db";
import { useLiveQuery } from "dexie-react-hooks";
import { universalSearch, type SearchHit } from "../lib/search";
import { saveSettings, useSettings } from "../lib/settings";
import { applyLocalActions, resumeAiTurn, sendToAssistant, type AiPending, type LocalPending, type PendingAction } from "../lib/assistant";
import type { ApiMessage } from "../lib/ai";
import { aiReady } from "../lib/ai";
import { Btn, Chip, Modal, Notice, Spinner, useDebounced } from "./ui";

export const NAV = [
  { to: "/", label: "Home", icon: "🏠" },
  { to: "/day", label: "My Day", icon: "✅" },
  { to: "/news", label: "News", icon: "📰" },
  { to: "/tech", label: "AI & Technology", icon: "🤖" },
  { to: "/earn", label: "Earn Money", icon: "💰" },
  { to: "/finance", label: "Finance", icon: "📈" },
  { to: "/career", label: "Career & Learning", icon: "🎓" },
  { to: "/projects", label: "Projects", icon: "🛠️" },
  { to: "/youtube", label: "YouTube Studio", icon: "🎬" },
  { to: "/reports", label: "Reports", icon: "📊" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];
const BOTTOM = ["/", "/day", "/news", "/finance"];

export function openAssistant(prompt?: string) {
  window.dispatchEvent(new CustomEvent("lifeos:assistant", { detail: { prompt } }));
}

export function Shell({ children, onLock, canLock }: { children: ReactNode; onLock: () => void; canLock: boolean }) {
  const s = useSettings();
  const nav = useNavigate();
  const loc = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [asst, setAsst] = useState<{ open: boolean; prompt?: string }>({ open: false });
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(true); } };
    const a = (e: Event) => setAsst({ open: true, prompt: (e as CustomEvent).detail?.prompt });
    window.addEventListener("keydown", k);
    window.addEventListener("lifeos:assistant", a);
    return () => { window.removeEventListener("keydown", k); window.removeEventListener("lifeos:assistant", a); };
  }, []);
  useEffect(() => { setMore(false); mainRef.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, [loc.pathname]);

  const link = (n: (typeof NAV)[number], cls = "nav-link") => (
    <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => `${cls} ${isActive ? "active" : ""}`}>
      <span className="nav-ico" aria-hidden="true">{n.icon}</span><span>{n.label}</span>
    </NavLink>
  );
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <div className="ambient" aria-hidden="true"><i /><i /><i /></div>
      <div className="shell">
        <nav className="sidebar" aria-label="Main">
          <div className="brand"><span className="logo" aria-hidden="true">◐</span> LIFE OS</div>
          {NAV.map((n) => link(n))}
          <div className="sp" />
          <p className="tiny muted" style={{ padding: "8px 12px" }}>{s.name ? `Signed in locally as ${s.name}` : "Local-first · your data stays on this device"}</p>
        </nav>
        <main className="main" id="main" tabIndex={-1} ref={mainRef} style={{ outline: "none" }}>
          <div className="topbar">
            <button className="search-btn" onClick={() => setSearchOpen(true)} aria-label="Search everything">🔎 <span>Search tasks, news, notes, projects…</span><kbd>Ctrl K</kbd></button>
            <div className="grow" />
            <button className="icon-btn" aria-label="Open AI assistant" onClick={() => setAsst({ open: true })}>✨</button>
            <button className="icon-btn" aria-label={`Switch to ${s.theme === "dark" ? "light" : "dark"} theme`} onClick={() => saveSettings({ theme: s.theme === "dark" ? "light" : "dark" })}>{s.theme === "dark" ? "☀️" : "🌙"}</button>
            {canLock && <button className="icon-btn" aria-label="Lock app" onClick={onLock}>🔒</button>}
          </div>
          {children}
        </main>
      </div>
      <nav className="bottomnav" aria-label="Main (mobile)">
        {NAV.filter((n) => BOTTOM.includes(n.to)).map((n) => link(n, ""))}
        <button onClick={() => setMore(true)} aria-label="More sections"><span className="nav-ico" aria-hidden="true">☰</span>More</button>
      </nav>
      {more && (
        <Modal title="All sections" onClose={() => setMore(false)}>
          <div className="grid g2">{NAV.map((n) => (<button key={n.to} className="btn" onClick={() => { nav(n.to); setMore(false); }}><span aria-hidden="true">{n.icon}</span> {n.label}</button>))}</div>
        </Modal>
      )}
      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
      {asst.open && <Assistant initialPrompt={asst.prompt} onClose={() => setAsst({ open: false })} />}
    </>
  );
}

const KIND_ICON: Record<SearchHit["kind"], string> = { task: "✅", note: "📝", article: "📰", opportunity: "💰", project: "🛠️", projectItem: "🔧", idea: "🎬", bookmark: "🔖", briefing: "📊", learning: "🎓" };
function SearchPalette({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 180);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  useEffect(() => { let live = true; if (!dq.trim()) { setHits(null); return; } universalSearch(dq).then((h) => live && setHits(h)); return () => { live = false; }; }, [dq]);
  const go = (h: SearchHit) => { onClose(); nav(h.route); };
  return (
    <Modal title="Search" onClose={onClose} wide>
      <input type="search" data-autofocus aria-label="Search everything" placeholder="Search tasks, news, notes, opportunities, projects, video ideas…" value={q} onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && hits?.[0]) go(hits[0]); }} />
      <div className="col" style={{ marginTop: 12 }} aria-live="polite">
        {hits === null && <p className="muted small">Type to search across everything you've saved. Use the Saved tab in My Day to bookmark things.</p>}
        {hits?.length === 0 && <p className="muted">No results for “{dq}”.</p>}
        {hits?.map((h) => (
          <button key={h.kind + h.id} className="mini" style={{ textAlign: "left", cursor: "pointer", color: "inherit" }} onClick={() => go(h)}>
            <div className="row nw"><span aria-hidden="true">{KIND_ICON[h.kind]}</span><span className="strong grow">{h.title}</span><Chip>{h.kind}</Chip></div>
            <div className="small muted" style={{ marginTop: 2 }}>{h.snippet}</div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function Assistant({ onClose, initialPrompt }: { onClose: () => void; initialPrompt?: string }) {
  const s = useSettings();
  const msgs = useLiveQuery(() => db.chat.orderBy("createdAt").toArray(), [], []);
  const [input, setInput] = useState(initialPrompt ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState<AiPending | LocalPending | null>(null);
  const [decisions, setDecisions] = useState<Record<string, boolean>>({});
  const history = useRef<ApiMessage[]>([]);
  const carry = useRef("");
  const endRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs, pending, busy]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);

  const say = (content: string) => db.chat.add({ id: uid(), role: "assistant", content, createdAt: new Date().toISOString() });
  const finish = async (o: { text: string; messages: ApiMessage[]; pending: AiPending | LocalPending | null }) => {
    if (o.messages.length) history.current = o.messages;
    carry.current = o.pending ? o.text : "";
    if (o.text && !o.pending) await say(o.text);
    else if (o.text && o.pending?.kind === "local") await say(o.text);
    setPending(o.pending);
    setDecisions(Object.fromEntries((o.pending?.actions ?? []).map((a) => [a.id, true])));
  };
  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setBusy(true); setErr(null); setInput("");
    try { await finish(await sendToAssistant(s, history.current, text.trim())); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  useEffect(() => { if (initialPrompt && !sentInitial.current) { sentInitial.current = true; void send(initialPrompt); } /* eslint-disable-next-line */ }, []);

  const apply = async () => {
    if (!pending) return;
    setBusy(true); setErr(null);
    try {
      if (pending.kind === "local") { await say(await applyLocalActions(s, pending, decisions)); setPending(null); }
      else { const o = await resumeAiTurn(s, pending, decisions, carry.current); setPending(null); await finish(o); }
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  const approved = pending ? pending.actions.filter((a: PendingAction) => decisions[a.id]).length : 0;

  return (
    <aside className="drawer" role="dialog" aria-label="AI assistant">
      <div className="row nw" style={{ padding: 14, borderBottom: "1px solid var(--border)" }}>
        <h2 className="grow">✨ Assistant</h2>
        <Chip kind={aiReady(s) ? "ok" : "warn"}>{aiReady(s) ? "AI connected" : "Offline mode"}</Chip>
        <Btn sm kind="ghost" onClick={async () => { await db.chat.clear(); history.current = []; setPending(null); }} aria-label="Clear conversation">Clear</Btn>
        <button className="icon-btn" aria-label="Close assistant" onClick={onClose}>✕</button>
      </div>
      <div className="chat" aria-live="polite">
        {msgs.length === 0 && (
          <div className="col">
            <p className="small">Ask me about your day, tasks, news, money or projects. I read your real data and always ask before changing anything.</p>
            {["Plan my day", "Show my overdue tasks", "What are today's five most important updates?", "Review my progress this week"].map((p) => <button key={p} className="chip" style={{ cursor: "pointer", padding: "8px 12px" }} onClick={() => void send(p)}>{p}</button>)}
            {!aiReady(s) && <Notice kind="info">Offline mode runs a fixed set of commands on your data. Add an Anthropic API key in Settings → AI for open-ended help.</Notice>}
          </div>
        )}
        {msgs.map((m) => <div key={m.id} className={`msg ${m.role === "user" ? "user" : "ai"}`}>{m.content}</div>)}
        {pending && (
          <div className="msg ai" style={{ maxWidth: "100%" }}>
            <strong>Confirm before I make changes</strong>
            <div className="col" style={{ marginTop: 8 }}>
              {pending.actions.map((a: PendingAction) => (
                <label key={a.id} className="check small" style={{ alignItems: "flex-start" }}>
                  <input type="checkbox" checked={!!decisions[a.id]} onChange={(e) => setDecisions({ ...decisions, [a.id]: e.target.checked })} /> <span>{a.summary}</span>
                </label>
              ))}
              <div className="row"><Btn kind="primary" sm onClick={apply} disabled={busy}>{approved ? `Apply ${approved}` : "Skip all"}</Btn></div>
            </div>
          </div>
        )}
        {busy && <Spinner label="Thinking…" />}
        {err && <Notice kind="danger">{err}</Notice>}
        <div ref={endRef} />
      </div>
      <form className="row nw" style={{ padding: 12, borderTop: "1px solid var(--border)", paddingBottom: "calc(12px + env(safe-area-inset-bottom))" }} onSubmit={(e) => { e.preventDefault(); void send(input); }}>
        <input type="text" aria-label="Message the assistant" placeholder="Ask or give a command…" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="off" />
        <Btn kind="primary" type="submit" disabled={busy || !input.trim()}>Send</Btn>
      </form>
    </aside>
  );
}
