import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";

/* ---------- toasts ---------- */
interface Toast { id: number; msg: string; kind: "ok" | "err" | "" }
const ToastCtx = createContext<(msg: string, kind?: Toast["kind"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((msg: string, kind: Toast["kind"] = "") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x.slice(-3), { id, msg, kind }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), kind === "err" ? 6000 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (<div key={t.id} className={`toast ${t.kind}`}>{t.msg}</div>))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- confirm ---------- */
export function useConfirm() {
  const [state, setState] = useState<{ msg: string; resolve: (v: boolean) => void; danger: boolean } | null>(null);
  const confirm = useCallback((msg: string, danger = true) => new Promise<boolean>((resolve) => setState({ msg, resolve, danger })), []);
  const node = state ? (
    <Modal title="Please confirm" onClose={() => { state.resolve(false); setState(null); }} small>
      <p style={{ marginBottom: 16 }}>{state.msg}</p>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <Btn onClick={() => { state.resolve(false); setState(null); }}>Cancel</Btn>
        <Btn kind={state.danger ? "danger" : "primary"} onClick={() => { state.resolve(true); setState(null); }}>Confirm</Btn>
      </div>
    </Modal>
  ) : null;
  return { confirm, node };
}

/* ---------- basics ---------- */
export function Btn({ kind = "", sm, children, ...rest }: { kind?: "" | "primary" | "danger" | "ghost"; sm?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...rest} className={`btn ${kind} ${sm ? "sm" : ""} ${rest.className ?? ""}`}>{children}</button>;
}
export function Chip({ children, tint, kind = "", ...rest }: { children: ReactNode; tint?: string; kind?: "" | "ok" | "warn" | "danger" | "info" } & React.HTMLAttributes<HTMLSpanElement>) {
  return <span {...rest} className={`chip ${tint || kind ? "tint" : ""} ${kind}`} style={tint ? ({ "--tint": tint } as React.CSSProperties) : undefined}>{children}</span>;
}
export function Card({ title, icon, actions, children, className = "", id }: { title?: ReactNode; icon?: string; actions?: ReactNode; children: ReactNode; className?: string; id?: string }) {
  return (
    <section className={`card fade-in ${className}`} id={id}>
      {title && (
        <div className="card-h">
          <h3>{icon && <span aria-hidden="true">{icon}</span>}{title}</h3>
          {actions && <div className="row">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
export const Notice = ({ kind = "", children }: { kind?: "" | "warn" | "danger" | "ok" | "info"; children: ReactNode }) => <div className={`notice ${kind}`} role={kind === "danger" ? "alert" : undefined}>{children}</div>;
export function Empty({ icon = "✨", title, children, action }: { icon?: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="empty"><div className="big" aria-hidden="true">{icon}</div><h4 style={{ color: "var(--text)" }}>{title}</h4>{children && <p>{children}</p>}{action}</div>;
}
export const Spinner = ({ label }: { label?: string }) => <span className="row" style={{ gap: 8 }}><span className="spinner" role="progressbar" aria-label={label ?? "Loading"} />{label && <span className="muted small">{label}</span>}</span>;
export const Skeleton = ({ h = 16, w = "100%" }: { h?: number; w?: string | number }) => <div className="skeleton" style={{ height: h, width: w }} aria-hidden="true" />;
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <span className="tiny muted">{hint}</span>}</label>;
}
export function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}<span className="sr-only"> (opens in a new tab)</span></a>;
}

/* ---------- tabs (URL-synced) ---------- */
export function useTab(def: string, valid?: string[]): [string, (t: string) => void] {
  const [sp, setSp] = useSearchParams();
  const raw = sp.get("tab") ?? def;
  const tab = !valid || valid.includes(raw) ? raw : def;
  return [tab, (t) => setSp((p) => { const n = new URLSearchParams(p); n.set("tab", t); return n; }, { replace: true })];
}
export function Tabs({ tabs, value, onChange, label }: { tabs: { id: string; label: string; badge?: number | string }[]; value: string; onChange: (id: string) => void; label: string }) {
  const onKey = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === value);
    if (e.key === "ArrowRight") onChange(tabs[(i + 1) % tabs.length].id);
    if (e.key === "ArrowLeft") onChange(tabs[(i - 1 + tabs.length) % tabs.length].id);
  };
  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKey}>
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} tabIndex={value === t.id ? 0 : -1} className="tab" onClick={() => onChange(t.id)}>
          {t.label}{t.badge !== undefined && t.badge !== 0 ? ` · ${t.badge}` : ""}
        </button>
      ))}
    </div>
  );
}

