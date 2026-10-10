export interface Lesson {
  id: string;
  title: string;
  level: "Basics" | "Intermediate";
  minutes: number;
  summary: string;
  points: string[];
  risk: string;
  verify: { label: string; url: string }[];
  action: string;
}

export const FINANCE_NOTE =
  "Education only — not personalised investment advice. Returns are never guaranteed, markets can fall, and you can lose money. Tax rules, rates and limits change: confirm on the official source linked in each lesson.";

export const LESSONS: Lesson[] = [
  {
    id: "budget-503020", title: "Budgeting with the 50/30/20 rule", level: "Basics", minutes: 6,
    summary: "A simple starting split: 50% needs, 30% wants, 20% savings & investing.",
    points: ["Needs: rent/hostel, food, transport, bills, minimum EMIs.", "Wants: eating out, entertainment, shopping, subscriptions.", "Savings: emergency fund first, then long-term investing.", "It's a guideline — on a small student income, start with whatever savings % you can sustain and raise it with each income increase."],
    risk: "Rigid rules can fail on irregular income; track a few months of real spending before judging yourself.",
    verify: [{ label: "RBI Financial Literacy", url: "https://www.rbi.org.in/FinancialEducation/" }],
    action: "Log this month's income and expenses in Finance → Tracker and see your real split.",
  },
  {
    id: "emergency-fund", title: "Emergency fund first", level: "Basics", minutes: 5,
    summary: "A cash cushion for shocks, before you invest.",
    points: ["Common guidance is 3–6 months of essential expenses; students with family support may start with 1–2 months.", "Keep it in a safe, easily accessible place (savings account/liquid options), not in volatile assets.", "Define 'emergency' in advance so it isn't spent on wants."],
    risk: "Even savings accounts have limits on deposit insurance; spread large sums across institutions.",
    verify: [{ label: "DICGC deposit insurance", url: "https://www.dicgc.org.in/" }],
    action: "Use the Emergency Fund calculator and set it as a savings goal.",
  },
  {
    id: "compounding", title: "Compound interest & why time matters", level: "Basics", minutes: 6,
    summary: "Growth on growth: starting early beats starting big.",
    points: ["Compounding means earnings generate their own earnings.", "A higher rate or longer period increases the effect dramatically — but returns on market investments are not fixed.", "Use the calculator with conservative and pessimistic rates, not just optimistic ones."],
    risk: "Projections use assumed returns. Real market returns fluctuate, can be negative in some years, and the past does not predict the future.",
    verify: [{ label: "SEBI Investor Education", url: "https://investor.sebi.gov.in/" }],
    action: "Compare ₹1,000/month at 6%, 10% and 14% over 10 years in the SIP calculator.",
  },
  {
    id: "sip", title: "What is a SIP?", level: "Basics", minutes: 7,
    summary: "A Systematic Investment Plan invests a fixed amount at regular intervals into a mutual fund.",
    points: ["A SIP is a method of investing, not a product — the underlying fund decides the risk.", "Regular investing averages your purchase price over market ups and downs (rupee-cost averaging), but doesn't guarantee profit.", "You can usually start small, pause or stop; check the fund's rules.", "Complete KYC before investing."],
    risk: "Equity funds can fall sharply and stay low for years. Invest only money you won't need for the investment horizon.",
    verify: [{ label: "AMFI — Mutual Funds Sahi Hai", url: "https://www.amfiindia.com/investor-corner" }, { label: "SEBI Investor Education", url: "https://investor.sebi.gov.in/" }],
    action: "Use the SIP calculator to see what a small monthly amount could look like under different assumptions.",
  },
  {
    id: "mutual-funds", title: "Mutual funds & index funds", level: "Basics", minutes: 9,
    summary: "Pooled investments managed by professionals — or tracking an index at low cost.",
    points: ["Types: equity, debt, hybrid; each has a different risk level. Read the riskometer and fund factsheet.", "Expense ratio is the yearly fee; lower costs leave more for you. 'Direct' plans have lower expense ratios than 'regular' plans.", "Index funds passively track an index (e.g. Nifty 50) — usually cheaper, with market-level risk.", "NAV is the price per unit; a low NAV doesn't mean 'cheap'."],
    risk: "No fund is risk-free. Past performance is not indicative of future returns. Check exit loads and tax treatment before investing.",
    verify: [{ label: "AMFI — NAV & fund info", url: "https://www.amfiindia.com/" }, { label: "SEBI Investor Education", url: "https://investor.sebi.gov.in/" }],
    action: "Open an AMFI factsheet for one index fund and note its expense ratio and riskometer.",
  },
  {
    id: "stocks", title: "Stock market fundamentals", level: "Intermediate", minutes: 10,
    summary: "Owning a share = owning a small part of a business.",
    points: ["Prices move with earnings, news, interest rates and sentiment.", "Diversify; avoid concentrating in one stock or tips from social media.", "Learn to read: revenue, profit, debt, valuation ratios (P/E), management quality.", "Be wary of 'guaranteed returns' or operator tips — these are often fraud."],
    risk: "Individual stocks can go to zero. Check any adviser's SEBI registration before acting on their recommendation.",
    verify: [{ label: "NSE Learning", url: "https://www.nseindia.com/" }, { label: "SEBI registered intermediaries", url: "https://www.sebi.gov.in/" }],
    action: "Pick one company and read its latest annual report's summary page — no buying required.",
  },
  {
    id: "inflation-rates", title: "Inflation, interest rates & the RBI", level: "Intermediate", minutes: 8,
    summary: "Why prices rise and how the repo rate ripples into loans and savings.",
    points: ["Inflation reduces what each rupee buys; your savings must grow faster than inflation to gain purchasing power.", "The RBI's Monetary Policy Committee sets the repo rate; this influences loan and deposit rates.", "Higher rates generally make loans costlier and fixed deposits more attractive; they can weigh on equity valuations."],
    risk: "Macroeconomic effects are uncertain and interacting; no single indicator predicts markets.",
    verify: [{ label: "RBI — Monetary Policy", url: "https://www.rbi.org.in/" }, { label: "MoSPI — CPI data", url: "https://mospi.gov.in/" }],
    action: "Open the latest RBI policy statement and write 3 sentences on what changed and why.",
  },
  {
    id: "tax-basics", title: "Taxation basics for a student earner", level: "Intermediate", minutes: 7,
    summary: "Know when income becomes taxable and where to check current rules.",
    points: ["Income from freelancing, YouTube and interest can be taxable; thresholds and slabs change by year.", "Keep records of income and expenses (this app's Finance tracker helps).", "Capital-gains tax rules for investments depend on asset type and holding period and change over time.", "If your income is small, still check whether you need to file; consult a qualified CA for your situation."],
    risk: "This app does not state tax rates because they change. Using outdated figures can lead to errors.",
    verify: [{ label: "Income Tax Department", url: "https://www.incometax.gov.in/" }],
    action: "Note this year's expected side income and check the official portal for what applies.",
  },
  {
    id: "risk-return", title: "Risk, return, fees & losing money", level: "Basics", minutes: 6,
    summary: "Higher potential return comes with higher potential loss.",
    points: ["Match investments to your time horizon: short-term money should not sit in volatile assets.", "Fees compound too — a 1% higher expense ratio costs a lot over decades.", "Diversification reduces (but does not eliminate) risk.", "If a return sounds guaranteed and high, assume it's a scam until proven otherwise."],
    risk: "You can lose some or all of your invested money.",
    verify: [{ label: "SEBI — Beware of frauds", url: "https://investor.sebi.gov.in/" }],
    action: "Write the date by which you'll need the money for each goal, then match it to a suitable risk level.",
  },
];

