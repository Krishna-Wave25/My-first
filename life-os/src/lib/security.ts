/** App lock. Protects the UI (not the on-disk database) — see README "Privacy & security". */
const KEY = "lifeos-pin";
const FAIL = "lifeos-pin-fail";
const ITER = 150000;

const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b as ArrayBuffer)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(pin: string, salt: Uint8Array, iter: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt as BufferSource, iterations: iter, hash: "SHA-256" }, key, 256);
  return b64(bits);
}

export const hasPin = () => { try { return !!localStorage.getItem(KEY); } catch { return false; } };

export async function setPin(pin: string) {
  if (!/^\d{4,8}$/.test(pin)) throw new Error("PIN must be 4–8 digits");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(KEY, JSON.stringify({ salt: b64(salt), hash: await derive(pin, salt, ITER), iter: ITER }));
  localStorage.removeItem(FAIL);
}
export function removePin() { localStorage.removeItem(KEY); localStorage.removeItem(FAIL); }

interface Fail { count: number; until: number }
const readFail = (): Fail => { try { return JSON.parse(localStorage.getItem(FAIL) ?? "") as Fail; } catch { return { count: 0, until: 0 }; } };
export const lockoutMs = (now = Date.now()) => Math.max(0, readFail().until - now);

/** Returns "ok" | "wrong" | "locked". After 5 wrong tries the lockout doubles from 30 s. */
export async function verifyPin(pin: string): Promise<"ok" | "wrong" | "locked"> {
  if (lockoutMs() > 0) return "locked";
  const raw = localStorage.getItem(KEY);
  if (!raw) return "ok";
  const { salt, hash, iter } = JSON.parse(raw) as { salt: string; hash: string; iter: number };
  const got = await derive(pin, unb64(salt), iter);
  let diff = got.length ^ hash.length; // constant-time-ish compare
  for (let i = 0; i < Math.max(got.length, hash.length); i++) diff |= (got.charCodeAt(i) || 0) ^ (hash.charCodeAt(i) || 0);
  if (diff === 0) { localStorage.removeItem(FAIL); return "ok"; }
  const f = readFail();
  const count = f.count + 1;
  const until = count >= 5 ? Date.now() + 30000 * Math.pow(2, Math.floor(count / 5) - 1) : 0;
  localStorage.setItem(FAIL, JSON.stringify({ count, until }));
  return "wrong";
}
