// Practice (virtual) portfolio logic. Pure functions so they are easy to test.
export type Holding = { qty: number; avg: number };
export type Order = { side: "BUY" | "SELL"; symbol: string; qty: number; price: number; at: number };
export type Portfolio = { cash: number; holdings: Record<string, Holding>; orders: Order[] };

export const START_CASH = 100000;
export const emptyPortfolio = (): Portfolio => ({ cash: START_CASH, holdings: {}, orders: [] });

export function applyOrder(
  p: Portfolio, side: "BUY" | "SELL", symbol: string, qty: number, price: number, at = Date.now(),
): { ok: true; portfolio: Portfolio } | { ok: false; error: string } {
  if (!Number.isInteger(qty) || qty <= 0) return { ok: false, error: "Enter a whole number of shares." };
  if (!(price > 0)) return { ok: false, error: "Price unavailable." };
  const cost = qty * price;
  const h = p.holdings[symbol];
  if (side === "BUY") {
    if (cost > p.cash + 1e-9) return { ok: false, error: "Not enough virtual cash." };
    const totalQty = (h?.qty ?? 0) + qty;
    const avg = ((h?.qty ?? 0) * (h?.avg ?? 0) + cost) / totalQty;
    return {
      ok: true,
      portfolio: { cash: p.cash - cost, holdings: { ...p.holdings, [symbol]: { qty: totalQty, avg } }, orders: [{ side, symbol, qty, price, at }, ...p.orders].slice(0, 100) },
    };
  }
  if (!h || qty > h.qty) return { ok: false, error: "You don't own that many shares." };
  const holdings = { ...p.holdings };
  if (h.qty === qty) delete holdings[symbol]; else holdings[symbol] = { qty: h.qty - qty, avg: h.avg };
  return { ok: true, portfolio: { cash: p.cash + cost, holdings, orders: [{ side, symbol, qty, price, at }, ...p.orders].slice(0, 100) } };
}

export function valueOf(p: Portfolio, prices: Record<string, number>) {
  let invested = 0, current = 0;
  for (const [s, h] of Object.entries(p.holdings)) {
    invested += h.qty * h.avg;
    current += h.qty * (prices[s] ?? h.avg);
  }
  const pnl = current - invested;
  return { invested, current, pnl, pnlPct: invested ? (pnl / invested) * 100 : 0, total: p.cash + current };
}
