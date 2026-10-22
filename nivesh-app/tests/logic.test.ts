import test from "node:test";
import assert from "node:assert/strict";
import { applyOrder, valueOf, emptyPortfolio } from "../src/portfolio.ts";
import { sipFutureValue, lumpsumFutureValue } from "../src/sip.ts";
import { parseChart } from "../src/data/yahooParse.ts";
import { pickPlans } from "../src/billing.ts";

const mk = (closes: (number | null)[], price: number, meta: object = {}) =>
  ({ chart: { result: [{ meta: { regularMarketPrice: price, ...meta }, indicators: { quote: [{ close: closes }] } }] } });

test("practice portfolio: buy, average price, sell, limits", () => {
  let p = emptyPortfolio();
  let r = applyOrder(p, "BUY", "TCS", 10, 1000); assert.ok(r.ok); if (r.ok) p = r.portfolio;
  assert.equal(p.cash, 90000); assert.deepEqual(p.holdings.TCS, { qty: 10, avg: 1000 });
  r = applyOrder(p, "BUY", "TCS", 10, 2000); assert.ok(r.ok); if (r.ok) p = r.portfolio;
  assert.equal(p.holdings.TCS.avg, 1500); assert.equal(p.cash, 70000);
  assert.equal(applyOrder(p, "BUY", "X", 1000, 1000).ok, false);
  assert.equal(applyOrder(p, "SELL", "TCS", 21, 1).ok, false);
  assert.equal(applyOrder(p, "BUY", "X", 1.5, 10).ok, false);
  r = applyOrder(p, "SELL", "TCS", 20, 1800); assert.ok(r.ok); if (r.ok) p = r.portfolio;
  assert.equal(p.holdings.TCS, undefined); assert.equal(p.cash, 106000);
});

test("portfolio valuation", () => {
  const b = applyOrder(emptyPortfolio(), "BUY", "A", 10, 100); assert.ok(b.ok);
  if (!b.ok) return;
  const v = valueOf(b.portfolio, { A: 120 });
  assert.equal(v.pnl, 200); assert.equal(v.total, 100000 - 1000 + 1200); assert.ok(Math.abs(v.pnlPct - 20) < 1e-9);
});

test("SIP maths", () => {
  assert.equal(sipFutureValue(1000, 0, 2).value, 24000);
  assert.ok(Math.abs(sipFutureValue(1000, 12, 1).value - 12809.33) < 1);
  assert.ok(Math.abs(lumpsumFutureValue(1000, 10, 2).value - 1210) < 1e-9);
});

test("parseChart daily mode compares with the previous daily bar", () => {
  const q = parseChart(mk([100, 110, 121], 121))!; assert.ok(Math.abs(q.changePct - 10) < 1e-9); assert.equal(q.prevClose, 110);
  const stale = parseChart(mk([100, 110], 121))!; assert.ok(Math.abs(stale.changePct - 10) < 1e-9);
});

test("parseChart day mode uses yesterday's close, NOT the previous 5-minute bar", () => {
  // intraday bars hover near today's price; yesterday closed at 100, now 103 => +3%
  const q = parseChart(mk([102.9, 103.0, 103.1, 103], 103, { chartPreviousClose: 100 }), { mode: "day" })!;
  assert.ok(Math.abs(q.changePct - 3) < 1e-9); assert.equal(q.prevClose, 100);
  // no trustworthy base => 0% and no prevClose, never a made-up number
  const none = parseChart(mk([102.9, 103], 103), { mode: "day" })!;
  assert.equal(none.changePct, 0); assert.equal(none.prevClose, undefined);
});

test("parseChart range mode, stats and bad input", () => {
  const q = parseChart(mk([100, 110, 121], 121), { mode: "range" })!; assert.ok(Math.abs(q.changePct - 21) < 1e-9); assert.equal(q.prevClose, undefined);
  const s = parseChart(mk([1, 2], 2, { fiftyTwoWeekHigh: 9, fiftyTwoWeekLow: 1, regularMarketDayHigh: 3 }))!;
  assert.deepEqual([s.high52, s.low52, s.dayHigh], [9, 1, 3]);
  assert.equal(parseChart({ chart: { result: null } }), null);
  assert.equal(parseChart(mk([null, null], 5)), null);
  assert.equal(parseChart(undefined), null);
});

test("pickPlans chooses trial offer to buy and base price to show", () => {
  const ph = (m: string) => ({ priceAmountMicros: m });
  const plans = pickPlans([
    { basePlanIdAndroid: "monthly", displayPrice: "₹149.00", offerTokenAndroid: "m-base", pricingPhasesAndroid: { pricingPhaseList: [ph("149000000")] } },
    { basePlanIdAndroid: "monthly", displayPrice: "₹0.00", offerTokenAndroid: "m-trial", paymentMode: "free-trial" },
    { basePlanIdAndroid: "yearly", displayPrice: "₹999.00", offerTokenAndroid: "y-base" },
    { basePlanIdAndroid: "bad", displayPrice: "x", offerTokenAndroid: null },
  ]);
  assert.deepEqual(plans, [
    { basePlanId: "monthly", label: "Monthly", price: "₹149.00", hasTrial: true, offerToken: "m-trial" },
    { basePlanId: "yearly", label: "Yearly", price: "₹999.00", hasTrial: false, offerToken: "y-base" },
  ]);
  assert.deepEqual(pickPlans(undefined), []);
});
