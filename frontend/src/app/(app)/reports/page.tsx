"use client";

import { Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { useSetHeaderActions } from "@/lib/header-actions-context";
import { api } from "@/lib/api";
import type { AnnualProfileProgressReport, MonitoringRuleProgressOption } from "@/lib/annual-profile-progress-report";
import type { QuarterlyReportExcelFormat } from "@/lib/quarterly-report-export";
import { reportErrorMessage } from "@/lib/report-feedback";
import { AnnualProfileProgressCharts } from "@/components/report/annual-profile-progress-charts";
import { AnnualProfileProgressSkeleton } from "@/components/report/annual-profile-progress-skeleton";
import { ReportMonitoringRulePicker } from "@/components/report/report-monitoring-rule-picker";
import { ReportUnitScope } from "@/components/report/report-unit-scope";
import { ReportOptionsMenu } from "@/components/report/report-options-menu";
import { PageStack, ReportEmptyState } from "@/components/shared/design-system";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

const progressListPath = "/reports/monitoring-rule-progress";
function progressPath(id: string, units: string, includeExport = false) {
  const query = new URLSearchParams();
  if (units) query.set("units", units);
  if (includeExport) query.set("export", "true");
  return `${progressListPath}/${encodeURIComponent(id)}${query.size ? `?${query}` : ""}`;
}

export default function ReportsPage() {
  return <Suspense fallback={<AnnualProfileProgressSkeleton />}><ReportsContent /></Suspense>;
}

function ReportsContent() {
  const { token } = useAuth();
  const search = useSearchParams();
  const setHeaderActions = useSetHeaderActions();
  const [headerHost, setHeaderHost] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    setHeaderActions(<div ref={setHeaderHost} />);
    return () => setHeaderActions(null);
  }, [setHeaderActions]);

  const [ruleList, setRuleList] = useState<{ token: string; rules?: MonitoringRuleProgressOption[]; error?: string }>();
  const [ruleRetry, setRuleRetry] = useState(0);
  const [reportResult, setReportResult] = useState<{ key: string; report?: AnnualProfileProgressReport; error?: string }>();
  const [reportRetry, setReportRetry] = useState(0);
  const [exporting, setExporting] = useState(false);
  const list = ruleList?.token === token ? ruleList : undefined;
  const rules = list?.rules;
  const defaultRule = rules?.[0];
  const requestedId = search.get("rule");
  const selected = requestedId ? rules?.find((rule) => rule.id === requestedId) : defaultRule;
  const units = search.get("units") ?? "";
  const selectedUnitIds = units ? units.split(",") : [];
  const invalidUnits = selectedUnitIds.some((id) => !selected?.organizations.some((unit) => unit.id === id));
  const reportKey = `${token}:${selected?.id}:${units}:${reportRetry}`;
  const result = reportResult?.key === reportKey ? reportResult : undefined;
  const report = result?.report;

  useEffect(() => {
    if (!token) return;
    const request = new AbortController();
    api.get<MonitoringRuleProgressOption[]>(progressListPath, token, { signal: request.signal }).then((rules) => {
      if (!request.signal.aborted) setRuleList({ token, rules });
    }).catch((error: unknown) => {
      if (!request.signal.aborted) setRuleList({ token, error: reportErrorMessage(error, "Daftar rules belum dapat dimuat.") });
    });
    return () => request.abort();
  }, [token, ruleRetry]);

  const selectedId = selected?.id;
  useEffect(() => {
    if (!token || !selectedId || invalidUnits) return;
    const request = new AbortController();
    api.get<AnnualProfileProgressReport>(progressPath(selectedId, units), token, { signal: request.signal }).then((report) => {
      if (!request.signal.aborted) setReportResult({ key: reportKey, report });
    }).catch((error: unknown) => {
      if (!request.signal.aborted) setReportResult({ key: reportKey, error: reportErrorMessage(error, "Progres unit belum dapat dimuat.") });
    });
    return () => request.abort();
  }, [token, selectedId, units, invalidUnits, reportKey]);

  function selectRule(rule?: MonitoringRuleProgressOption) {
    const url = new URL(window.location.href);
    url.search = "";
    if (rule) url.searchParams.set("rule", rule.id);
    window.history.replaceState(null, "", url);
  }

  function selectUnits(ids: string[]) {
    const url = new URL(window.location.href);
    if (ids.length) url.searchParams.set("units", ids.toSorted().join(","));
    else url.searchParams.delete("units");
    window.history.replaceState(null, "", url);
  }

  async function exportExcel(format: QuarterlyReportExcelFormat) {
    if (!token || !selectedId || !report?.periods.length || exporting) return;
    setExporting(true);
    try {
      const fresh = await api.get<AnnualProfileProgressReport>(progressPath(selectedId, units, true), token);
      if (
        JSON.stringify(fresh.periods) !== JSON.stringify(report.periods) ||
        JSON.stringify(fresh.baseline) !== JSON.stringify(report.baseline) ||
        JSON.stringify(fresh.organizations) !== JSON.stringify(report.organizations)
      ) {
        setReportResult({ key: reportKey, report: fresh });
        throw new Error("Data laporan berubah. Grafik telah diperbarui. Coba ekspor kembali.");
      }
      if (!fresh.latest) throw new Error("Belum ada periode pemantauan yang dapat diekspor.");
      const { downloadQuarterlyReportExcel } = await import("@/lib/quarterly-report-export");
      await downloadQuarterlyReportExcel(fresh.latest, format);
      toast.success(format === "data" ? "Data laporan Excel berhasil diunduh." : "Laporan lengkap Excel berhasil diunduh.");
    } catch (error: unknown) {
      toast.error(reportErrorMessage(error, "Ekspor Excel gagal. Coba lagi."));
    } finally {
      setExporting(false);
    }
  }

  return (
    <PageStack className="space-y-4">
      {headerHost && createPortal(
        <ReportOptionsMenu
          disabled={!defaultRule}
          exporting={exporting}
          canExport={Boolean(report?.periods.length)}
          onExportExcel={() => void exportExcel("assessment")}
          onExportDataExcel={() => void exportExcel("data")}
          onReset={() => selectRule()}
        />,
        headerHost,
      )}
      {rules && rules.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <ReportMonitoringRulePicker rules={rules} selected={selected} onSelect={selectRule} disabled={exporting} />
          {selected && <ReportUnitScope key={selected.id} organizations={selected.organizations} selectedIds={selectedUnitIds}
            onApply={selectUnits} disabled={exporting} />}
        </div>
      )}
      {list?.error ? (
        <ReportFeedback title="Rules Pemantauan gagal dimuat" message={list.error} onRetry={() => {
          setRuleList(undefined);
          setRuleRetry((value) => value + 1);
        }} />
      ) : !rules ? (
        <AnnualProfileProgressSkeleton />
      ) : !rules.length ? (
        <ReportEmptyState title="Belum ada rules dengan profil Final" description="Unit akan tercakup setelah Profil Risiko Tahunan yang memakai rules tersebut difinalisasi." />
      ) : !selected ? (
        <ReportFeedback title="Rules Pemantauan tidak tersedia" message="Rules dari tautan tidak mencakup profil Final yang dapat diakses."
          actionLabel="Gunakan rules awal" onRetry={() => selectRule()} />
      ) : invalidUnits ? (
        <ReportFeedback title="Unit pilihan tidak tersedia" message="Pilih unit yang memiliki profil Final untuk rules ini."
          actionLabel="Gunakan semua unit" onRetry={() => selectUnits([])} />
      ) : result?.error ? (
        <ReportFeedback title="Progres unit gagal dimuat" message={result.error} onRetry={() => setReportRetry((value) => value + 1)} />
      ) : !report ? (
        <AnnualProfileProgressSkeleton />
      ) : !report.baseline.length && !report.periods.length ? (
        <ReportEmptyState title="Belum ada data risiko untuk rules ini" description="Ubah pilihan unit atau rules untuk melihat baseline dan hasil pemantauan." />
      ) : (
        <>
          {!report.periods.length && <p className="text-sm text-muted-foreground">Belum ada hasil pemantauan Final atau laporan mitigasi pada unit yang tercakup.</p>}
          <AnnualProfileProgressCharts report={report} />
        </>
      )}
    </PageStack>
  );
}
