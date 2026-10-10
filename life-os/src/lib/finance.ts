/** Pure finance maths. All outputs are *hypothetical projections*, never promises. */

export interface Projection {
  invested: number;
  value: number;
  gain: number;
  series: { year: number; invested: number; value: number }[];
}

/** Monthly SIP with annual return `rate` (%), compounded monthly; optional yearly step-up (%). */
export function sipProjection(monthly: number, years: number, rate: number, stepUpPct = 0): Projection {
  const r = rate / 100 / 12;
  let value = 0, invested = 0, m = monthly;
  const series: Projection["series"] = [{ year: 0, invested: 0, value: 0 }];
  for (let y = 1; y <= years; y++) {
    for (let k = 0; k < 12; k++) {
      value = (value + m) * (1 + r);
      invested += m;
    }
    series.push({ year: y, invested: Math.round(invested), value: Math.round(value) });
    m = m * (1 + stepUpPct / 100);
  }
  return { invested: Math.round(invested), value: Math.round(value), gain: Math.round(value - invested), series };
}

export function lumpsumProjection(principal: number, years: number, rate: number, compoundsPerYear = 1): Projection {
  const series: Projection["series"] = [];
  for (let y = 0; y <= years; y++) {
    const v = principal * Math.pow(1 + rate / 100 / compoundsPerYear, compoundsPerYear * y);
    series.push({ year: y, invested: principal, value: Math.round(v) });
  }
  const value = series[series.length - 1].value;
  return { invested: principal, value, gain: value - principal, series };
}

/** Monthly SIP needed to reach `target` in `years` at `rate`% (hypothetical). */
export function sipNeededForGoal(target: number, years: number, rate: number, existing = 0): number {
  const n = years * 12;
  const r = rate / 100 / 12;
  const fvExisting = existing * Math.pow(1 + r, n);
  const need = Math.max(0, target - fvExisting);
  if (n <= 0) return need;
  if (r === 0) return need / n;
  const factor = ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  return need / factor;
}

/** Value of money after `years` of inflation. */
export function realValue(amount: number, years: number, inflationPct: number): number {
  return amount / Math.pow(1 + inflationPct / 100, years);
}

export function emergencyFund(monthlyEssentials: number, months = 6) {
  return { months, target: Math.round(monthlyEssentials * months) };
}

export function rule503020(monthlyIncome: number) {
  return { needs: Math.round(monthlyIncome * 0.5), wants: Math.round(monthlyIncome * 0.3), savings: Math.round(monthlyIncome * 0.2) };
}

export const NEEDS_CATEGORIES = ["Rent/Hostel", "Food & Groceries", "Transport", "Bills & Utilities", "Education", "Health", "EMI/Loans"];
export const WANTS_CATEGORIES = ["Eating out", "Entertainment", "Shopping", "Subscriptions", "Travel", "Gadgets", "Other"];
export const SAVINGS_CATEGORIES = ["Savings/Investments"];
export const INCOME_CATEGORIES = ["Pocket money", "Stipend", "Freelance", "YouTube", "Salary", "Other"];
export const EXPENSE_CATEGORIES = [...NEEDS_CATEGORIES, ...WANTS_CATEGORIES, ...SAVINGS_CATEGORIES];

export function bucketOfCategory(cat: string): "needs" | "wants" | "savings" {
  if (NEEDS_CATEGORIES.includes(cat)) return "needs";
  if (SAVINGS_CATEGORIES.includes(cat)) return "savings";
  return "wants";
}

export function monthSummary(txs: { type: "income" | "expense"; amount: number; category: string }[]) {
  const income = txs.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
  const expenses = txs.filter((t) => t.type === "expense");
  const spent = expenses.reduce((a, t) => a + t.amount, 0);
  const by = { needs: 0, wants: 0, savings: 0 };
  const byCategory: Record<string, number> = {};
  for (const t of expenses) {
    by[bucketOfCategory(t.category)] += t.amount;
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
  }
  return { income, spent, net: income - spent, by, byCategory, savingsRate: income ? ((income - spent) / income) * 100 : 0 };
}
