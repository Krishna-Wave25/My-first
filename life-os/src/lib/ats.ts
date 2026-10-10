/** Deterministic resume ↔ job-description keyword matcher. It is a heuristic, not a real ATS. */

const STOP = new Set(("a an the and or but if of to in on at for with by from as is are was were be been being this that these those " +
  "it its you your we our us they their i he she will can may should must have has had do does did not no yes more most other some such " +
  "than then too very just also into over under about up out so who what which when where why how all any both each few own same " +
  "per etc using use used work working ability strong good great new team role job candidate looking join responsibilities requirements " +
  "experience years year plus preferred required knowledge skills skill understanding").split(/\s+/));

const ALIASES: Record<string, string> = {
  js: "javascript", ts: "typescript", ml: "machine learning", ai: "artificial intelligence", "node.js": "nodejs", "node js": "nodejs",
  reactjs: "react", "react.js": "react", py: "python", cpp: "c++", k8s: "kubernetes", "ci/cd": "cicd",
};

export function tokenize(text: string): string[] {
  const t = text.toLowerCase().replace(/[^a-z0-9+#./\s-]/g, " ");
  const out: string[] = [];
  for (let w of t.split(/\s+/)) {
    w = w.replace(/^[./-]+|[./-]+$/g, "");
    if (!w || w.length < 2 || STOP.has(w) || /^\d+$/.test(w)) continue;
    out.push(ALIASES[w] ?? w);
  }
  return out;
}

export function keywordsOf(text: string, max = 40): string[] {
  const freq = new Map<string, number>();
  const toks = tokenize(text);
  for (const w of toks) freq.set(w, (freq.get(w) ?? 0) + 1);
  for (let i = 0; i < toks.length - 1; i++) {
    const bi = toks[i] + " " + toks[i + 1];
    if (/^(machine learning|artificial intelligence|data structures|computer vision|deep learning|embedded systems|power electronics|rest api|version control|problem solving|project management)$/.test(bi))
      freq.set(bi, (freq.get(bi) ?? 0) + 2);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, max).map(([w]) => w);
}

export interface AtsReport {
  score: number;
  matched: string[];
  missing: string[];
  checks: { label: string; pass: boolean; tip: string }[];
}

export function analyzeResume(resume: string, jd: string): AtsReport {
  const jdKeys = keywordsOf(jd, 30);
  const have = new Set(tokenize(resume));
  const resumeText = resume.toLowerCase();
  const matched = jdKeys.filter((k) => (k.includes(" ") ? resumeText.includes(k) : have.has(k)));
  const missing = jdKeys.filter((k) => !matched.includes(k));
  const kwScore = jdKeys.length ? (matched.length / jdKeys.length) * 100 : 0;

  const words = resume.trim().split(/\s+/).filter(Boolean).length;
  const checks = [
    { label: "Has an email address", pass: /[\w.+-]+@[\w-]+\.[\w.]+/.test(resume), tip: "Add a professional email at the top." },
    { label: "Has a phone number", pass: /(\+?\d[\d\s-]{8,}\d)/.test(resume), tip: "Add a reachable phone number." },
    { label: "Education section", pass: /\beducation\b|\bb\.?tech\b|\bbachelor/i.test(resume), tip: "Add an Education heading with degree, college and year." },
    { label: "Skills section", pass: /\bskills\b/i.test(resume), tip: "Add a Skills heading listing tools and technologies." },
    { label: "Projects or experience", pass: /\bprojects?\b|\bexperience\b|\binternship\b/i.test(resume), tip: "Add projects with outcomes — they matter most for students." },
    { label: "Quantified results (numbers/%)", pass: (resume.match(/\d+(\.\d+)?\s?(%|x|k\b|users|hours|ms|kw|v\b)/gi) ?? []).length >= 2, tip: "Add measurable results, e.g. 'cut response time by 30%'." },
    { label: "Reasonable length (150–800 words)", pass: words >= 150 && words <= 800, tip: words < 150 ? "Too short — add detail." : "Too long — trim to one page for early-career roles." },
  ];
  const structure = (checks.filter((c) => c.pass).length / checks.length) * 100;
  return { score: Math.round(kwScore * 0.65 + structure * 0.35), matched, missing, checks };
}
