// Pure parser for Yahoo Finance "v8/finance/chart" responses (no React imports so it is unit-testable).
export type ParsedQuote = {
  price: number; changePct: number; history: number[]; name?: string;
  prevClose?: number; dayHigh?: number; dayLow?: number; high52?: number; low52?: number; volume?: number;
};
// day   = 1D/5m fetch: change vs YESTERDAY's close (meta.chartPreviousClose is correct for a 1-day range)
// daily = 1M/daily fetch: change vs the previous daily bar
// range = any longer range: change over the whole selected range (first close -> latest price)
export type Mode = "day" | "daily" | "range";

const num = (v: unknown): number | undefined => (typeof v === "number" && isFinite(v) ? v : undefined);

export function parseChart(json: any, opts: { mode?: Mode } = {}): ParsedQuote | null {
  const mode = opts.mode ?? "daily";
  const r = json?.chart?.result?.[0];
  if (!r) return null;
  const closes: number[] = (r.indicators?.quote?.[0]?.close ?? []).filter(
    (v: unknown): v is number => typeof v === "number" && isFinite(v),
  );
  const m = r.meta ?? {};
  const price = num(m.regularMarketPrice) ?? closes[closes.length - 1];
  if (typeof price !== "number" || !closes.length) return null;
  const n = closes.length;

  let base: number | undefined;
  if (mode === "range") base = closes[0];
  else if (mode === "day") base = num(m.chartPreviousClose) ?? num(m.previousClose);
  else base = Math.abs(closes[n - 1] - price) < 1e-6 && n >= 2 ? closes[n - 2] : closes[n - 1];
  // Never invent a day change: if we have no trustworthy base, report 0 and no prevClose.
  const changePct = base ? ((price - base) / base) * 100 : 0;
  return {
    price, changePct, history: closes, name: m.longName ?? m.shortName,
    prevClose: mode === "range" ? undefined : base,
    dayHigh: num(m.regularMarketDayHigh), dayLow: num(m.regularMarketDayLow),
    high52: num(m.fiftyTwoWeekHigh), low52: num(m.fiftyTwoWeekLow), volume: num(m.regularMarketVolume),
  };
}
