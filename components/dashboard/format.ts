/* Formatting helpers and the chart palette, shared by every dashboard section. */

export const usd = (n: number) =>
  "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

export const pct = (n: number, d = 1) => (n * 100).toFixed(d) + "%";

export const CHART_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6",
];

/** Recharts wants an array of points; lifelines gives two parallel arrays. */
export function buildKMData(curve: { timeline: number[]; survival: number[] }) {
  return curve.timeline.map((t, i) => ({
    time: t,
    survival: curve.survival[i],
  }));
}
