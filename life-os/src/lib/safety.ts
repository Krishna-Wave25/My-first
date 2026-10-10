/**
 * Wiring safety linter. It only flags *risks it can see in the data you entered*.
 * A connection that passes here is NOT certified safe — always verify with a multimeter,
 * the component datasheets, and your supervisor before powering a circuit.
 */
export interface Connection {
  from: string;
  to: string;
  signal: string; // e.g. "5V", "GND", "A0", "PWM"
  voltage?: number | null; // volts on this line
  currentA?: number | null; // expected max current in amps
  wireAwg?: number | null; // optional wire gauge
  fused?: boolean;
  status: "confirmed" | "proposed";
  verifiedBy?: string; // how it was verified (multimeter, datasheet...)
}
export interface SafetyFlag { level: "danger" | "warn" | "info"; message: string }

const LOGIC_PIN = /\b(arduino|uno|nano|mega|esp32|esp8266|mcu|microcontroller)\b.*\b(a\d|d\d+|pin|analog|gpio)\b|\b(a\d|d\d+|gpio\d*)\b/i;
const ESP = /\besp(32|8266)?\b/i;
// max continuous amps by AWG (chassis wiring, conservative)
const AWG_MAX_A: Record<number, number> = { 10: 30, 12: 20, 14: 15, 16: 10, 18: 7, 20: 5, 22: 3, 24: 2, 26: 1.5, 28: 1 };

export function lintConnection(c: Connection): SafetyFlag[] {
  const f: SafetyFlag[] = [];
  const target = `${c.to} ${c.signal}`;
  const isLogic = LOGIC_PIN.test(c.to) || LOGIC_PIN.test(c.signal);
  if (c.voltage != null && isLogic) {
    const max = ESP.test(c.to) ? 3.3 : 5;
    if (c.voltage > max) f.push({ level: "danger", message: `${c.voltage} V on a ${max} V logic pin (${c.to}). Use a voltage divider or sensor module rated for the input; this can destroy the board.` });
  }
  if (c.voltage != null && c.voltage > 12 && !c.fused) f.push({ level: "danger", message: `${c.voltage} V line without a fuse/breaker. Add a fuse sized for the wire and load.` });
  if (c.voltage != null && c.voltage >= 50) f.push({ level: "danger", message: `${c.voltage} V is above ELV (50 V). Needs insulation, enclosure and supervision before handling.` });
  if (/\bbat(tery)?\b|\bpack\b/i.test(c.from + " " + c.to) && !c.fused && (c.currentA ?? 0) > 0.5)
    f.push({ level: "danger", message: "Battery connection with no fuse: a short can cause overheating or fire. Fuse close to the battery positive terminal." });
  if (c.currentA != null && c.wireAwg != null) {
    const max = AWG_MAX_A[c.wireAwg];
    if (max && c.currentA > max) f.push({ level: "danger", message: `${c.currentA} A exceeds a safe ~${max} A for ${c.wireAwg} AWG wire. Use a thicker wire.` });
  }
  if (/\b(mains|230\s?v|220\s?v|ac)\b/i.test(target) || (c.voltage != null && c.voltage >= 110))
    f.push({ level: "danger", message: "Mains-level voltage: do not wire or test without qualified supervision and isolation." });
  if (/\bgnd\b|ground/i.test(c.signal) === false && /\b(5v|3\.?3v|vcc|vin|12v|24v)\b/i.test(c.signal) && /\bgnd\b/i.test(c.to))
    f.push({ level: "warn", message: "Supply signal wired directly to GND — likely a short circuit. Check the entry." });
  if (c.status === "proposed") f.push({ level: "info", message: "Proposed — not verified. Do not power this connection until it is confirmed." });
  if (c.status === "confirmed" && !(c.verifiedBy ?? "").trim()) f.push({ level: "warn", message: "Marked confirmed but no verification noted. Record how it was checked (multimeter, datasheet, continuity test)." });
  return f;
}

/** Cross-connection checks: shared ground etc. */
export function lintSystem(conns: Connection[]): SafetyFlag[] {
  const f: SafetyFlag[] = [];
  const grounds = conns.filter((c) => /gnd|ground/i.test(c.signal));
  const devices = new Set<string>();
  conns.forEach((c) => { devices.add(c.from.trim().toLowerCase()); devices.add(c.to.trim().toLowerCase()); });
  if (conns.length && devices.size > 1 && grounds.length === 0)
    f.push({ level: "warn", message: "No ground connections recorded. Devices exchanging signals need a common ground reference." });
  const dupTargets = new Map<string, number>();
  conns.forEach((c) => { const k = `${c.to.trim().toLowerCase()}|${c.signal.trim().toLowerCase()}`; dupTargets.set(k, (dupTargets.get(k) ?? 0) + 1); });
  for (const [k, n] of dupTargets) if (n > 1 && !/gnd|ground/.test(k)) f.push({ level: "warn", message: `Pin "${k.replace("|", " / ")}" is driven by ${n} connections — possible conflict.` });
  return f;
}

export const worstLevel = (flags: SafetyFlag[]): SafetyFlag["level"] | null =>
  flags.some((x) => x.level === "danger") ? "danger" : flags.some((x) => x.level === "warn") ? "warn" : flags.length ? "info" : null;
