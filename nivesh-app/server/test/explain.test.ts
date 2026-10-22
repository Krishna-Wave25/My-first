import test from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { explain, SYSTEM_PROMPT } from "../src/explain.ts";

const fake = (impl: (p: any) => Promise<any>) => ({ beta: { messages: { create: impl } } }) as any;

test("returns text and sends guardrail prompt, history and fallback opt-in", async () => {
  let seen: any;
  const c = fake(async (p) => { seen = p; return { stop_reason: "end_turn", content: [{ type: "thinking", thinking: "" }, { type: "text", text: "SIP is a monthly plan." }] }; });
  const r = await explain(c, "What is SIP?", [{ role: "user", content: "hi" }, { role: "assistant", content: "hello" }]);
  assert.deepEqual(r, { ok: true, answer: "SIP is a monthly plan." });
  assert.equal(seen.system, SYSTEM_PROMPT);
  assert.equal(seen.messages.length, 3);
  assert.equal(seen.messages.at(-1).content, "What is SIP?");
  assert.equal(seen.fallbacks, "default");
  assert.deepEqual(seen.output_config, { effort: "low" });
  assert.equal(seen.thinking, undefined);
  assert.equal(seen.tool_choice, undefined);
});

test("refusal becomes a friendly answer, not an error", async () => {
  const r = await explain(fake(async () => ({ stop_reason: "refusal", content: [] })), "q", []);
  assert.ok(r.ok && r.answer.includes("can't help"));
});

test("empty content is a 502", async () => {
  const r = await explain(fake(async () => ({ stop_reason: "end_turn", content: [] })), "q", []);
  assert.deepEqual(r, { ok: false, status: 502, message: "Empty answer from the model" });
});

test("rate limit from API maps to 503; other API errors to 502", async () => {
  const rl = new Anthropic.RateLimitError(429, { type: "error", error: { type: "rate_limit_error", message: "x" } } as any, "x", new Headers());
  assert.equal((await explain(fake(async () => { throw rl; }), "q", []) as any).status, 503);
  const bad = new Anthropic.BadRequestError(400, { type: "error", error: { type: "invalid_request_error", message: "x" } } as any, "x", new Headers());
  assert.equal((await explain(fake(async () => { throw bad; }), "q", []) as any).status, 502);
});
