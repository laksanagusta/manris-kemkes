"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
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
} from "@/types/quarterly-report";
import type { QuarterlyReportExcelFormat } from "@/lib/quarterly-report-export";
import { reportErrorMessage } from "@/lib/report-feedback";
import { parseReportPreferences } from "@/lib/report-preferences";
import { resolveReportUrlFilters } from "@/lib/report-url-filters";
import { ReportFilterPanel } from "@/components/report/report-filter-panel";
import { QuarterlyReportDashboard, RiskSummarySkeleton } from "@/components/report/quarterly-report-dashboard";
import { PageStack, ReportEmptyState } from "@/components/shared/design-system";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shared/animated-tabs";
import { RiskConditionCharts } from "@/components/shared/design-system/domain/risk-condition-charts";

const EMPTY_SCOPE: ReportsFilterScope = {
  organizationId: "",
  organizationGroupId: "",
  organizationIds: [],
};
function ReportFeedback({ title, message, onRetry, actionLabel = "Coba lagi" }: {
  title: string;
  message: string;
  onRetry: () => void;
  actionLabel?: string;
}) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{message}</p>
        <Button variant="outline" onClick={onRetry}>{actionLabel}</Button>
      </AlertDescription>
    </Alert>
  );
}

export default function ReportsPage() {
  return <Suspense fallback={<RiskSummarySkeleton />}><ReportsContent /></Suspense>;
}

