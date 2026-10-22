import { createSign } from "node:crypto";

// Verifies a Google Play subscription purchase token with the Google Play Developer API (subscriptionsv2).
// No extra dependencies: the service-account JWT is signed with node:crypto.

export type ServiceAccount = { client_email: string; private_key: string; token_uri?: string };
export type Entitlement = { active: boolean; state: string; expiresAt: number | null; productId: string | null };

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export function signServiceAccountJwt(sa: ServiceAccount, now = Math.floor(Date.now() / 1000)): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: sa.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  }));
  const sig = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(sa.private_key);
  return `${header}.${claims}.${b64url(sig)}`;
}

// Pure: turn a subscriptionsv2 response into an entitlement decision.
const ACTIVE_STATES = new Set(["SUBSCRIPTION_STATE_ACTIVE", "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"]);
export function evaluateSubscription(resp: any, expectedProductId: string, now = Date.now()): Entitlement {
  const state: string = resp?.subscriptionState ?? "UNKNOWN";
  const item = (resp?.lineItems ?? []).find((l: any) => l?.productId === expectedProductId);
  if (!item) return { active: false, state, expiresAt: null, productId: null };
  const expiresAt = item.expiryTime ? Date.parse(item.expiryTime) : null;
  // A cancelled-but-not-yet-expired subscription (state CANCELED) keeps access until expiry.
  const stillPaid = (ACTIVE_STATES.has(state) || state === "SUBSCRIPTION_STATE_CANCELED") && expiresAt !== null && expiresAt > now;
  return { active: stillPaid, state, expiresAt, productId: item.productId };
}

export function makePlayVerifier(opts: {
  sa: ServiceAccount; packageName: string; productId: string;
  fetchImpl?: typeof fetch; now?: () => number;
}) {
  const f = opts.fetchImpl ?? fetch;
  const now = opts.now ?? (() => Date.now());
  let cached: { token: string; exp: number } | null = null;

  async function accessToken(): Promise<string> {
    if (cached && cached.exp > now() + 60_000) return cached.token;
    const res = await f(opts.sa.token_uri ?? "https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: signServiceAccountJwt(opts.sa, Math.floor(now() / 1000)),
      }),
    });
    if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
    const j: any = await res.json();
    cached = { token: j.access_token, exp: now() + (j.expires_in ?? 3600) * 1000 };
    return cached.token;
  }

  return async function verify(purchaseToken: string): Promise<Entitlement> {
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(opts.packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
    const res = await f(url, { headers: { authorization: `Bearer ${await accessToken()}` } });
    if (res.status === 404 || res.status === 400 || res.status === 410) return { active: false, state: "INVALID_TOKEN", expiresAt: null, productId: null };
    if (!res.ok) throw new Error(`Play API error (${res.status})`);
    return evaluateSubscription(await res.json(), opts.productId, now());
  };
}
