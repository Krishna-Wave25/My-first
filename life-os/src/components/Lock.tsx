import { useEffect, useState } from "react";
import { lockoutMs, verifyPin } from "../lib/security";

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(lockoutMs());
  useEffect(() => { if (!wait) return; const t = setInterval(() => { const r = lockoutMs(); setWait(r); if (!r) setMsg(""); }, 500); return () => clearInterval(t); }, [wait]);

  const submit = async (p: string) => {
    setBusy(true);
    const r = await verifyPin(p);
    setBusy(false); setPin("");
    if (r === "ok") return onUnlock();
    if (r === "locked") { setWait(lockoutMs()); setMsg("Too many attempts."); } else { setWait(lockoutMs()); setMsg(lockoutMs() ? "Too many attempts." : "Wrong PIN"); }
  };
  const press = (d: string) => { if (busy || wait) return; const n = (pin + d).slice(0, 8); setPin(n); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === "Backspace") setPin((p) => p.slice(0, -1)); else if (e.key === "Enter" && pin.length >= 4) void submit(pin); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });
  return (
    <div className="lock" role="dialog" aria-modal="true" aria-label="App locked">
      <div className="card" style={{ width: "min(360px, 100%)", textAlign: "center" }}>
        <div className="brand" style={{ justifyContent: "center" }}><span className="logo" aria-hidden="true">◐</span> LIFE OS</div>
        <p className="small">Enter your PIN</p>
        <div className="pin" aria-label={`${pin.length} digits entered`}>{Array.from({ length: Math.max(4, pin.length) }).map((_, i) => <i key={i} className={i < pin.length ? "on" : ""} />)}</div>
        <p role="alert" className="small" style={{ minHeight: 22, color: "var(--danger)" }}>{wait ? `${msg} Try again in ${Math.ceil(wait / 1000)} s.` : msg}</p>
        <div className="keypad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => <button key={d} aria-label={d} onClick={() => press(d)}>{d}</button>)}
          <button aria-label="Delete" onClick={() => setPin((p) => p.slice(0, -1))}>⌫</button>
          <button aria-label="0" onClick={() => press("0")}>0</button>
          <button aria-label="Unlock" disabled={pin.length < 4 || busy || !!wait} onClick={() => void submit(pin)} style={{ background: "var(--grad)", color: "var(--accent-ink)" }}>→</button>
        </div>
      </div>
    </div>
  );
}
