"use client";

import { RiskReviewPanel } from "./risk-review-panel";

export function MonitoringReportingWorkspace() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground/80">
          Compliance workspace
        </p>
        <h1 className="text-[clamp(1.8rem,3vw,2.4rem)] font-semibold tracking-[-0.03em] text-foreground">
          Monitoring
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Pemantauan per semester, lihat risiko yang due, draft berjalan, hingga
          yang sudah disetujui dalam satu halaman.
        </p>
      </section>

      <RiskReviewPanel />
    </div>
  );
}
