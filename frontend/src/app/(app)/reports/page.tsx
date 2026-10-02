"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "@/components/shared/icons";
import { toast } from "sonner";
import { api, API_BASE } from "@/lib/api";
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
import { ReportScopePicker } from "@/components/report/report-scope-picker";
import { ReportKpiCard } from "@/components/report/report-kpi-card";
import { ReportSummaryCard, ReportSummaryMetrics } from "@/components/report/report-summary-card";
import { QuarterlyReportDashboard } from "@/components/report/quarterly-report-dashboard";
import {
  CollectionToolbar,
  ReportEmptyState,
} from "@/components/shared/design-system";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const EMPTY_SCOPE: ReportsFilterScope = {
  organizationId: "",
  organizationGroupId: "",
  organizationIds: [],
};
const titles = [
  "Risiko di atas selera risiko",
  "Target tercapai",
  "Mitigasi terlapor",
  "Pemantauan final",
];
function PeriodPicker({
  label,
  cycle,
  onChange,
}: {
  label: string;
  cycle: string;
  onChange: (cycle: string) => void;
}) {
  const current = currentReportCycle();
  const currentYear = Number(current.slice(0, 4));
  const [year, quarter] = cycle.split("-Q");
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] gap-2">
        <Select
          value={year}
          onValueChange={(value) =>
            onChange(
              `${value}-Q${value === String(currentYear) && Number(quarter) > Number(current.slice(-1)) ? current.slice(-1) : quarter}`,
            )
          }
        >
          <SelectTrigger className="h-9! w-full" aria-label={`Tahun ${label.toLowerCase()}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: currentYear - 1999 }, (_, i) =>
              String(currentYear - i),
            ).map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={quarter}
          onValueChange={(value) => onChange(`${year}-Q${value}`)}
        >
          <SelectTrigger className="h-9! w-full" aria-label={`Kuartal ${label.toLowerCase()}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4].map((value) => (
              <SelectItem
                key={value}
                value={String(value)}
                disabled={
                  Number(year) === currentYear &&
                  value > Number(current.slice(-1))
                }
              >
                Q{value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
function LoadingReport() {
  return (
    <div className="space-y-6" aria-label="Memuat laporan" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2">
        {titles.map((title) => (
          <ReportKpiCard
            key={title}
            title={title}
            value="—"
            rows={[]}
            loading
          />
        ))}
      </div>
      {[
        { title: "Perubahan risiko", labels: ["Memburuk", "Membaik", "Tetap", "Baru"] },
        { title: "Pencapaian target", labels: ["Tercapai", "Belum tercapai", "Belum dapat dinilai"] },
        { title: "Pelaporan mitigasi", labels: ["Terlapor", "Belum terlapor", "Melewati tenggat", "Tidak dilaporkan", "Dilewati"] },
        { title: "Kejadian dan dampak aktual", labels: ["Kerugian diketahui", "Nilai belum diketahui", "Belum terhubung"] },
      ].map(({ title, labels }) => (
        <ReportSummaryCard key={title} title={title} aria-busy="true">
          <ReportSummaryMetrics
            items={labels.map((label) => ({ label, value: <Skeleton className="h-9 w-16" /> }))}
          />
        </ReportSummaryCard>
      ))}
      {[
        "Perbandingan unit",
        "Risiko yang perlu ditindaklanjuti",
      ].map((title) => (
        <Card key={title}>
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
  const [metadataReady, setMetadataReady] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [reportData, setReport] = useState<QuarterlyReportOverview | null>(null);
  const [loadedQuery, setLoadedQuery] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [metadataRetry, setMetadataRetry] = useState(0);
  const [exporting, setExporting] = useState<string | null>(null);
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
        setGroups(buildSelectableReportOrganizationGroups(user, allGroups));
        const initial = resolveDefaultReportsFilterScope(user, allowed);
        setScope(initial);
        setMetadataReady(true);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMetadataError(
            error instanceof Error
              ? error.message
              : "Coba lagi untuk memuat daftar unit dan grup.",
          );
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, user, metadataRetry]);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      cycle,
      compare_cycle: comparisonCycle,
    });
    if (scope.organizationIds.length)
      params.set("org_id", scope.organizationIds.join(","));
    return params.toString();
  }, [cycle, comparisonCycle, scope.organizationIds]);
  const report = loadedQuery === query ? reportData : null;
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
            error instanceof Error ? error.message : "Gagal memuat laporan.",
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

  async function exportReport(format: "xlsx" | "pdf") {
    if (!report || !token || exporting) return;
    const snapshot = report;
    setExporting(format);
    try {
      let blob: Blob;
      if (format === "xlsx") {
        const fullReport = await loadReportDetails();
        if (fullReport.snapshotHash !== snapshot.snapshotHash) {
          throw new Error(
            "Data laporan berubah. Muat ulang laporan sebelum mengekspor.",
          );
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
          const problem = await response.json().catch(() => ({}));
          throw new Error(problem.detail || "Gagal membuat PDF laporan.");
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
        error instanceof Error ? error.message : "Gagal mengekspor laporan.",
      );
    } finally {
      setExporting(null);
    }
  }
  return (
    <div className="w-full min-w-0 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="row-span-2 self-center text-sm">Filter laporan</CardTitle>
          <CardAction>
            <CollectionToolbar
              className="w-fit"
              actions={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!report || loading || Boolean(exporting)}
                    >
                      {exporting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      Ekspor
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-88 max-w-[calc(100vw-2rem)] overflow-x-auto">
                    <DropdownMenuItem className="whitespace-nowrap" onClick={() => void exportReport("pdf")}>
                      <FileText />
                      Unduh ringkasan dan analisis (PDF)
                    </DropdownMenuItem>
                    <DropdownMenuItem className="whitespace-nowrap" onClick={() => void exportReport("xlsx")}>
                      <FileSpreadsheet />
                      Unduh laporan lengkap (Excel)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            />
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-[11rem_11rem_minmax(0,1fr)]">
            <PeriodPicker label="Periode laporan" cycle={cycle} onChange={setCycle} />
            <PeriodPicker
              label="Periode pembanding"
              cycle={comparisonCycle}
              onChange={setComparisonOverride}
            />
            <ReportScopePicker
              organizationId={scope.organizationId}
              onOrganizationChange={(organizationId) =>
                setScope((value) => ({ ...value, organizationId }))
              }
              selectedOrganizationIds={scope.organizationIds}
              onSelectedOrganizationIdsChange={(organizationIds) =>
                setScope((value) => ({ ...value, organizationIds }))
              }
              organizations={organizations}
              organizationGroupId={scope.organizationGroupId}
              onOrganizationGroupChange={(organizationGroupId) =>
                setScope((value) => ({ ...value, organizationGroupId }))
              }
              organizationGroups={groups}
              className="min-w-0 md:col-span-2 xl:col-span-1"
              orientation="inline"
              density="compact"
              disabled={!metadataReady || Boolean(exporting)}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
              {scope.organizationIds.length
                ? `${scope.organizationIds.length} unit dipilih`
                : scope.organizationGroupId
                  ? "Pilih minimal satu unit dari grup ini."
                  : needsExplicitReportOrgSelection(user)
                    ? "Pilih unit untuk menampilkan laporan."
                    : "Menampilkan semua unit yang dapat diakses"}
            </p>
            <Button
              variant="ghost"
              className="sm:shrink-0"
              onClick={() => {
                setCycle(completedReportCycle());
                setComparisonOverride("");
                setScope(resolveDefaultReportsFilterScope(user, organizations));
              }}
              disabled={!metadataReady || Boolean(exporting)}
            >
              Atur ulang filter
            </Button>
          </div>
        </CardContent>
      </Card>
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
        <>
          <QuarterlyReportDashboard
            key={`${report.cycle}:${report.comparisonCycle}:${report.units.map((unit) => unit.id).join(",")}:${report.snapshotHash}`}
            overview={report}
            loadDetails={loadReportDetails}
          />
        </>
      ) : null}
    </div>
  );
}