function ReportsContent() {
  const { token, user } = useAuth();
  const search = useSearchParams();
  const tab = search.get("tab") === "perbandingan" ? "perbandingan" : "ringkasan";
  const reportParams = new URLSearchParams(search.toString());
  reportParams.delete("tab");
  const reportSearch = reportParams.toString();
  const [cycle, setCycle] = useState(completedReportCycle);
  const [comparisonOverride, setComparisonOverride] = useState<string>();
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>(
    [],
  );
  const [groups, setGroups] = useState<OrganizationGroupListItem[]>([]);
  const [scope, setScope] = useState<ReportsFilterScope>(EMPTY_SCOPE);
  const preferencesKey = user ? `manris-report-filters:${user.id}:${user.organizationId ?? "global"}` : "";
  const restoreKey = token && user ? `${token}:${preferencesKey}:${reportSearch}` : "";
  const [restoredFor, setRestoredFor] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [urlOverrides, setUrlOverrides] = useState(false);
  const [metadataReady, setMetadataReady] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [reportData, setReport] = useState<QuarterlyReport | null>(null);
  const [loadedQuery, setLoadedQuery] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [metadataRetry, setMetadataRetry] = useState(0);
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
        const requested = resolveReportUrlFilters(reportSearch, currentReportCycle(), allowed, preferences ?? { cycle: completedReportCycle(), scope: resolveDefaultReportsFilterScope(user, allowed) });
        setCycle(requested.filters.cycle);
        setScope(requested.filters.scope);
        setLinkError(requested.error);
        setUrlOverrides(requested.hasFilters);
        setRestoredFor(restoreKey);
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
  }, [token, user, metadataRetry, preferencesKey, restoreKey, reportSearch]);

  useEffect(() => {
    if (!metadataReady || !user || restoredFor !== restoreKey || urlOverrides || linkError) return;
    try { localStorage.setItem(preferencesKey, JSON.stringify({ cycle, scope })); } catch { /* Reporting still works when storage is unavailable. */ }
  }, [metadataReady, user, restoredFor, restoreKey, preferencesKey, cycle, scope, urlOverrides, linkError]);

  const comparisonCycle = comparisonOverride ?? shiftReportCycle(cycle, -1);
  const selectedComparison = tab === "perbandingan" ? comparisonOverride : undefined;
  const query = useMemo(() => {
    const params = new URLSearchParams({
      cycle,
    });
    if (scope.organizationIds.length)
      params.set("org_id", scope.organizationIds.join(","));
    if (selectedComparison) params.set("compare_cycle", selectedComparison);
    return params.toString();
  }, [cycle, scope.organizationIds, selectedComparison]);
  const report = restoredFor === restoreKey && !linkError && loadedQuery === query ? reportData : null;
  useEffect(() => {
    if (!token || !metadataReady || restoredFor !== restoreKey || needsSelection || linkError) {
      setReport(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setReportError(null);
    setReport(null);
    api
      .get<QuarterlyReport>(`/reports/quarterly?${query}`, token)
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
  }, [token, metadataReady, restoredFor, restoreKey, needsSelection, linkError, query, retry]);

  async function exportExcel(format: QuarterlyReportExcelFormat = "assessment") {
    if (!report || !token || loading || exporting || needsSelection || linkError) return;
    const snapshot = report;
    setExporting(true);
    try {
      const freshReport = await api.get<QuarterlyReport>(`/reports/quarterly?${query}`, token);
      if (freshReport.snapshotHash !== snapshot.snapshotHash || freshReport.dataUpdatedAt !== snapshot.dataUpdatedAt) {
        throw new Error("Data laporan berubah. Muat ulang data lalu coba ekspor kembali.");
      }
      const { downloadQuarterlyReportExcel } = await import("@/lib/quarterly-report-export");
      await downloadQuarterlyReportExcel(freshReport, format);
      toast.success(format === "data" ? "Data laporan Excel berhasil diunduh." : "Laporan lengkap Excel berhasil diunduh.");
    } catch (error: unknown) {
      toast.error(reportErrorMessage(error, "Ekspor Excel gagal. Coba lagi atau muat ulang data."));
    } finally {
      setExporting(false);
    }
  }

  return (
    <PageStack>
      <Tabs value={tab} onValueChange={(value) => {
        const url = new URL(window.location.href);
        if (value === "perbandingan") url.searchParams.set("tab", value);
        else url.searchParams.delete("tab");
        window.history.replaceState(null, "", url);
      }} className="gap-4">
        <TabsList aria-label="Tampilan laporan risiko">
          <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
          <TabsTrigger value="perbandingan">Perbandingan</TabsTrigger>
        </TabsList>
        <ReportFilterPanel
          cycle={cycle}
          onCycleChange={(value) => { setCycle(value); setLinkError(null); setUrlOverrides(false); }}
          comparison={tab === "perbandingan" ? { cycle: comparisonCycle, onChange: setComparisonOverride } : undefined}
          scope={scope}
          defaultScope={resolveDefaultReportsFilterScope(user, organizations)}
          requireUnit={Boolean(user && !user.isGlobal)}
          onScopeChange={(value) => { setScope(value); setLinkError(null); setUrlOverrides(false); }}
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
          canExport={Boolean(report) && !needsSelection && !linkError}
          onExportExcel={() => void exportExcel()}
          onExportDataExcel={() => void exportExcel("data")}
          onReload={() => setRetry((value) => value + 1)}
          onReset={() => {
            setLinkError(null);
            setUrlOverrides(false);
            setCycle(completedReportCycle());
            setComparisonOverride(undefined);
            setScope(resolveDefaultReportsFilterScope(user, organizations));
          }}
        />
        <TabsContent value={tab} className="min-w-0">
          {metadataError ? (
            <ReportFeedback title="Unit dan grup gagal dimuat" message={metadataError} onRetry={() => setMetadataRetry(value => value + 1)} />
          ) : linkError ? (
            <ReportFeedback title="Filter tautan tidak dapat digunakan" message={linkError} actionLabel="Gunakan filter di atas" onRetry={() => { setLinkError(null); setUrlOverrides(false); }} />
          ) : needsSelection && metadataReady ? (
            <ReportEmptyState
              title="Pilih unit laporan"
              description="Pilih satu atau beberapa unit di filter untuk menampilkan laporan."
            />
          ) : reportError ? (
            <ReportFeedback title={tab === "perbandingan" ? "Perbandingan gagal dimuat" : "Laporan gagal dimuat"} message={reportError} onRetry={() => setRetry(value => value + 1)} />
          ) : loading || !metadataReady ? (
            <RiskSummarySkeleton comparison={tab === "perbandingan"} />
          ) : report && tab === "perbandingan" ? (
            <RiskConditionCharts report={report} activeProfiles={report.risks} previousProfiles={report.previousRisks} />
          ) : report ? (
            <QuarterlyReportDashboard
              key={`${report.cycle}:${report.snapshotHash}`}
              report={report}
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </PageStack>
  );
}
