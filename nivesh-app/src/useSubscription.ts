import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Purchase, useIAP } from "expo-iap";
import { GRACE_MS_UNVERIFIED, pickPlans, SUBSCRIPTION_ID, verifyWithServer } from "./billing";
import { getAccess, getEntitlement, setEntitlement, unlockForTesting } from "./store";

export type Access = { paid: boolean; trialDaysLeft: number };

// Owns the whole subscription flow: load plans, buy, verify with our server, acknowledge, restore, refresh on start.
export function useSubscription() {
  const [access, setAccess] = useState<Access | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const refreshAccess = useCallback(async () => setAccess(await getAccess()), []);
  const ref = useRef<{ finish?: (p: Purchase) => Promise<void> }>({});

  const grant = useCallback(async (token: string, p: Purchase | null) => {
    const v = await verifyWithServer(token);
    if (v && !v.active) { setMessage("Google Play says this subscription is not active."); return false; }
    const expiresAt = v?.expiresAt ?? Date.now() + GRACE_MS_UNVERIFIED; // unverified: short grace, re-checked on next start
    await setEntitlement({ expiresAt, token });
    if (p && ref.current.finish) { try { await ref.current.finish(p); } catch {} } // acknowledge, or Google refunds after 3 days
    await refreshAccess();
    return true;
  }, [refreshAccess]);

  const onPurchaseSuccess = useCallback(async (p: Purchase) => {
    setBusy(false);
    if (p.productId !== SUBSCRIPTION_ID) return;
    if (p.purchaseState === "pending") { setMessage("Payment is pending. Access starts once it is approved."); return; }
    if (!p.purchaseToken) return;
    if (await grant(p.purchaseToken, p)) setMessage("Thank you! Your subscription is active.");
  }, [grant]);

  const iap = useIAP({
    onPurchaseSuccess,
    onPurchaseError: (e) => { setBusy(false); if (!/cancel/i.test(`${e.code} ${e.message}`)) setMessage(e.message || "Purchase failed."); },
    onError: (e) => setMessage(e.message),
  });
  ref.current.finish = (purchase) => iap.finishTransaction({ purchase });

  useEffect(() => { refreshAccess(); }, [refreshAccess]);

  // On start / reconnect: load plans, re-check the stored entitlement with the server, and re-sync with Play.
  useEffect(() => {
    if (!iap.connected) return;
    iap.fetchProducts({ skus: [SUBSCRIPTION_ID], type: "subs" }).catch(() => {});
    (async () => {
      const ent = await getEntitlement();
      if (ent) {
        const v = await verifyWithServer(ent.token);
        if (v && !v.active) await setEntitlement(null);
        else if (v?.expiresAt) await setEntitlement({ ...ent, expiresAt: v.expiresAt });
        await refreshAccess();
      }
      try {
        await iap.getAvailablePurchases();
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iap.connected]);

  // Purchases that Play still reports for this account (e.g. after reinstall) restore access.
  useEffect(() => {
    const mine = iap.availablePurchases.find((p) => p.productId === SUBSCRIPTION_ID && p.purchaseToken && p.purchaseState !== "pending");
    if (mine?.purchaseToken) grant(mine.purchaseToken, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iap.availablePurchases]);

  const plans = useMemo(() => {
    const sub: any = iap.subscriptions.find((s) => s.id === SUBSCRIPTION_ID);
    return pickPlans(sub?.subscriptionOffers);
  }, [iap.subscriptions]);

  const buy = useCallback(async (offerToken: string) => {
    setMessage(null); setBusy(true);
    try {
      await iap.requestPurchase({
        type: "subs",
        request: { google: { skus: [SUBSCRIPTION_ID], subscriptionOffers: [{ sku: SUBSCRIPTION_ID, offerToken }] } },
      });
    } catch (e: any) { setBusy(false); setMessage(e?.message ?? "Could not start the purchase."); }
  }, [iap]);

  const restore = useCallback(async () => {
    setMessage(null); setBusy(true);
    try { await iap.getAvailablePurchases(); setMessage("Checked Google Play for your purchases."); }
    catch (e: any) { setMessage(e?.message ?? "Could not reach Google Play."); }
    setBusy(false);
  }, [iap]);

  const testUnlock = useCallback(async () => { await unlockForTesting(); await refreshAccess(); }, [refreshAccess]);

  return { access, plans, connected: iap.connected, busy, message, buy, restore, testUnlock };
}
