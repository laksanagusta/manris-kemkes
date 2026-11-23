export const riskSourceValues = ["internal", "eksternal", "internal_eksternal"] as const;

export type SelectedRiskSource = (typeof riskSourceValues)[number];

export const riskSourceLabels: Record<SelectedRiskSource, string> = {
  internal: "Internal",
  eksternal: "External",
  internal_eksternal: "External & Internal",
};

export const riskSourceOptions = riskSourceValues.map((value) => ({ value, label: riskSourceLabels[value] }));

export function normalizeRiskSource(value?: string | null): SelectedRiskSource {
  switch (value?.trim().toLowerCase()) {
    case "internal_eksternal":
    case "external & internal":
    case "internal & external":
    case "eksternal & internal":
    case "internal & eksternal":
      return "internal_eksternal";
    case "eksternal":
    case "external":
      return "eksternal";
    default:
      return "internal";
  }
}
