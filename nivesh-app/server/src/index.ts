import { createServer, type IncomingMessage } from "node:http";
import Anthropic from "@anthropic-ai/sdk";
import { explain } from "./explain.ts";
import { makeLimiter, parseBody } from "./guard.ts";

const PORT = Number(process.env.PORT ?? 8787);
const APP_KEY = process.env.APP_KEY; // shared secret sent by the app. Replace with Play-purchase verification before launch.
const client = new Anthropic(); // reads ANTHROPIC_API_KEY (or an `ant auth login` profile) from the environment

const perIp = makeLimiter(30, 60 * 60 * 1000); // 30 questions / hour / IP
const global = makeLimiter(2000, 24 * 60 * 60 * 1000); // daily spend cap across all users

const send = (res: import("node:http").ServerResponse, status: number, body: object) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
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

createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
    if (req.method !== "POST" || req.url !== "/explain") return send(res, 404, { error: "not found" });
    if (!APP_KEY || req.headers["x-app-key"] !== APP_KEY) return send(res, 401, { error: "unauthorized" });
    const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "?").split(",")[0].trim();
    if (!perIp(ip) || !global("all")) return send(res, 429, { error: "Too many questions. Please try again later." });

    let body: unknown;
    try { body = await readJson(req); } catch { return send(res, 400, { error: "invalid JSON body" }); }
    const parsed = parseBody(body);
    if ("error" in parsed) return send(res, 400, { error: parsed.error });

    const out = await explain(client, parsed.question, parsed.history);
    return out.ok ? send(res, 200, { answer: out.answer }) : send(res, out.status, { error: out.message });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: "server error" });
  }
}).listen(PORT, () => console.log(`Nivesh server on :${PORT}${APP_KEY ? "" : "  (APP_KEY not set: all requests will be rejected)"}`));
