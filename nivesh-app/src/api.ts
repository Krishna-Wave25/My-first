export type Turn = { role: "user" | "assistant"; content: string };

const URL = process.env.EXPO_PUBLIC_API_URL; // e.g. https://nivesh-api.example.com
const KEY = process.env.EXPO_PUBLIC_APP_KEY ?? "";

export const explainerConfigured = !!URL;

export async function askExplainer(question: string, history: Turn[]): Promise<string> {
  if (!URL) throw new Error("The AI explainer is not set up yet.");
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 45_000);
  try {
    const res = await fetch(`${URL.replace(/\/$/, "")}/explain`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-app-key": KEY },
      body: JSON.stringify({ question, history }),
      signal: ctl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`);
    return String(data.answer);
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("That took too long. Please try again.");
    throw e;
  } finally {
    clearTimeout(t);
  }
}
