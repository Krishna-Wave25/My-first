import { Capacitor, CapacitorHttp } from "@capacitor/core";

export interface HttpResult { status: number; text: string }

/** Overridable in tests. On Android, requests go through native HTTP (no CORS restrictions). */
export const httpImpl = {
  async request(method: "GET" | "POST", url: string, headers: Record<string, string> = {}, body?: string, timeoutMs = 20000): Promise<HttpResult> {
    if (Capacitor.isNativePlatform()) {
      const opts = { url, headers, connectTimeout: timeoutMs, readTimeout: timeoutMs, responseType: "text" as const };
      const r = method === "GET" ? await CapacitorHttp.get(opts) : await CapacitorHttp.post({ ...opts, data: body });
      const text = typeof r.data === "string" ? r.data : JSON.stringify(r.data);
      return { status: r.status, text };
    }
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { method, headers, body, signal: ctl.signal });
      return { status: r.status, text: await r.text() };
    } finally {
      clearTimeout(timer);
    }
  },
};

export const httpGet = (url: string, headers?: Record<string, string>, timeoutMs?: number) =>
  httpImpl.request("GET", url, headers, undefined, timeoutMs);
export const httpPost = (url: string, headers: Record<string, string>, body: string, timeoutMs?: number) =>
  httpImpl.request("POST", url, headers, body, timeoutMs);

export function describeNetworkError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/abort/i.test(msg)) return "Timed out";
  if (/failed to fetch|networkerror|load failed/i.test(msg))
    return Capacitor.isNativePlatform() ? "Network unreachable" : "Blocked by the browser (CORS) or offline — works in the Android app";
  return msg;
}
