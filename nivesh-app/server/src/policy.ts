import { createHash } from "node:crypto";
import { makeLimiter } from "./guard.ts";

const DAY = 24 * 60 * 60 * 1000;

// Which IP is "the client"? Never trust the whole X-Forwarded-For header: the left side is client-controlled.
// Behind exactly ONE trusted proxy (Render, Fly, Cloud Run...) the right-most entry is the one that proxy appended.
export function clientIp(remote: string | undefined, xff: string | string[] | undefined, trustProxy: boolean): string {
  if (trustProxy) {
    const raw = Array.isArray(xff) ? xff.join(",") : xff;
    const last = raw?.split(",").map((s) => s.trim()).filter(Boolean).at(-1);
    if (last) return last;
  }
  return remote ?? "unknown";
}

export type Verdict = { ok: true; tier: "subscriber" | "trial" } | { ok: false; status: number; message: string };

// Cost control for the AI explainer. The app key is public (it ships inside the APK), so real limits live here:
//  - verified subscribers: per purchase token / day
//  - everyone else (free trial): per install id / day, AND one shared daily pool, so a script that rotates
//    install ids can never spend more than `trialPool` answers a day in total.
export function makeAccessPolicy(o: {
  verify?: (token: string) => Promise<{ active: boolean }>;
  now?: () => number;
  subscriberPerDay?: number; trialPerInstallPerDay?: number; trialPoolPerDay?: number; cacheMs?: number;
}) {
  const now = o.now ?? Date.now;
  const subLimit = makeLimiter(o.subscriberPerDay ?? 80, DAY, now);
  const instLimit = makeLimiter(o.trialPerInstallPerDay ?? 10, DAY, now);
  const pool = makeLimiter(o.trialPoolPerDay ?? 500, DAY, now);
  const cacheMs = o.cacheMs ?? 10 * 60_000;
  const cache = new Map<string, { at: number; active: boolean }>();
  const h = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 24);

  async function isSubscriber(token: string): Promise<boolean> {
    if (!o.verify) return false;
    const k = h(token), c = cache.get(k);
    if (c && now() - c.at < cacheMs) return c.active;
    try {
      const active = (await o.verify(token)).active;
      cache.set(k, { at: now(), active });
      if (cache.size > 5000) for (const [kk, v] of cache) if (now() - v.at > cacheMs) cache.delete(kk);
      return active;
    } catch {
      return false; // Google unreachable: treat as trial rather than failing open
    }
  }

  return {
    async check(a: { installId?: string; purchaseToken?: string }): Promise<Verdict> {
      if (a.purchaseToken && (await isSubscriber(a.purchaseToken))) {
        return subLimit(h(a.purchaseToken)) ? { ok: true, tier: "subscriber" } : { ok: false, status: 429, message: "Daily question limit reached. Please try again tomorrow." };
      }
      if (!a.installId || !/^[A-Za-z0-9_-]{8,64}$/.test(a.installId)) return { ok: false, status: 400, message: "missing install id" };
      if (!instLimit(a.installId)) return { ok: false, status: 429, message: "Daily question limit reached. Please try again tomorrow." };
      if (!pool("all")) return { ok: false, status: 429, message: "The explainer is very busy today. Please try again tomorrow." };
      return { ok: true, tier: "trial" };
    },
  };
}