export const QUIZ: { q: string; options: string[]; answer: number; why: string }[] = [
  { q: "In the 50/30/20 rule, what does the 20% represent?", options: ["Wants", "Needs", "Savings & investing", "Taxes"], answer: 2, why: "20% goes to savings and investments after needs (50%) and wants (30%)." },
  { q: "A SIP is best described as…", options: ["A guaranteed-return product", "A way of investing a fixed amount regularly", "A type of bank loan", "A government bond"], answer: 1, why: "SIP is a method of investing; the risk comes from the underlying fund." },
  { q: "Which statement about past mutual-fund returns is correct?", options: ["They guarantee future returns", "They indicate but don't guarantee future returns", "They're irrelevant when fees are low", "They're legally fixed"], answer: 1, why: "Past performance is not a guarantee of future results." },
  { q: "What should come before investing in volatile assets?", options: ["Buying gold", "An emergency fund", "A credit card", "A stock tip"], answer: 1, why: "An emergency fund prevents forced selling at a loss." },
  { q: "An 'investment' promises 3% monthly guaranteed returns. Best response?", options: ["Invest everything", "Treat it as likely fraud and verify with SEBI", "Invest half", "Ask a friend to invest first"], answer: 1, why: "Guaranteed high returns are a classic fraud signal." },
];
