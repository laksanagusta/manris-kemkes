/**
 * Shared chart tokens. The CSS variables keep every chart on the same
 * Origin-inspired palette.
 */
export const CHART_COLORS = {
  primary: "var(--chart-1)",
  secondary: "var(--chart-2)",
  tertiary: "var(--chart-3)",
  quaternary: "var(--chart-4)",
  quinary: "var(--chart-5)",
} as const;

export const RISK_CHART_COLORS = {
  veryLow: "var(--color-green-400)",
  low: "var(--color-green-500)",
  medium: "var(--color-yellow-400)",
  high: "var(--color-orange-500)",
  extreme: "var(--color-red-500)",
} as const;
