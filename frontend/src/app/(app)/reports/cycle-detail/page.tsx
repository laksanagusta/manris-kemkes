"use client";

import { RiskCycleDetailReport } from "../risk-cycle-detail-report";

export default function CycleDetailPage() {
  return (
    <div className="space-y-4">
      <div className="min-w-0">
        <h2 className="text-base font-medium tracking-tight text-foreground text-balance">
          Detail Siklus Risiko
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
          Telusuri perubahan risiko antar siklus secara rinci, termasuk
          perubahan kolom dan mitigasi.
        </p>
      </div>

      <RiskCycleDetailReport />
    </div>
  );
}
