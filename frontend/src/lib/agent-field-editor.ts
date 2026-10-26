export const agentNumberBounds: Record<string, { min: number; max: number; integer: boolean }> = {
  probability: { min: 1, max: 5, integer: true }, impact: { min: 1, max: 5, integer: true },
  riskPriority: { min: 0, max: 5, integer: true },
  targetProbability: { min: 0, max: 5, integer: true }, targetImpact: { min: 0, max: 5, integer: true },
  observedProbability: { min: 1, max: 5, integer: true }, observedImpact: { min: 1, max: 5, integer: true },
  mitigationCompletionPercent: { min: 0, max: 100, integer: true },
  reportDay: { min: 0, max: 6, integer: true }, reportDate: { min: 1, max: 31, integer: true },
  targetCost: { min: 0, max: Infinity, integer: false }, financialLoss: { min: 0, max: Infinity, integer: false },
};

// Check nested typed controls before building the request. Empty numeric fields
// must not turn into zero/null when JSON encodes the final payload.
export function agentFieldValueError(value: unknown, original: unknown, field = ""): string | null {
  const bounds = agentNumberBounds[field];
  if ((bounds || typeof original === "number") && value !== null && value !== undefined) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "Lengkapi isian angka yang kosong atau tidak valid.";
    if (bounds && (value < bounds.min || value > bounds.max || (bounds.integer && !Number.isInteger(value)))) return "Periksa rentang angka pada rincian usulan.";
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const error = agentFieldValueError(value[i], Array.isArray(original) ? original[i] : undefined);
      if (error) return error;
    }
  } else if (value && typeof value === "object") {
    const previous = original && typeof original === "object" ? original as Record<string, unknown> : {};
    for (const [key, child] of Object.entries(value)) {
      const error = agentFieldValueError(child, previous[key], key);
      if (error) return error;
    }
  }
  return null;
}
