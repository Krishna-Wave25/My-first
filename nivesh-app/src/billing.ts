// Google Play subscription helpers (pure parts are unit-tested).
export const SUBSCRIPTION_ID = "nivesh_pro"; // Play Console -> Monetize -> Subscriptions -> Product ID
export const ALLOW_TEST_UNLOCK = process.env.EXPO_PUBLIC_ALLOW_TEST_UNLOCK === "1"; // sideloaded test APKs only
const API = process.env.EXPO_PUBLIC_API_URL;
const KEY = process.env.EXPO_PUBLIC_APP_KEY ?? "";
export const GRACE_MS_UNVERIFIED = 3 * 86_400_000; // trust Play's on-device state for 3 days when the server can't be reached

export type Plan = { basePlanId: string; label: string; price: string; hasTrial: boolean; offerToken: string };

type Offer = {
  basePlanIdAndroid?: string | null; displayPrice: string; offerTokenAndroid?: string | null;
  paymentMode?: string | null; id?: string | null;
  pricingPhasesAndroid?: { pricingPhaseList?: { priceAmountMicros?: string | number; formattedPrice?: string }[] } | null;
};
const isTrial = (o: Offer) =>
  o.paymentMode === "free-trial" ||
  !!o.pricingPhasesAndroid?.pricingPhaseList?.some((p) => Number(p.priceAmountMicros) === 0);

// One plan per base plan: show the regular price, buy with the free-trial offer when the store gives us one.
export function pickPlans(offers: Offer[] | null | undefined): Plan[] {
  const by = new Map<string, Offer[]>();
  for (const o of offers ?? []) {
    if (!o.offerTokenAndroid) continue;
    const k = o.basePlanIdAndroid ?? "default";
    by.set(k, [...(by.get(k) ?? []), o]);
  }
  return [...by.entries()].map(([basePlanId, list]) => {
    const base = list.find((o) => !isTrial(o)) ?? list[0];
    const trial = list.find(isTrial);
    const buy = trial ?? base;
    const label = /year|annual/i.test(basePlanId) ? "Yearly" : /month/i.test(basePlanId) ? "Monthly" : basePlanId;
    return { basePlanId, label, price: base.displayPrice, hasTrial: !!trial, offerToken: buy.offerTokenAndroid as string };
  });
}

// Server-side check with Google. Returns null when the server isn't configured/reachable (caller decides the fallback).
export async function verifyWithServer(purchaseToken: string): Promise<{ active: boolean; expiresAt: number | null; definitive: boolean } | null> {
  if (!API) return null;
  try {
    const res = await fetch(`${API.replace(/\/$/, "")}/verify-subscription`, {
      method: "POST", headers: { "content-type": "application/json", "x-app-key": KEY },
      body: JSON.stringify({ purchaseToken }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    // definitive=false (bad token / server misconfig) must never be used to REVOKE access
    return { active: !!j.active, expiresAt: typeof j.expiresAt === "number" ? j.expiresAt : null, definitive: j.definitive !== false };
  } catch { return null; }
}
