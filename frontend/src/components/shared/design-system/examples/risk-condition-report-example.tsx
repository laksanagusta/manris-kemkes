"use client";

import { ReportFilterCard } from "@/components/report/report-filter-card";
import { ReportPeriodPicker } from "@/components/report/report-filter-panel";
import type { QuarterlyReport } from "@/types/quarterly-report";
import { RiskManagementCondition } from "../domain/risk-management-condition";
import { RiskConditionCharts } from "../domain/risk-condition-charts";

const conditionFixture: QuarterlyReport = {
  cycle: "2026-Q3", comparisonCycle: "2026-Q2", generatedAt: "2026-10-01T02:00:00Z",
  dataUpdatedAt: "2026-09-30T08:00:00Z", warnings: [], organizations: [], events: [], tasks: [],
  previousRisks: [{ id: "example-risk", title: "Risiko contoh", organizationId: "example-unit", nilai: 15 }],
  risks: [{ id: "example-risk", title: "Risiko contoh", organizationId: "example-unit", nilai: 20,
    mitigations: [{ action: "Koordinasi tindak lanjut", owner: "Tim pengelola" }],
    targetProbability: 2, targetImpact: 2, targetWeight: 1.8, targetNilai: 7.2,
    monitoringStatus: "final", monitoringAssessmentCycle: "2026-Q3", monitoringObservedNilai: 15 }],
};

export function RiskConditionReportExample() {
  return <div className="space-y-5">
    <p className="text-xs text-muted-foreground">Laporan kondisi pengelolaan memakai data ilustratif. Grafik dan disclosure memakai komponen produksi.</p>
    <ReportFilterCard>
      <div className="grid gap-4 sm:grid-cols-2">
        <ReportPeriodPicker label="Periode" cycle={conditionFixture.cycle} onChange={() => {}} disabled />
        <ReportPeriodPicker label="Bandingkan dengan" cycle={conditionFixture.comparisonCycle} onChange={() => {}} disabled />
      </div>
    </ReportFilterCard>
    <RiskManagementCondition report={conditionFixture} activeProfiles={conditionFixture.risks} previousProfiles={conditionFixture.previousRisks} />
    <RiskConditionCharts report={conditionFixture} activeProfiles={conditionFixture.risks} previousProfiles={conditionFixture.previousRisks} />
  </div>;
}
