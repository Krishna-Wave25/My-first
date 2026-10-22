export const DISCLAIMER =
  "For education only. Not investment advice. Investments are subject to market risk and returns are never guaranteed. Consult a SEBI-registered adviser before investing.";

export type Bucket = { name: string; why: string; risk: "Low" | "Medium" | "High" };

// Illustrative education only. Not a recommendation for any person.
export const ideasForAmount = (amount: number): { band: string; buckets: Bucket[] } => {
  if (amount < 5000)
    return {
      band: "Starting small (under ₹5,000)",
      buckets: [
        { name: "Index fund SIP (₹100+/month)", why: "Spreads money across many companies for a small monthly amount.", risk: "Medium" },
        { name: "Digital gold", why: "Tiny amounts, often used as a hedge against inflation.", risk: "Medium" },
        { name: "Emergency savings first", why: "Keep 3-6 months of expenses in a safe, accessible place before taking risk.", risk: "Low" },
      ],
    };
  if (amount < 100000)
    return {
      band: "Growing (₹5,000 – ₹1 lakh)",
      buckets: [
        { name: "Nifty 50 / index ETFs", why: "Low-cost way to own the broad market.", risk: "Medium" },
        { name: "Large-cap stocks you understand", why: "Study the business, debt and growth before buying.", risk: "High" },
        { name: "PPF / bonds / fixed deposits", why: "Stable portion that cushions market falls.", risk: "Low" },
      ],
    };
  return {
    band: "Larger sums (₹1 lakh and above)",
    buckets: [
      { name: "Diversified mix by goal and time horizon", why: "Split across equity, debt, gold and real assets instead of one bet.", risk: "Medium" },
      { name: "Debt funds / G-Secs", why: "Capital stability for money you need within a few years.", risk: "Low" },
      { name: "REITs / InvITs", why: "Exposure to real estate and infrastructure with smaller tickets.", risk: "Medium" },
      { name: "Talk to a SEBI-registered adviser", why: "For crore-level portfolios, tax and risk planning matter a lot.", risk: "Low" },
    ],
  };
};

export const LESSONS = [
  { t: "What is a stock?", b: "A share is a small ownership slice of a company. Its price moves with business results and market mood." },
  { t: "What is a SIP?", b: "A Systematic Investment Plan invests a fixed amount every month, which averages out your buying price over time." },
  { t: "Risk vs return", b: "Higher possible return always comes with higher possible loss. No one can guarantee returns." },
  { t: "Diversification", b: "Don't put everything in one stock or sector. Spreading money reduces the damage from one bad bet." },
  { t: "P/E ratio", b: "Price divided by earnings per share. A high P/E can mean high expectations, not necessarily a good deal." },
  { t: "Index funds", b: "Funds that copy an index like Nifty 50 at low cost, often a sensible starting point for beginners." },
];
