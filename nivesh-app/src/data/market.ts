// Market data layer. MockProvider returns SAMPLE data so the UI works offline.
// Replace with a real provider (licensed delayed/EOD feed or broker API) by
// implementing MarketProvider and swapping the export at the bottom.
export type Quote = {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  changePct: number;
  history: number[];
};

export interface MarketProvider {
  isSample: boolean;
  getIndices(): Promise<Quote[]>;
  getStocks(): Promise<Quote[]>;
}

const walk = (start: number, drift: number, n = 30): number[] => {
  const out = [start];
  let seed = Math.round(start * 100) % 997;
  for (let i = 1; i < n; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const r = seed / 233280 - 0.5;
    out.push(+(out[i - 1] * (1 + drift + r * 0.02)).toFixed(2));
  }
  return out;
};
const q = (
  symbol: string, name: string, sector: string, price: number, changePct: number,
): Quote => ({ symbol, name, sector, price, changePct, history: walk(price * 0.93, changePct / 300) });

const INDICES = [
  q("NIFTY50", "Nifty 50", "Index", 24500, 0.42),
  q("SENSEX", "Sensex", "Index", 80500, 0.38),
  q("BANKNIFTY", "Nifty Bank", "Index", 52000, -0.21),
];
const STOCKS = [
  q("RELIANCE", "Reliance Industries", "Energy", 2950, 1.8),
  q("TCS", "Tata Consultancy Services", "IT", 3900, -0.6),
  q("HDFCBANK", "HDFC Bank", "Banking", 1650, 0.9),
  q("INFY", "Infosys", "IT", 1560, 2.4),
  q("SBIN", "State Bank of India", "Banking", 820, -1.7),
  q("TATAMOTORS", "Tata Motors", "Auto", 980, 3.1),
  q("ITC", "ITC", "FMCG", 470, 0.3),
  q("SUNPHARMA", "Sun Pharma", "Pharma", 1700, -2.2),
  q("NTPC", "NTPC", "Power", 370, 1.2),
  q("ADANIGREEN", "Adani Green Energy", "Renewable", 1800, -3.4),
];

const MockProvider: MarketProvider = {
  isSample: true,
  getIndices: async () => INDICES,
  getStocks: async () => STOCKS,
};
export const market: MarketProvider = MockProvider;

export const sectorTrends = (stocks: Quote[]) => {
  const m = new Map<string, number[]>();
  stocks.forEach((s) => m.set(s.sector, [...(m.get(s.sector) ?? []), s.changePct]));
  return [...m.entries()]
    .map(([sector, v]) => ({ sector, avg: v.reduce((a, b) => a + b, 0) / v.length }))
    .sort((a, b) => b.avg - a.avg);
};
