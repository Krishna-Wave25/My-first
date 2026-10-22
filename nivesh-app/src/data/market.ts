// Market data layer. UI talks only to `market`. Live data comes from yahoo.ts (delayed, unlicensed: dev/testing only);
// if it fails we fall back to clearly-labelled SAMPLE data so the app never looks broken.
import { INDEX_DEFS, StockDef, UNIVERSE } from "./stocks";

export type Quote = {
  symbol: string; name: string; sector: string; price: number; changePct: number; history: number[];
  prevClose?: number; dayHigh?: number; dayLow?: number; high52?: number; low52?: number; volume?: number;
};
export type Range = "1D" | "1W" | "1M" | "3M" | "1Y" | "5Y";
export const RANGES: Range[] = ["1D", "1W", "1M", "3M", "1Y", "5Y"];
export type Detail = { quote: Quote; series: number[]; rangeChangePct: number };

// Every call reports where ITS data came from, so the UI can never label sample numbers as live.
import type { Result, Status } from "./status";
export type { Result, Status };
export { worstStatus } from "./status";
export interface MarketProvider {
  getIndices(): Promise<Result<Quote[]>>;
  getStocks(): Promise<Result<Quote[]>>;
  getDetail(def: Pick<StockDef, "symbol" | "yahoo" | "name" | "sector">, range: Range): Promise<Result<Detail>>;
  clearCache(): void;
}

// ---- sample data (deterministic pseudo-random walk) ----
const POINTS: Record<Range, number> = { "1D": 60, "1W": 70, "1M": 22, "3M": 63, "1Y": 250, "5Y": 260 };
const walk = (end: number, drift: number, n: number, seedStr: string): number[] => {
  let seed = [...seedStr].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 99991, 7);
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280) - 0.5;
  const out = [end];
  for (let i = 1; i < n; i++) out.unshift(+(out[0] / (1 + drift + rnd() * 0.02)).toFixed(2));
  return out;
};
export const sampleQuote = (d: Pick<StockDef, "symbol" | "name" | "sector" | "sample" | "sampleChg">): Quote => ({
  symbol: d.symbol, name: d.name, sector: d.sector, price: d.sample, changePct: d.sampleChg,
  history: walk(d.sample, d.sampleChg / 300, 30, d.symbol),
  prevClose: +(d.sample / (1 + d.sampleChg / 100)).toFixed(2),
  dayHigh: +(d.sample * 1.01).toFixed(2), dayLow: +(d.sample * 0.985).toFixed(2),
  high52: +(d.sample * 1.25).toFixed(2), low52: +(d.sample * 0.72).toFixed(2),
});

const sampleList = <T extends { sample: number }>(defs: T[]) => defs.map((d) => sampleQuote(d as any));
export const MockProvider: MarketProvider = {
  clearCache: () => {},
  getIndices: async () => ({ data: sampleList(INDEX_DEFS), status: "sample" }),
  getStocks: async () => ({ data: sampleList(UNIVERSE), status: "sample" }),
  getDetail: async (def, range) => {
    const all = [...UNIVERSE, ...INDEX_DEFS];
    const d = all.find((x) => x.symbol === def.symbol) ?? { ...def, sample: 1000, sampleChg: 0 };
    const quote = sampleQuote(d as any);
    const series = walk(quote.price, (range === "1D" ? 0.0002 : d.sampleChg / 300) * (range === "5Y" ? 8 : 1), POINTS[range], def.symbol + range);
    return { data: { quote, series, rangeChangePct: ((series[series.length - 1] - series[0]) / series[0]) * 100 }, status: "sample" };
  },
};

export const sectorTrends = (stocks: Quote[]) => {
  const m = new Map<string, number[]>();
  stocks.forEach((s) => m.set(s.sector, [...(m.get(s.sector) ?? []), s.changePct]));
  return [...m.entries()]
    .map(([sector, v]) => ({ sector, avg: v.reduce((a, b) => a + b, 0) / v.length }))
    .sort((a, b) => b.avg - a.avg);
};

// Live data (delayed) with automatic fallback to sample data. EXPO_PUBLIC_USE_SAMPLE_DATA=1 forces sample data.
import { withFallback, yahooLive } from "./yahoo";
export const market: MarketProvider =
  process.env.EXPO_PUBLIC_USE_SAMPLE_DATA === "1" ? MockProvider : withFallback(yahooLive, MockProvider);
