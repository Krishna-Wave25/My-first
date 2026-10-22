import AsyncStorage from "@react-native-async-storage/async-storage";
import { getEntitlement } from "./store";

// `sig` is added by OUR server to each answer; we send it back so the server can tell real assistant turns from forged ones.
export type Turn = { role: "user" | "assistant"; content: string; sig?: string };

const URL = process.env.EXPO_PUBLIC_API_URL; // e.g. https://nivesh-api.example.com
const KEY = process.env.EXPO_PUBLIC_APP_KEY ?? ""; // public by nature (ships in the APK): only a nuisance filter, real limits are server-side

export const explainerConfigured = !!URL;

// Random per-install id used only for fair-use limits on the free trial. Not a user identity.
let cachedId: string | null = null;
async function installId(): Promise<string> {
  if (cachedId) return cachedId;
  try {
    let id = await AsyncStorage.getItem("nivesh.installId");
    if (!id) {
      id = Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join("");
      await AsyncStorage.setItem("nivesh.installId", id);
    }
    return (cachedId = id);
  } catch {
    return (cachedId = "volatile" + Math.random().toString(36).slice(2, 14));
  }
}

export async function askExplainer(question: string, history: Turn[]): Promise<{ answer: string; sig: string }> {
  if (!URL) throw new Error("The AI explainer is not set up yet.");
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 45_000);
  try {
    const ent = await getEntitlement(); // subscribers get a higher daily limit (server verifies the token with Google)
    const res = await fetch(`${URL.replace(/\/$/, "")}/explain`, {
      method: "POST",
      headers: {
        "content-type": "application/json", "x-app-key": KEY, "x-install-id": await installId(),
        ...(ent?.token ? { "x-purchase-token": ent.token } : {}),
      },
      body: JSON.stringify({ question, history }),
      signal: ctl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
    return { answer: String(data.answer), sig: String(data.sig ?? "") };
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("That took too long. Please try again.");
    throw e;
  } finally {
    clearTimeout(t);
  }
}
