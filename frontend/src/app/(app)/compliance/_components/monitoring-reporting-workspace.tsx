"use client";

import { RiskReviewPanel } from "./risk-review-panel";
import { MonitoringHeatmapTopRisks } from "./monitoring-heatmap-top-risks";

export function MonitoringReportingWorkspace() {
  return (
    <div className="space-y-4">
      <RiskReviewPanel>
        <MonitoringHeatmapTopRisks />
      </RiskReviewPanel>
    </div>
  );
}
