// Pure parser for Yahoo Finance "v8/finance/chart" responses (no React imports so it is unit-testable).
export type ParsedQuote = { price: number; changePct: number; history: number[]; name?: string };

export function parseChart(json: any): ParsedQuote | null {
  const r = json?.chart?.result?.[0];
  if (!r) return null;
  const closes: number[] = (r.indicators?.quote?.[0]?.close ?? []).filter(
    (v: unknown): v is number => typeof v === "number" && isFinite(v),
  );
  const price = typeof r.meta?.regularMarketPrice === "number" ? r.meta.regularMarketPrice : closes[closes.length - 1];
  if (typeof price !== "number" || !closes.length) return null;
  const n = closes.length;
  // If the latest bar is today's (equals live price) compare with the bar before it.
  const prev = Math.abs(closes[n - 1] - price) < 1e-6 && n >= 2 ? closes[n - 2] : closes[n - 1];
  const changePct = prev ? ((price - prev) / prev) * 100 : 0;
  return { price, changePct, history: closes.slice(-30), name: r.meta?.longName ?? r.meta?.shortName };
}
