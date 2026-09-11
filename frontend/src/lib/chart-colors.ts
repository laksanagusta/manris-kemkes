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
  veryLow: CHART_COLORS.quinary,
  low: "var(--risk-low)",
  medium: "var(--risk-medium)",
  high: "var(--risk-high)",
  extreme: "var(--risk-extreme)",
} as const;
