import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { explain } from "./explain.ts";
import { makeLimiter, makeSigner, parseBody } from "./guard.ts";
import { makePlayVerifier } from "./play.ts";
import { clientIp, makeAccessPolicy } from "./policy.ts";

const PORT = Number(process.env.PORT ?? 8787);
// APP_KEY ships inside the APK, so it is public. It only filters casual traffic; real limits are in policy.ts.
const APP_KEY = process.env.APP_KEY;
// Set TRUST_PROXY=1 only when running behind exactly one reverse proxy (Render, Fly, Cloud Run, ...).
const TRUST_PROXY = process.env.TRUST_PROXY === "1";
const signer = makeSigner(process.env.HISTORY_SECRET ?? randomBytes(32).toString("hex")); // random => chat history resets on restart
const client = new Anthropic(); // reads ANTHROPIC_API_KEY (or an `ant auth login` profile) from the environment

// Google Play verification (optional until you have a Play Console service account).
const PACKAGE_NAME = process.env.ANDROID_PACKAGE_NAME ?? "com.nivesh.app";
const PRODUCT_ID = process.env.PLAY_SUBSCRIPTION_ID ?? "nivesh_pro";
const verifier = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  ? makePlayVerifier({ sa: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON), packageName: PACKAGE_NAME, productId: PRODUCT_ID })
  : null;
const policy = makeAccessPolicy({ verify: verifier ?? undefined });

const ipExplain = makeLimiter(60, 60 * 60 * 1000); // 60 questions / hour / IP (second layer, behind per-install and per-token limits)
const ipVerify = makeLimiter(120, 60 * 60 * 1000); // looser: subscription re-checks are cheap and legitimate
const globalDaily = makeLimiter(3000, 24 * 60 * 60 * 1000); // hard daily spend ceiling; counted only for valid requests

const send = (res: ServerResponse, status: number, body: object) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};
const header = (req: IncomingMessage, name: string) => {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
};

function readJson(req: IncomingMessage, limit = 20_000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > limit) { reject(new Error("too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || "null")); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
    const isVerify = req.method === "POST" && req.url === "/verify-subscription";
    const isExplain = req.method === "POST" && req.url === "/explain";
    if (!isVerify && !isExplain) return send(res, 404, { error: "not found" });
    if (!APP_KEY || header(req, "x-app-key") !== APP_KEY) return send(res, 401, { error: "unauthorized" });
    const ip = clientIp(req.socket.remoteAddress, req.headers["x-forwarded-for"], TRUST_PROXY);

    if (isVerify) {
      if (!verifier) return send(res, 501, { error: "Play verification is not configured on the server" });
      if (!ipVerify(ip)) return send(res, 429, { error: "Too many requests." });
      let b: any;
      try { b = await readJson(req); } catch { return send(res, 400, { error: "invalid JSON body" }); }
      const tok = typeof b?.purchaseToken === "string" ? b.purchaseToken : "";
      if (tok.length < 10 || tok.length > 2000) return send(res, 400, { error: "invalid purchaseToken" });
      try { return send(res, 200, await verifier(tok)); }
      catch (e) { console.error("verify failed", (e as Error).message); return send(res, 502, { error: "Could not verify with Google Play" }); }
    }

    if (!ipExplain(ip)) return send(res, 429, { error: "Too many questions. Please try again later." });
    let body: unknown;
    try { body = await readJson(req); } catch { return send(res, 400, { error: "invalid JSON body" }); }
    const parsed = parseBody(body, signer);
    if ("error" in parsed) return send(res, 400, { error: parsed.error });

    const verdict = await policy.check({ installId: header(req, "x-install-id"), purchaseToken: header(req, "x-purchase-token") });
    if (!verdict.ok) return send(res, verdict.status, { error: verdict.message });
    if (!globalDaily("all")) return send(res, 429, { error: "The explainer is very busy today. Please try again tomorrow." });

    const out = await explain(client, parsed.question, parsed.history);
    return out.ok ? send(res, 200, { answer: out.answer, sig: signer.sign(out.answer) }) : send(res, out.status, { error: out.message });
  } catch (e) {
    console.error("server error", (e as Error).message);
    send(res, 500, { error: "server error" });
  }
});
server.requestTimeout = 60_000; // total time for a request incl. the AI call
server.headersTimeout = 15_000;
server.listen(PORT, () => console.log(`Nivesh server on :${PORT}${APP_KEY ? "" : "  (APP_KEY not set: all requests will be rejected)"}${TRUST_PROXY ? "  (trusting 1 proxy hop)" : ""}`));
