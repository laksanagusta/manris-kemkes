"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, API_BASE, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  listAllOrganizations,
  type OrganizationListItem,
} from "@/lib/api/organizations";
import {
  listOrganizationGroups,
  type OrganizationGroupListItem,
} from "@/lib/api/organization-groups";
import {
  buildSelectableReportOrganizations,
  buildSelectableReportOrganizationGroups,
  needsExplicitReportOrgSelection,
} from "@/lib/report-scope";
import {
  resolveDefaultReportsFilterScope,
  type ReportsFilterScope,
} from "@/lib/reports-filter-sheet";
import {
  completedReportCycle,
  currentReportCycle,
  shiftReportCycle,
} from "@/lib/quarterly-report";
import type {
  QuarterlyReport,
  QuarterlyReportOverview,
} from "@/types/quarterly-report";
import { reportErrorMessage } from "@/lib/report-feedback";
import { parseReportPreferences } from "@/lib/report-preferences";
import { ReportFilterPanel, type ReportExportFormat } from "@/components/report/report-filter-panel";
import { ReportOverviewSkeleton } from "@/components/report/report-overview-cards";
import { ReportSummaryCard, ReportSummaryMetrics } from "@/components/report/report-summary-card";
import { QuarterlyReportDashboard } from "@/components/report/quarterly-report-dashboard";
import { ReportEmptyState } from "@/components/shared/design-system";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const EMPTY_SCOPE: ReportsFilterScope = {
  organizationId: "",
  organizationGroupId: "",
  organizationIds: [],
};
function LoadingReport() {
  return (
    <div className="space-y-8" aria-label="Memuat laporan" aria-busy="true">
      <ReportOverviewSkeleton />
      <ReportSummaryCard title="Kejadian dan dampak aktual" aria-busy="true">
        <ReportSummaryMetrics items={["Kerugian", "Nilai belum diketahui", "Belum terhubung"].map((label) => ({ label, value: <Skeleton className="h-8 w-24" /> }))} />
        <Skeleton className="h-48 w-full" />
      </ReportSummaryCard>
      {[
        "Perbandingan unit",
        "Risiko yang perlu ditindaklanjuti",
      ].map((title) => (
        <Card data-report-card="" key={title}>
          <CardHeader>
            <CardTitle className="text-sm">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const { token, user } = useAuth();
  const [cycle, setCycle] = useState(completedReportCycle);
  const [comparisonOverride, setComparisonOverride] = useState("");
  const comparisonCycle = comparisonOverride || shiftReportCycle(cycle, -1);
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    [],
  );
  const [groups, setGroups] = useState<OrganizationGroupListItem[]>([]);
  const [scope, setScope] = useState<ReportsFilterScope>(EMPTY_SCOPE);
  const preferencesKey = user ? `manris-report-filters:${user.id}:${user.organizationId ?? "global"}` : "";
  const [restoredFor, setRestoredFor] = useState("");
  const [metadataReady, setMetadataReady] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [reportData, setReport] = useState<QuarterlyReportOverview | null>(null);
  const [loadedQuery, setLoadedQuery] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [metadataRetry, setMetadataRetry] = useState(0);
  const [exporting, setExporting] = useState<ReportExportFormat | null>(null);
  const needsSelection =
    scope.organizationIds.length === 0 &&
    (needsExplicitReportOrgSelection(user) || Boolean(scope.organizationGroupId));

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;
    setMetadataReady(false);
    setMetadataError(null);
    setReport(null);
    const fetchGroups = async () => {
      const result: OrganizationGroupListItem[] = [];
      for (let page = 1; ; page++) {
        const response = await listOrganizationGroups(token, {
          ownerOrganizationId: user.isGlobal
            ? undefined
            : (user.organizationId ?? undefined),
          includeMembers: true,
          limit: 100,
          page,
        });
        result.push(...response.data);
        if (!response.data.length || result.length >= response.total)
          return result;
      }
    };
    Promise.all([listAllOrganizations(token), fetchGroups()])
      .then(([items, allGroups]) => {
        if (cancelled) return;
        const allowed = buildSelectableReportOrganizations(user, items);
        setOrganizations(allowed);
        const allowedGroups = buildSelectableReportOrganizationGroups(user, allGroups);
        setGroups(allowedGroups);
        let preferences = null;
        try { preferences = parseReportPreferences(localStorage.getItem(preferencesKey), currentReportCycle(), allowed, allowedGroups); } catch { /* Storage may be unavailable. Keep the default filters. */ }
        setCycle(preferences?.cycle ?? completedReportCycle());
        setComparisonOverride(preferences?.comparisonOverride ?? "");
        setScope(preferences?.scope ?? resolveDefaultReportsFilterScope(user, allowed));
        setRestoredFor(preferencesKey);
        setMetadataReady(true);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMetadataError(
            reportErrorMessage(error, "Unit dan grup belum dapat dimuat. Coba lagi."),
          );
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, user, metadataRetry, preferencesKey]);

  useEffect(() => {
    if (!metadataReady || !user || restoredFor !== preferencesKey) return;
    try { localStorage.setItem(preferencesKey, JSON.stringify({ cycle, comparisonOverride, scope })); } catch { /* Reporting still works when storage is unavailable. */ }
  }, [metadataReady, user, restoredFor, preferencesKey, cycle, comparisonOverride, scope]);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      cycle,
      compare_cycle: comparisonCycle,
    });
    if (scope.organizationIds.length)
      params.set("org_id", scope.organizationIds.join(","));
    return params.toString();
  }, [cycle, comparisonCycle, scope.organizationIds]);
  const report = restoredFor === preferencesKey && loadedQuery === query ? reportData : null;
  useEffect(() => {
    if (!token || !metadataReady || needsSelection) {
      setReport(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setReportError(null);
    setReport(null);
    api
      .get<QuarterlyReportOverview>(`/reports/quarterly/overview?${query}`, token)
      .then((data) => {
        if (!cancelled) {
          setReport(data);
          setLoadedQuery(query);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setReportError(
            reportErrorMessage(error, "Laporan belum dapat dimuat. Coba lagi; filter tetap tersimpan."),
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, metadataReady, needsSelection, query, retry]);

  const loadReportDetails = useCallback(
    (organizationId?: string) => {
      if (!token) return Promise.reject(new Error("Sesi login tidak tersedia."));
      const params = new URLSearchParams(query);
      if (organizationId) {
        params.delete("org_id");
        params.delete("organization_group_id");
        params.set("org_id", organizationId);
      }
      return api.get<QuarterlyReport>(
        `/reports/quarterly?${params.toString()}`,
        token,
      );
    },
    [query, token],
  );

  async function exportReport(format: ReportExportFormat) {
    if (!report || !token || exporting) return;
    const snapshot = report;
    setExporting(format);
    try {
      let blob: Blob;
      if (format === "xlsx") {
        const fullReport = await loadReportDetails();
        if (fullReport.snapshotHash !== snapshot.snapshotHash) {
          throw new ApiError("Data laporan berubah", 409);
        }
        const { createQuarterlyReportWorkbook } =
          await import("@/lib/quarterly-report-export");
        const workbook = await createQuarterlyReportWorkbook(fullReport);
        const bytes = await workbook.xlsx.writeBuffer();
        blob = new Blob([new Uint8Array(bytes)], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
      } else {
        const pdfQuery = new URLSearchParams(query);
        pdfQuery.set("expected_updated_at", snapshot.dataUpdatedAt || "none");
        if (snapshot.snapshotHash) pdfQuery.set("expected_snapshot_hash", snapshot.snapshotHash);
        const response = await fetch(
          `${API_BASE}/reports/quarterly-pdf?${pdfQuery}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!response.ok) {
          throw new ApiError("Ekspor PDF gagal", response.status);
        }
        blob = await response.blob();
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `laporan-${snapshot.cycle}-vs-${snapshot.comparisonCycle}.${format}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(`Laporan ${format.toUpperCase()} berhasil diunduh`);
    } catch (error) {
      toast.error(
        reportErrorMessage(error, "Ekspor belum dapat diunduh. Coba lagi atau muat ulang data."),
      );
    } finally {
      setExporting(null);
    }
  }
  return (
    <div className="w-full min-w-0 space-y-6">
      <ReportFilterPanel
        cycle={cycle}
        comparisonCycle={comparisonCycle}
        onCycleChange={setCycle}
        onComparisonCycleChange={setComparisonOverride}
        scope={scope}
        onScopeChange={setScope}
        organizations={organizations}
        groups={groups}
        scopeSummary={
          !metadataReady
            ? metadataError ? "Pilihan unit belum tersedia" : "Memuat pilihan unit..."
            : scope.organizationIds.length
              ? `${scope.organizationIds.length} unit dipilih`
              : scope.organizationGroupId
                ? "Pilih minimal satu unit dari grup ini."
                : needsExplicitReportOrgSelection(user)
                  ? "Pilih unit untuk menampilkan laporan."
                  : "Semua unit yang dapat diakses"
        }
        scopeReady={metadataReady}
        loading={loading}
        exporting={exporting}
        canExport={Boolean(report)}
        onExport={(format) => void exportReport(format)}
        onReload={() => setRetry((value) => value + 1)}
        onReset={() => {
          setCycle(completedReportCycle());
          setComparisonOverride("");
          setScope(resolveDefaultReportsFilterScope(user, organizations));
        }}
      />
      {metadataError ? (
        <Alert variant="destructive">
          <AlertTitle>Unit dan grup gagal dimuat</AlertTitle>
          <AlertDescription>
            <p>{metadataError}</p>
            <Button
              variant="outline"
              onClick={() => setMetadataRetry((value) => value + 1)}
            >
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      ) : needsSelection && metadataReady ? (
        <ReportEmptyState
          title="Pilih unit laporan"
          description="Pilih satu atau beberapa unit di filter untuk menampilkan laporan."
        />
      ) : reportError ? (
        <Alert variant="destructive">
          <AlertTitle>Laporan gagal dimuat</AlertTitle>
          <AlertDescription>
            <p>{reportError}</p>
            <Button
              variant="outline"
              onClick={() => setRetry((value) => value + 1)}
            >
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      ) : loading || !metadataReady ? (
        <LoadingReport />
      ) : report ? (
        <QuarterlyReportDashboard
          key={`${report.cycle}:${report.comparisonCycle}:${report.units.map((unit) => unit.id).join(",")}:${report.snapshotHash}`}
          overview={report}
          loadDetails={loadReportDetails}
        />
      ) : null}
    </div>
  );
}
