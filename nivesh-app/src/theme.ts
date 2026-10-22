export const colors = {
  bg: "#0B1220",
  card: "#121B2E",
  border: "#1F2B45",
  text: "#EAF0FF",
  muted: "#8A98B8",
  accent: "#3DDC97",
  up: "#3DDC97",
  down: "#FF5C7A",
  warn: "#FFC857",
};
export const radius = 14;
export const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
