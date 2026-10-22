// Light, clean "investing app" look. Tokens used everywhere; change here to re-skin.
export const colors = {
  bg: "#FFFFFF",
  surface: "#F5F6F8",
  card: "#FFFFFF",
  border: "#E7E9EE",
  text: "#1B1E2B",
  muted: "#7C7F8E",
  accent: "#00B386",
  onAccent: "#FFFFFF",
  accentSoft: "#E6F8F3",
  up: "#00B386",
  down: "#EB5B3C",
  warn: "#E8A317",
};
export const radius = 14;
export const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const inr0 = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
