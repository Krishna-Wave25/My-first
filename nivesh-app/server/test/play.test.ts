import test from "node:test";
import assert from "node:assert/strict";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { evaluateSubscription, makePlayVerifier, signServiceAccountJwt } from "../src/play.ts";

const NOW = Date.parse("2026-11-01T00:00:00Z");
const resp = (state: string, expiry: string, productId = "nivesh_pro") => ({ subscriptionState: state, lineItems: [{ productId, expiryTime: expiry }] });

test("active / grace / cancelled-before-expiry are entitled; expired / other product are not", () => {
  assert.equal(evaluateSubscription(resp("SUBSCRIPTION_STATE_ACTIVE", "2026-12-01T00:00:00Z"), "nivesh_pro", NOW).active, true);
  assert.equal(evaluateSubscription(resp("SUBSCRIPTION_STATE_IN_GRACE_PERIOD", "2026-11-03T00:00:00Z"), "nivesh_pro", NOW).active, true);
  assert.equal(evaluateSubscription(resp("SUBSCRIPTION_STATE_CANCELED", "2026-11-10T00:00:00Z"), "nivesh_pro", NOW).active, true);
  assert.equal(evaluateSubscription(resp("SUBSCRIPTION_STATE_CANCELED", "2026-10-30T00:00:00Z"), "nivesh_pro", NOW).active, false);
  assert.equal(evaluateSubscription(resp("SUBSCRIPTION_STATE_EXPIRED", "2026-10-01T00:00:00Z"), "nivesh_pro", NOW).active, false);
  assert.equal(evaluateSubscription(resp("SUBSCRIPTION_STATE_ON_HOLD", "2026-12-01T00:00:00Z"), "nivesh_pro", NOW).active, false);
  assert.equal(evaluateSubscription(resp("SUBSCRIPTION_STATE_ACTIVE", "2026-12-01T00:00:00Z", "other"), "nivesh_pro", NOW).active, false);
  assert.equal(evaluateSubscription(null, "nivesh_pro", NOW).active, false);
});

test("service-account JWT is a valid RS256 signature over header.claims", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
  const jwt = signServiceAccountJwt({ client_email: "svc@x.iam", private_key: pem }, 1000);
  const [h, c, s] = jwt.split(".");
  assert.ok(createVerify("RSA-SHA256").update(`${h}.${c}`).verify(publicKey, Buffer.from(s, "base64url")));
  const claims = JSON.parse(Buffer.from(c, "base64url").toString());
  assert.deepEqual([claims.iss, claims.scope, claims.iat, claims.exp], ["svc@x.iam", "https://www.googleapis.com/auth/androidpublisher", 1000, 4600]);
});

test("verifier exchanges token once, calls the right URL, maps 404 to invalid", async () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const calls: string[] = [];
  const f = (async (url: string, init: any) => {
    calls.push(String(url));
    if (String(url).includes("oauth2")) return new Response(JSON.stringify({ access_token: "AT", expires_in: 3600 }));
    assert.equal(init.headers.authorization, "Bearer AT");
    if (String(url).endsWith("/tokens/GOOD_TOKEN_12345")) return new Response(JSON.stringify(resp("SUBSCRIPTION_STATE_ACTIVE", "2026-12-01T00:00:00Z")));
    return new Response("nope", { status: 404 });
  }) as any;
  const verify = makePlayVerifier({ sa: { client_email: "a@b", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) as string }, packageName: "com.nivesh.app", productId: "nivesh_pro", fetchImpl: f, now: () => NOW });
  assert.equal((await verify("GOOD_TOKEN_12345")).active, true);
  assert.equal((await verify("BAD_TOKEN_123456")).state, "INVALID_TOKEN");
  assert.equal(calls.filter((u) => u.includes("oauth2")).length, 1, "access token is cached");
  assert.ok(calls.some((u) => u.includes("/applications/com.nivesh.app/purchases/subscriptionsv2/tokens/GOOD_TOKEN_12345")));
});
