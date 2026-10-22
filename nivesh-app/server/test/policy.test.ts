import test from "node:test";
import assert from "node:assert/strict";
import { clientIp, makeAccessPolicy } from "../src/policy.ts";
import { violatesPolicy, SAFE_ANSWER } from "../src/explain.ts";

test("clientIp ignores client-forged X-Forwarded-For unless a proxy is trusted, and then uses the right-most entry", () => {
  assert.equal(clientIp("1.1.1.1", "9.9.9.9, 8.8.8.8", false), "1.1.1.1");
  assert.equal(clientIp("10.0.0.1", "6.6.6.6, 2.2.2.2", true), "2.2.2.2");   // 6.6.6.6 was forged by the client
  assert.equal(clientIp("10.0.0.1", undefined, true), "10.0.0.1");
  assert.equal(clientIp(undefined, undefined, false), "unknown");
});

test("trial tier: per-install cap and a shared pool cap that rotating install ids cannot beat", async () => {
  const p = makeAccessPolicy({ trialPerInstallPerDay: 2, trialPoolPerDay: 5 });
  assert.deepEqual(await p.check({ installId: "install-0001" }), { ok: true, tier: "trial" });
  assert.equal((await p.check({ installId: "install-0001" })).ok, true);
  const third = await p.check({ installId: "install-0001" });
  assert.equal(third.ok, false); if (!third.ok) assert.equal(third.status, 429);
  // attacker rotates ids: pool (5 total, 2 already used) allows only 3 more
  let allowed = 0;
  for (let i = 0; i < 50; i++) if ((await p.check({ installId: `rotating-${i}-id` })).ok) allowed++;
  assert.equal(allowed, 3);
  const noId = await p.check({}); assert.equal(noId.ok, false); if (!noId.ok) assert.equal(noId.status, 400);
});

test("subscriber tier: verified token, cached, own limit; failed or inactive verification falls back to trial", async () => {
  let calls = 0; let t = 0;
  const p = makeAccessPolicy({ verify: async (tok) => { calls++; if (tok === "boom-token-123") throw new Error("google down"); return { active: tok === "good-token-123" }; }, now: () => t, subscriberPerDay: 2, trialPerInstallPerDay: 1 });
  assert.deepEqual(await p.check({ purchaseToken: "good-token-123", installId: "install-0001" }), { ok: true, tier: "subscriber" });
  await p.check({ purchaseToken: "good-token-123" });
  assert.equal(calls, 1, "verification result is cached");
  assert.equal((await p.check({ purchaseToken: "good-token-123" })).ok, false, "per-token daily cap");
  assert.deepEqual(await p.check({ purchaseToken: "bad-token-1234", installId: "install-0002" }), { ok: true, tier: "trial" });
  assert.equal((await p.check({ purchaseToken: "boom-token-123", installId: "install-0003" })).ok, true, "Google outage => trial tier, not free access");
  assert.equal((await p.check({ purchaseToken: "boom-token-123", installId: "install-0003" })).ok, false, "...and still capped");
});

test("output filter catches directives and return promises, not normal teaching", () => {
  for (const bad of ["You should buy Reliance now.", "This gives guaranteed returns of 20%.", "I recommend you buy HDFC Bank.", "It is a risk-free profit."])
    assert.equal(violatesPolicy(bad), true, bad);
  for (const good of ["A SIP invests a fixed amount monthly.", "No one can guarantee returns; markets can fall.", "Some people choose index funds; the trade-off is cost vs. control.", "Returns are never guaranteed.", "There are no guaranteed returns in the stock market."])
    assert.equal(violatesPolicy(good), false, good);
  assert.ok(SAFE_ANSWER.length > 20);
});
