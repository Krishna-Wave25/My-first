import AsyncStorage from "@react-native-async-storage/async-storage";
import { emptyPortfolio, Portfolio } from "./portfolio";

const TRIAL_KEY = "nivesh.trialStart";
const WATCH_KEY = "nivesh.watchlist";
const PAID_KEY = "nivesh.paid";
const PORT_KEY = "nivesh.portfolio";
export const TRIAL_DAYS = 7;

export async function getAccess(): Promise<{ paid: boolean; trialDaysLeft: number }> {
  try {
    if ((await AsyncStorage.getItem(PAID_KEY)) === "1") return { paid: true, trialDaysLeft: 0 };
    let start = await AsyncStorage.getItem(TRIAL_KEY);
    if (!start) {
      start = String(Date.now());
      await AsyncStorage.setItem(TRIAL_KEY, start);
    }
    const used = (Date.now() - Number(start)) / 86_400_000;
    return { paid: false, trialDaysLeft: Math.max(0, Math.ceil(TRIAL_DAYS - used)) };
  } catch {
    return { paid: false, trialDaysLeft: TRIAL_DAYS };
  }
}

// TODO: replace with Google Play Billing purchase verification (server-side).
export async function unlockForTesting() {
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
