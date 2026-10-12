"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { completedReportCycle, shiftReportCycle } from "@/lib/quarterly-report";
import { PageStack } from "@/components/shared/design-system";
import { RiskManagementCondition } from "@/components/shared/design-system/domain/risk-management-condition";
import { RiskConditionCharts } from "@/components/shared/design-system/domain/risk-condition-charts";
import { ReportFilterCard } from "@/components/report/report-filter-card";
import { ReportPeriodPicker } from "@/components/report/report-filter-panel";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "@/components/shared/icons";
import type { QuarterlyReport, QuarterlyRisk } from "@/types/quarterly-report";
import type { Risk } from "@/types/risk";

type ConditionData = { report: QuarterlyReport; active: QuarterlyRisk[]; previous: QuarterlyRisk[] };

function snapshotProfiles(risks: Risk[], cycle: string): QuarterlyRisk[] {
  return risks.map((risk) => ({
    ...risk,
    organizationId: risk.organizationId ?? risk.unitId,
    assessmentCycle: cycle,
    // This endpoint attaches only finalized monitoring observations.
    monitoringStatus: risk.monitoringObservedNilai != null ? "final" : null,
  }));
}

export default function RiskConditionReportPage() {
  const { token } = useAuth();
  const [cycle, setCycle] = useState(() => completedReportCycle());
  const [comparisonCycle, setComparisonCycle] = useState(() => shiftReportCycle(completedReportCycle(), -1));
  const [reload, setReload] = useState(0);
  const [resource, setResource] = useState<{ key: string; data: ConditionData | null; error: boolean } | null>(null);
  const requestKey = `${token}:${cycle}:${comparisonCycle}:${reload}`;
  const current = resource?.key === requestKey ? resource : null;
  const loading = !current;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const query = new URLSearchParams({ cycle, compare_cycle: comparisonCycle });
    void Promise.all([
      api.get<QuarterlyReport>(`/reports/quarterly?${query}`, token),
      api.get<Risk[]>(`/risks/cycle-snapshot?cycle=${cycle}`, token),
      api.get<Risk[]>(`/risks/cycle-snapshot?cycle=${comparisonCycle}`, token),
    ]).then(([report, selected, previous]) => {
      if (!cancelled) setResource({ key: requestKey, error: false, data: {
        report, active: snapshotProfiles(selected, cycle), previous: snapshotProfiles(previous, comparisonCycle),
      } });
    }).catch(() => {
      if (!cancelled) setResource({ key: requestKey, error: true, data: null });
    });
    return () => { cancelled = true; };
  }, [token, cycle, comparisonCycle, requestKey]);

  const reloadData = () => setReload((value) => value + 1);
  const data = current?.data;
  const profiles = useMemo(() => ({ active: data?.active ?? [], previous: data?.previous ?? [] }), [data]);

  return <PageStack className="space-y-5 lg:space-y-6">
    <ReportFilterCard>
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-full sm:w-48"><ReportPeriodPicker label="Periode" cycle={cycle} onChange={setCycle} disabled={false} /></div>
        <div className="w-full sm:w-48"><ReportPeriodPicker label="Bandingkan dengan" cycle={comparisonCycle} onChange={setComparisonCycle} disabled={false} /></div>
        <Button type="button" variant="outline" size="sm" disabled={loading} onClick={reloadData}><RefreshCw aria-hidden="true" />Muat ulang</Button>
      </div>
      <p className="text-xs text-muted-foreground">Semua unit yang dapat diakses akun.</p>
    </div>
    </ReportFilterCard>
    <RiskManagementCondition report={data?.report ?? null} activeProfiles={profiles.active} previousProfiles={profiles.previous}
      loading={loading} error={current?.error} onRetry={reloadData} />
    {data && <RiskConditionCharts report={data.report} activeProfiles={profiles.active} previousProfiles={profiles.previous} />}
  </PageStack>;
}
