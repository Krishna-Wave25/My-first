// Live provider using Yahoo Finance's public chart endpoint (delayed ~15 min for NSE/BSE).
// NOTE: unofficial and unlicensed. Fine for development/testing; replace with a licensed vendor or
// broker API before charging users (see README "Before public launch").
import type { Detail, MarketProvider, Quote, Range } from "./market";
import { INDEX_DEFS, UNIVERSE, StockDef } from "./stocks";
import { parseChart } from "./yahooParse";

const BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";
const TTL_MS = 60_000;
const RANGE_PARAMS: Record<Range, string> = {
  "1D": "range=1d&interval=5m", "1W": "range=5d&interval=30m", "1M": "range=1mo&interval=1d",
  "3M": "range=3mo&interval=1d", "1Y": "range=1y&interval=1d", "5Y": "range=5y&interval=1wk",
};

async function fetchChart(yahooSymbol: string, range: Range, rangeChange = false) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(`${BASE}${encodeURIComponent(yahooSymbol)}?${RANGE_PARAMS[range]}`, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseChart(await res.json(), { rangeChange });
  } finally {
    clearTimeout(t);
  }
}

const toQuote = (d: Pick<StockDef, "symbol" | "name" | "sector">, p: NonNullable<ReturnType<typeof parseChart>>): Quote => ({
  symbol: d.symbol, name: d.name, sector: d.sector, price: p.price, changePct: p.changePct, history: p.history.slice(-30),
  prevClose: p.prevClose, dayHigh: p.dayHigh, dayLow: p.dayLow, high52: p.high52, low52: p.low52, volume: p.volume,
});

async function load(defs: StockDef[]): Promise<Quote[]> {
  const out = await Promise.all(
    defs.map(async (d) => {
      try {
        const p = await fetchChart(d.yahoo, "1M");
        return p ? toQuote(d, p) : null;
      } catch { return null; }
    }),
  );
  return out.filter((x): x is Quote => x !== null);
}

export const yahooLive = {
  getIndices: () => load(INDEX_DEFS),
  getStocks: () => load(UNIVERSE),
  async getDetail(def: Pick<StockDef, "symbol" | "yahoo" | "name" | "sector">, range: Range): Promise<Detail> {
    // Header quote (today's change + day/52w stats) and the chart for the selected range.
    const [day, chart] = await Promise.all([fetchChart(def.yahoo, "1D"), fetchChart(def.yahoo, range, true)]);
    if (!day || !chart) throw new Error("no data");
    const q = toQuote(def, day);
    q.history = chart.history.slice(-30);
    return { quote: q, series: chart.history, rangeChangePct: chart.changePct };
  },
};

// Wraps a live provider with a short cache and falls back to sample data if the network fails.
export function withFallback(live: Pick<MarketProvider, "getIndices" | "getStocks" | "getDetail">, sample: MarketProvider): MarketProvider {
  const cache: Record<string, { at: number; v: any }> = {};
  const self: MarketProvider = {
    isSample: false,
    getIndices: () => get("i", () => live.getIndices(), () => sample.getIndices()),
    getStocks: () => get("s", () => live.getStocks(), () => sample.getStocks()),
    getDetail: (def, range) => get(`d:${def.symbol}:${range}`, () => live.getDetail(def, range), () => sample.getDetail(def, range)),
  };
  async function get<T>(key: string, liveFn: () => Promise<T>, sampleFn: () => Promise<T>): Promise<T> {
    const c = cache[key];
    if (c && Date.now() - c.at < TTL_MS) return c.v as T;
    try {
      const v = await liveFn();
      if (Array.isArray(v) && !v.length) throw new Error("empty");
      cache[key] = { at: Date.now(), v };
      self.isSample = false;
      return v;
    } catch {
      self.isSample = true;
      return sampleFn();
    }
  }
  return self;
}
