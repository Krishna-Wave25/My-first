import AsyncStorage from "@react-native-async-storage/async-storage";
import { emptyPortfolio, Portfolio } from "./portfolio";
import { ALLOW_TEST_UNLOCK } from "./billing";

const TRIAL_KEY = "nivesh.trialStart";
const WATCH_KEY = "nivesh.watchlist";
const PAID_KEY = "nivesh.paid";
const PORT_KEY = "nivesh.portfolio";
const ENT_KEY = "nivesh.entitlement";
export const TRIAL_DAYS = 7;

export type Entitlement = { expiresAt: number; token: string };
export async function getEntitlement(): Promise<Entitlement | null> {
  try { const raw = await AsyncStorage.getItem(ENT_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export async function setEntitlement(e: Entitlement | null) {
  try { e ? await AsyncStorage.setItem(ENT_KEY, JSON.stringify(e)) : await AsyncStorage.removeItem(ENT_KEY); } catch {}
}

export async function getAccess(): Promise<{ paid: boolean; trialDaysLeft: number }> {
  try {
    if (ALLOW_TEST_UNLOCK && (await AsyncStorage.getItem(PAID_KEY)) === "1") return { paid: true, trialDaysLeft: 0 }; // test builds only
    const ent = await getEntitlement();
    if (ent && ent.expiresAt > Date.now()) return { paid: true, trialDaysLeft: 0 };
    let start = await AsyncStorage.getItem(TRIAL_KEY);
    if (!start) {
      start = String(Date.now());
      await AsyncStorage.setItem(TRIAL_KEY, start);
    }
    const used = (Date.now() - Number(start)) / 86_400_000;
    return { paid: false, trialDaysLeft: Math.max(0, Math.ceil(TRIAL_DAYS - used)) };
  } catch {
    // Storage unreadable: fail closed. (Failing open would hand out a fresh trial every time.) Paywall offers Restore.
    return { paid: false, trialDaysLeft: 0 };
  }
}

// Test-only unlock for sideloaded APKs (see ALLOW_TEST_UNLOCK). Real access comes from Google Play entitlements.
export async function unlockForTesting() {
  if (!ALLOW_TEST_UNLOCK) return;
  await AsyncStorage.setItem(PAID_KEY, "1");
}

export async function getWatchlist(): Promise<string[]> {
  try { return JSON.parse((await AsyncStorage.getItem(WATCH_KEY)) ?? "[]"); } catch { return []; }
}
export async function setWatchlist(list: string[]) {
  try { await AsyncStorage.setItem(WATCH_KEY, JSON.stringify(list)); } catch {}
}

export async function getPortfolio(): Promise<Portfolio> {
  try {
    const raw = await AsyncStorage.getItem(PORT_KEY);
    return raw ? { ...emptyPortfolio(), ...JSON.parse(raw) } : emptyPortfolio();
  } catch { return emptyPortfolio(); }
}
export async function setPortfolio(p: Portfolio) {
  try { await AsyncStorage.setItem(PORT_KEY, JSON.stringify(p)); } catch {}
}
