const simulatedTime = process.env.NODE_ENV === "development"
  ? Date.parse(process.env.NEXT_PUBLIC_MANRIS_SIMULATED_NOW ?? "")
  : Number.NaN;

export function simulatedBusinessTime(): Date | null {
  return Number.isFinite(simulatedTime) ? new Date(simulatedTime) : null;
}

export function businessNow(): Date {
  return simulatedBusinessTime() ?? new Date();
}

export function businessYear(): number {
  const simulated = simulatedBusinessTime();
  return simulated
    ? Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Jakarta", year: "numeric" }).format(simulated))
    : new Date().getFullYear();
}
