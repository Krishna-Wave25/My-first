import test from "node:test";
import assert from "node:assert/strict";
import { makeLimiter, parseBody } from "../src/guard.ts";

test("parseBody validates question", () => {
  assert.deepEqual(parseBody(null), { error: "question is required" });
  assert.deepEqual(parseBody({ question: "   " }), { error: "question is empty" });
  assert.ok("error" in parseBody({ question: "x".repeat(501) }));
  assert.deepEqual(parseBody({ question: " What is SIP? " }), { question: "What is SIP?", history: [] });
});

test("parseBody cleans history into valid alternating turns", () => {
  const r = parseBody({ question: "q", history: [
    { role: "assistant", content: "orphan" },
    { role: "user", content: "a" }, { role: "user", content: "dup" },
    { role: "assistant", content: "b" }, { role: "user", content: "dangling" },
  ] });
  assert.ok(!("error" in r));
  if (!("error" in r)) assert.deepEqual(r.history.map((t) => t.role), ["user", "assistant"]);
  assert.ok("error" in parseBody({ question: "q", history: [{ role: "system", content: "x" }] }));
  assert.ok("error" in parseBody({ question: "q", history: "nope" }));
});

test("limiter allows max per window then resets", () => {
  let t = 0; const lim = makeLimiter(2, 1000, () => t);
  assert.ok(lim("a")); assert.ok(lim("a")); assert.equal(lim("a"), false);
  assert.ok(lim("b"));
  t = 1001; assert.ok(lim("a"));
});
