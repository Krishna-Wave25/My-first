// Pure parser for Yahoo Finance "v8/finance/chart" responses (no React imports so it is unit-testable).
export type ParsedQuote = {
  price: number; changePct: number; history: number[]; name?: string;
  prevClose?: number; dayHigh?: number; dayLow?: number; high52?: number; low52?: number; volume?: number;
};

const num = (v: unknown): number | undefined => (typeof v === "number" && isFinite(v) ? v : undefined);

// `daily` = compare with the previous bar (1mo/daily). Otherwise (intraday/other ranges) the day change uses meta.chartPreviousClose.
export function parseChart(json: any, opts: { rangeChange?: boolean } = {}): ParsedQuote | null {
  const r = json?.chart?.result?.[0];
  if (!r) return null;
  const closes: number[] = (r.indicators?.quote?.[0]?.close ?? []).filter(
    (v: unknown): v is number => typeof v === "number" && isFinite(v),
  );
  const m = r.meta ?? {};
  const price = num(m.regularMarketPrice) ?? closes[closes.length - 1];
  if (typeof price !== "number" || !closes.length) return null;
  const n = closes.length;
  let base: number;
  if (opts.rangeChange) base = closes[0]; // change over the whole selected range
  else if (Math.abs(closes[n - 1] - price) < 1e-6 && n >= 2) base = closes[n - 2]; // today's bar is the last bar
  else base = closes[n - 1];
  const changePct = base ? ((price - base) / base) * 100 : 0;
  return {
    price, changePct, history: closes, name: m.longName ?? m.shortName,
    prevClose: num(m.chartPreviousClose) ?? num(m.previousClose),
    dayHigh: num(m.regularMarketDayHigh), dayLow: num(m.regularMarketDayLow),
    high52: num(m.fiftyTwoWeekHigh), low52: num(m.fiftyTwoWeekLow), volume: num(m.regularMarketVolume),
  };
}