/* ---------- modal ---------- */
export function Modal({ title, onClose, children, wide, small }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; small?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current!;
    const focusable = () => Array.from(el.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter((x) => !x.hasAttribute("disabled"));
    (el.querySelector<HTMLElement>("[data-autofocus]") ?? focusable()[1] ?? focusable()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key === "Tab") {
        const f = focusable();
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    el.addEventListener("keydown", onKey);
    return () => { el.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "wide" : ""}`} style={small ? { width: "min(420px,100%)" } : undefined} role="dialog" aria-modal="true" aria-labelledby={id} ref={ref}>
        <div className="modal-h"><h2 id={id}>{title}</h2><button className="icon-btn" aria-label="Close dialog" onClick={onClose}>✕</button></div>
        {children}
      </div>
    </div>
  );
}

/* ---------- progress & charts ---------- */
export function Bar({ value, max = 100, tone = "", label = "Progress" }: { value: number; max?: number; tone?: "" | "warn" | "danger"; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return <div className={`bar ${tone}`} role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>;
}
export function Ring({ value, size = 96, label }: { value: number; size?: number; label?: string }) {
  const r = size / 2 - 8, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(value)} percent`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth="9" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#rg)" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ transition: "stroke-dashoffset .6s cubic-bezier(.2,.8,.3,1)" }} />
        <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--accent)" /><stop offset="1" stopColor="var(--accent-2)" /></linearGradient></defs>
      </svg>
      <span className="num">{Math.round(value)}</span>
    </div>
  );
}
export function BarChart({ data, height = 120, format = (n: number) => String(n) }: { data: { label: string; value: number; tone?: string }[]; height?: number; format?: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 100 / data.length;
  return (
    <svg viewBox={`0 0 100 ${height / 4 + 14}`} width="100%" role="img" aria-label={data.map((d) => `${d.label}: ${format(d.value)}`).join(", ")} style={{ overflow: "visible" }}>
      {data.map((d, i) => {
        const h = (d.value / max) * (height / 4);
        return (
          <g key={d.label + i}>
            <rect x={i * w + w * 0.18} y={height / 4 - h} width={w * 0.64} height={Math.max(h, d.value ? 1 : 0.4)} rx="1.6" fill={d.tone ?? "url(#bg)"} />
            <text x={i * w + w / 2} y={height / 4 + 8} textAnchor="middle" style={{ fontSize: 3.6 }}>{d.label}</text>
          </g>
        );
      })}
      <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" /><stop offset="1" stopColor="var(--accent-2)" /></linearGradient></defs>
    </svg>
  );
}
export function LineChart({ series, labels, height = 160, format = (n: number) => String(n) }: { series: { name: string; color: string; values: number[] }[]; labels: string[]; height?: number; format?: (n: number) => string }) {
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const W = 300, H = height, pad = 6;
  const x = (i: number) => pad + (i / Math.max(1, labels.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - 18 - (v / max) * (H - 30);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Chart: ${series.map((s) => `${s.name} ends at ${format(s.values[s.values.length - 1] ?? 0)}`).join("; ")}`}>
        {[0, .5, 1].map((g) => (<g key={g}><line x1={pad} x2={W - pad} y1={y(max * g)} y2={y(max * g)} stroke="var(--border)" strokeDasharray="3 3" /><text x={pad} y={y(max * g) - 3} style={{ fontSize: 9 }}>{format(Math.round(max * g))}</text></g>))}
        {series.map((s) => (
          <g key={s.name}>
            <polyline fill="none" stroke={s.color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
          </g>
        ))}
        {labels.map((l, i) => (labels.length <= 12 || i % Math.ceil(labels.length / 8) === 0 ? <text key={i} x={x(i)} y={H - 4} textAnchor="middle" style={{ fontSize: 9 }}>{l}</text> : null))}
      </svg>
      <div className="row small" style={{ gap: 14 }}>{series.map((s) => (<span key={s.name} className="row" style={{ gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: "inline-block" }} />{s.name}</span>))}</div>
    </div>
  );
}

/* ---------- misc hooks ---------- */
export function useDebounced<T>(v: T, ms = 200): T {
  const [d, setD] = useState(v);
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t); }, [v, ms]);
  return d;
}
export function useAsync() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true); setError(null);
    try { return await fn(); } catch (e) { setError((e as Error).message || "Something went wrong"); } finally { setBusy(false); }
  }, []);
  return useMemo(() => ({ busy, error, run, clear: () => setError(null) }), [busy, error, run]);
}
