"use client";

import { RiskCycleDetailReport } from "../risk-cycle-detail-report";

export default function CycleDetailPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Detail Siklus Risiko
        </h1>
        <p className="text-sm text-muted-foreground">
          Telusuri perubahan risiko antar siklus secara rinci, termasuk
          perubahan kolom dan mitigasi.
        </p>
      </div>

      <RiskCycleDetailReport />
    </div>
  );
}
