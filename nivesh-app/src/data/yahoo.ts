// Live provider using Yahoo Finance's public chart endpoint (delayed ~15 min for NSE/BSE).
// NOTE: this is an unofficial, unlicensed source. Fine for development/testing; replace with a
// licensed vendor or broker API before charging users (see README "Before public launch").
import type { MarketProvider, Quote } from "./market";
import { parseChart } from "./yahooParse";

const BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";
const TTL_MS = 60_000;

const INDEX_DEFS = [
  { symbol: "NIFTY50", name: "Nifty 50", yahoo: "^NSEI" },
  { symbol: "SENSEX", name: "Sensex", yahoo: "^BSESN" },
  { symbol: "BANKNIFTY", name: "Nifty Bank", yahoo: "^NSEBANK" },
];
const STOCK_DEFS = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy" },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT" },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banking" },
  { symbol: "INFY", name: "Infosys", sector: "IT" },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banking" },
  { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Auto" },
  { symbol: "ITC", name: "ITC", sector: "FMCG" },
  { symbol: "SUNPHARMA", name: "Sun Pharma", sector: "Pharma" },
  { symbol: "NTPC", name: "NTPC", sector: "Power" },
  { symbol: "ADANIGREEN", name: "Adani Green Energy", sector: "Renewable" },
];

async function fetchChart(yahooSymbol: string) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(`${BASE}${encodeURIComponent(yahooSymbol)}?range=1mo&interval=1d`, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseChart(await res.json());
  } finally {
    clearTimeout(t);
  }
}

async function load(defs: { symbol: string; name: string; sector?: string; yahoo?: string }[], suffix: string): Promise<Quote[]> {
  const out = await Promise.all(
    defs.map(async (d) => {
      try {
        const p = await fetchChart(d.yahoo ?? d.symbol + suffix);
        if (!p) return null;
        return { symbol: d.symbol, name: d.name, sector: d.sector ?? "Index", price: p.price, changePct: p.changePct, history: p.history } as Quote;
      } catch {
        return null;
      }
    }),
  );
  return out.filter((x): x is Quote => x !== null);
}

// Wraps a live provider with a short cache and falls back to sample data if the network fails.
export function withFallback(live: Pick<MarketProvider, "getIndices" | "getStocks">, sample: MarketProvider): MarketProvider {
  const cache: Record<string, { at: number; v: Quote[] }> = {};
  const self: MarketProvider = {
    isSample: false,
    async getIndices() { return get("i", live.getIndices, sample.getIndices); },
    async getStocks() { return get("s", live.getStocks, sample.getStocks); },
  };
  async function get(key: string, liveFn: () => Promise<Quote[]>, sampleFn: () => Promise<Quote[]>) {
    const c = cache[key];
    if (c && Date.now() - c.at < TTL_MS) return c.v;
    try {
      const v = await liveFn();
      if (!v.length) throw new Error("empty");
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

export const yahooLive = {
  getIndices: () => load(INDEX_DEFS, ""),
  getStocks: () => load(STOCK_DEFS, ".NS"),
};
