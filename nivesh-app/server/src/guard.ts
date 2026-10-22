import { createHmac, timingSafeEqual } from "node:crypto";

export type Turn = { role: "user" | "assistant"; content: string; sig?: string };
export type Parsed = { question: string; history: Turn[] };

const MAX_Q = 500;
const MAX_TURN = 1500;
const MAX_HISTORY = 6;

// Assistant turns in the history are only accepted if WE signed them. This stops a client from forging
// "earlier replies" (e.g. an assistant that already agreed to give buy/sell tips) to jailbreak the model.
export function makeSigner(secret: string) {
  const sign = (content: string) => createHmac("sha256", secret).update(content).digest("base64url").slice(0, 32);
  const verify = (content: string, sig: unknown) => {
    if (typeof sig !== "string" || sig.length !== 32) return false;
    return timingSafeEqual(Buffer.from(sign(content)), Buffer.from(sig));
  };
  return { sign, verify };
}
export type Signer = ReturnType<typeof makeSigner>;

export function parseBody(body: unknown, signer: Signer): Parsed | { error: string } {
  const b = body as { question?: unknown; history?: unknown } | null;
  if (!b || typeof b.question !== "string") return { error: "question is required" };
  const question = b.question.trim();
  if (!question) return { error: "question is empty" };
  if (question.length > MAX_Q) return { error: `question too long (max ${MAX_Q} characters)` };

  const history: Turn[] = [];
  if (b.history !== undefined) {
    if (!Array.isArray(b.history)) return { error: "history must be an array" };
    for (const t of b.history.slice(-MAX_HISTORY)) {
      const r = (t as Turn)?.role, c = (t as Turn)?.content;
      if ((r !== "user" && r !== "assistant") || typeof c !== "string") return { error: "invalid history entry" };
      const content = c.slice(0, MAX_TURN);
      if (r === "assistant" && !(c.length <= MAX_TURN && signer.verify(c, (t as Turn).sig))) continue; // unsigned/forged: drop
      history.push({ role: r, content });
    }
    // The API needs alternating turns that start with "user"; drop leading assistant turns and merge repeats.
    while (history.length && history[0].role !== "user") history.shift();
    for (let i = history.length - 1; i > 0; i--) {
      if (history[i].role === history[i - 1].role) history.splice(i, 1);
    }
    if (history.length && history[history.length - 1].role === "user") history.pop();
  }
  return { question, history };
}

// Fixed-window in-memory limiter (per key). Fine for one server instance; use Redis if you scale out.
export function makeLimiter(max: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, { n: number; reset: number }>();
  return (key: string): boolean => {
    const t = now();
    const h = hits.get(key);
    if (!h || t >= h.reset) {
      hits.set(key, { n: 1, reset: t + windowMs });
      if (hits.size > 10_000) for (const [k, v] of hits) if (t >= v.reset) hits.delete(k);
      return true;
    }
    if (h.n >= max) return false;
    h.n++;
    return true;
  };
}
