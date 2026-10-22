// Illustrative SIP maths. Assumed return is a user input, NOT a prediction.
export function sipFutureValue(monthly: number, annualPct: number, years: number) {
  const n = Math.round(years * 12);
  const r = annualPct / 100 / 12;
  const invested = monthly * n;
  const fv = r === 0 ? invested : monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  return { invested, value: fv, gain: fv - invested };
}
export function lumpsumFutureValue(amount: number, annualPct: number, years: number) {
  const value = amount * Math.pow(1 + annualPct / 100, years);
  return { invested: amount, value, gain: value - amount };
}
