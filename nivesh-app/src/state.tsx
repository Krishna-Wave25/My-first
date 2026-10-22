import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { market, Quote } from "./data/market";
import { getPortfolio, getWatchlist, setPortfolio, setWatchlist } from "./store";
import { applyOrder, emptyPortfolio, Portfolio } from "./portfolio";

type Ctx = {
  stocks: Quote[]; indices: Quote[]; loading: boolean; sample: boolean; refresh: () => void;
  watch: string[]; toggleWatch: (s: string) => void;
  portfolio: Portfolio; trade: (side: "BUY" | "SELL", symbol: string, qty: number, price: number) => string | null;
  resetPortfolio: () => void;
  prices: Record<string, number>;
};
const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [stocks, setStocks] = useState<Quote[]>([]);
  const [indices, setIndices] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [sample, setSample] = useState(false);
  const [watch, setWatch] = useState<string[]>([]);
  const [portfolio, setPort] = useState<Portfolio>(emptyPortfolio());

  const refresh = useCallback(() => {
    Promise.all([market.getIndices(), market.getStocks()])
      .then(([i, s]) => { setIndices(i); setStocks(s); setSample(market.isSample); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    getWatchlist().then(setWatch);
    getPortfolio().then(setPort);
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  const toggleWatch = useCallback((sym: string) => {
    setWatch((w) => {
      const next = w.includes(sym) ? w.filter((x) => x !== sym) : [...w, sym];
      setWatchlist(next);
      return next;
    });
  }, []);

  const trade = useCallback((side: "BUY" | "SELL", symbol: string, qty: number, price: number) => {
    const r = applyOrder(portfolio, side, symbol, qty, price);
    if (!r.ok) return r.error;
    setPort(r.portfolio); setPortfolio(r.portfolio);
    return null;
  }, [portfolio]);

  const resetPortfolio = useCallback(() => { const p = emptyPortfolio(); setPort(p); setPortfolio(p); }, []);
  const prices = useMemo(() => Object.fromEntries(stocks.map((s) => [s.symbol, s.price])), [stocks]);

  return (
    <AppCtx.Provider value={{ stocks, indices, loading, sample, refresh, watch, toggleWatch, portfolio, trade, resetPortfolio, prices }}>
      {children}
    </AppCtx.Provider>
  );
}
